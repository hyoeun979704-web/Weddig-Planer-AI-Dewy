-- 스키마 정합성 검증 SQL — 실제 DB(Supabase SQL Editor)에서 실행하세요.
-- 목적: repo 정적 분석만으론 라이브 DB의 미사용/중복 테이블을 확정할 수 없어
--       (마이그레이션·types.ts 양쪽 모두 드리프트), 실 DB stat 으로 확정한다.
-- 사용: 아래 블록을 순서대로 실행하고 결과를 docs/260618_schema_audit.md 와 대조.
-- 주의: 이 파일은 SELECT/통계 조회만 한다(파괴적 명령 없음). DROP 은 검증 후 별도 진행.

-- ─────────────────────────────────────────────────────────────────────────
-- ① 레거시 테이블이 정말로 이미 제거됐는지 확인 (있으면 정리 대상, 없으면 이미 끝)
--    repo 분석상 통합 places+place_* 모델로 대체되어 사라진 것으로 추정되는 구모델.
-- ─────────────────────────────────────────────────────────────────────────
SELECT 'LEGACY_STILL_EXISTS' AS check, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'vendors','venues','reviews','studios','suits','hanbok','honeymoon',
    'appliances','ext_products','ext_hanbok','ext_wedding_halls',
    'shopping_products','product_options','vendor_gallery','vendor_highlights',
    'invitation_venues'
  )
ORDER BY table_name;
-- 기대: 0 rows = 이미 제거됨(추가 정리 불필요). row 가 나오면 그 테이블이 cleanup 대상.

-- ─────────────────────────────────────────────────────────────────────────
-- ② "라이브에 있으나 코드 어디서도 .from() 참조 안 됨" 진짜 후보의 실사용 통계.
--    seq_scan+idx_scan = 0  AND  쓰기(ins/upd/del)=0  AND  n_live_tup=0  → 강한 사망 신호.
--    (단, DB 재시작 후 통계 리셋될 수 있음 → 운영 기간 충분히 지난 시점에 확인)
-- ─────────────────────────────────────────────────────────────────────────
SELECT relname AS table,
       n_live_tup            AS live_rows,
       seq_scan + idx_scan   AS total_reads,
       n_tup_ins + n_tup_upd + n_tup_del AS total_writes,
       pg_size_pretty(pg_total_relation_size(relid)) AS size,
       last_autoanalyze
FROM pg_stat_user_tables
WHERE relname IN (
  'collection_logs','naver_search_cache','billing_attempts',
  'place_exclusions','place_sources','tip_channels','ai_usage_minute'
)
ORDER BY total_reads, total_writes, n_live_tup;
-- 해석: reads=0,writes=0,rows=0 이면 DROP 후보 확정. 하나라도 >0 이면 사용 중 → 보존.

-- ─────────────────────────────────────────────────────────────────────────
-- ③ 후보를 DROP 하기 전 의존성 확인 — FK 로 이 테이블을 참조하는 다른 테이블이 있나?
--    (있으면 CASCADE 영향 범위 확인 후 결정)
-- ─────────────────────────────────────────────────────────────────────────
SELECT tc.table_name AS referencing_table,
       kcu.column_name AS fk_column,
       ccu.table_name  AS referenced_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_name IN (
    'collection_logs','naver_search_cache','billing_attempts',
    'place_exclusions','place_sources','tip_channels'
  )
ORDER BY referenced_table, referencing_table;

-- ─────────────────────────────────────────────────────────────────────────
-- ④ 후보가 SQL 함수/트리거/뷰 본문에서 참조되나? (repo 에 없는 untracked RPC 포함)
--    place_exclusions/place_sources 는 places 수집·중복제거 RPC 가 쓸 가능성이 큼.
-- ─────────────────────────────────────────────────────────────────────────
SELECT p.proname AS function, 'references candidate in body' AS note
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (
    pg_get_functiondef(p.oid) ILIKE '%collection_logs%' OR
    pg_get_functiondef(p.oid) ILIKE '%naver_search_cache%' OR
    pg_get_functiondef(p.oid) ILIKE '%billing_attempts%' OR
    pg_get_functiondef(p.oid) ILIKE '%place_exclusions%' OR
    pg_get_functiondef(p.oid) ILIKE '%place_sources%' OR
    pg_get_functiondef(p.oid) ILIKE '%tip_channels%'
  )
ORDER BY p.proname;
-- row 가 나오면 그 함수가 해당 테이블을 사용 → DROP 금지(또는 함수도 함께 정리).

-- ─────────────────────────────────────────────────────────────────────────
-- ⑤ 전체 인벤토리 — 행 0 + 사용 0 인 모든 테이블(놓친 후보 발굴). 한 번에 점검용.
-- ─────────────────────────────────────────────────────────────────────────
SELECT relname AS table,
       n_live_tup AS live_rows,
       seq_scan + idx_scan AS total_reads,
       n_tup_ins + n_tup_upd + n_tup_del AS total_writes,
       pg_size_pretty(pg_total_relation_size(relid)) AS size
FROM pg_stat_user_tables
WHERE n_live_tup = 0
  AND seq_scan + idx_scan = 0
  AND n_tup_ins + n_tup_upd + n_tup_del = 0
ORDER BY relname;
-- 여기 나오는 테이블 = 운영 기간 내 한 번도 읽기·쓰기·데이터 없음 = 미사용 강력 후보.
