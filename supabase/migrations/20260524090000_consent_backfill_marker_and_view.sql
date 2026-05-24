-- Round 5 review #6·#10·#7 — 백필 audit 신뢰성 보강. (Round 7 R6-1·R6-2 fix)
--
-- 20260524070000 backfill 이 legacy sensitive_family_no_parents_v1 행을 _bride_v1 + _groom_v1
-- 두 행으로 복제했음. 문제:
-- #6 — 사용자가 한 쪽만 토글했을 가능성을 무시하고 양 측 모두 동의로 만든 audit 위조.
-- #10 — 레거시 행도 그대로 남아 LIKE pattern 쿼리가 triple-count.
-- #7 — agreed_at-only dedup 이 microsecond collision 시 백필 손실.
--
-- 해결 — 삭제는 PIPA 의무로 어려우므로 marker + view 패턴:
-- (a) notes 컬럼을 JSONB 로 보장 (기존 스키마 20260520240000:20 에서 TEXT 로 정의돼 있음).
-- (b) 백필로 들어간 _bride_v1/_groom_v1 행을 식별해 notes 에 출처 표시.
-- (c) user_consents_canonical view 로 reporting/audit 가 synthesized 분리 가능.
--
-- R6-1 — 기존 notes TEXT 라서 `ADD COLUMN IF NOT EXISTS ... JSONB` 는 no-op. 그 결과
-- 아래 UPDATE 는 implicit text-cast 로 통과해도 view 의 `notes ? 'x'` 연산자가 TEXT 에
-- 정의 안 돼 CREATE VIEW 가 폭발 → 마이그레이션 전체 깨짐. 안전한 type 변환으로 교체.
DO $$
DECLARE
  v_type TEXT;
BEGIN
  SELECT data_type INTO v_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'user_consents'
    AND column_name = 'notes';

  IF v_type = 'text' THEN
    -- 컬럼이 TEXT — 기존 데이터는 NULL/empty 가 예상이지만 안전을 위해 캐스트 가드.
    -- application 이 한 번도 채운 적 없는 컬럼이라 무효 JSON 행은 없을 것이지만,
    -- 누군가 수동으로 ASCII 메모를 넣었을 경우 ALTER 가 실패하면 그때 명시 정정.
    ALTER TABLE public.user_consents
      ALTER COLUMN notes TYPE JSONB
      USING (CASE WHEN notes IS NULL OR notes = '' THEN NULL ELSE notes::JSONB END);
  ELSIF v_type IS NULL THEN
    ALTER TABLE public.user_consents
      ADD COLUMN notes JSONB DEFAULT NULL;
  END IF;
END $$;

-- 백필 표시 — 같은 user_id + agreed_at 으로 legacy 와 1:1 매칭. notes 가 NULL 인
-- _bride_v1/_groom_v1 만 대상 (실제 사용자 토글로 들어온 행은 user_agent 있어 구별 가능하지만
-- 가장 안전한 가드는 'notes IS NULL AND 매칭 legacy 행 존재').
UPDATE public.user_consents AS uc
SET notes = jsonb_build_object(
  'synthesized_from', 'sensitive_family_no_parents_v1',
  'via_migration', '20260524070000',
  'note', '레거시 단일 consent_type 을 bride/groom 분리 마이그레이션 시 복제된 행. 사용자가 한쪽만 토글했을 수 있음 — audit/DSAR 시 분리 해석 필요.'
)
WHERE uc.consent_type IN (
        'sensitive_family_no_parents_bride_v1',
        'sensitive_family_no_parents_groom_v1'
      )
  AND uc.notes IS NULL
  AND EXISTS (
    SELECT 1 FROM public.user_consents AS legacy
    WHERE legacy.user_id = uc.user_id
      AND legacy.consent_type = 'sensitive_family_no_parents_v1'
      AND legacy.agreed_at = uc.agreed_at
      AND legacy.agreed IS NOT DISTINCT FROM uc.agreed
  );

-- canonical view — synthesized 행 제외. 일반 reporting 은 이걸로.
-- 레거시 type 도 제외 (사용자 직접 행위였지만 분리 type 으로 대체됐으므로 latest-row-wins
-- 의미상 무가치).
CREATE OR REPLACE VIEW public.user_consents_canonical AS
SELECT
  id,
  user_id,
  consent_type,
  consent_version,
  agreed,
  agreed_at,
  user_agent,
  notes
FROM public.user_consents
-- R6-2 — SQL 의 AND 가 OR 보다 결합도 높음. 괄호 없으면
-- `(notes IS NULL) OR ((NOT (notes?'x')) AND (consent_type<>'legacy'))` 로 파싱돼
-- notes=NULL 인 레거시 sensitive_family_no_parents_v1 행이 첫 OR 항으로 통과.
-- 두 조건을 명시 괄호로 묶어 의도된 AND 적용.
WHERE (notes IS NULL OR NOT (notes ? 'synthesized_from'))
  -- 레거시 type 자체도 제외 — bride/groom 분리 type 이 대체.
  AND consent_type <> 'sensitive_family_no_parents_v1';

GRANT SELECT ON public.user_consents_canonical TO authenticated;

COMMENT ON VIEW public.user_consents_canonical IS
  '실제 사용자 행위로 기록된 consent 행만. 백필 synthesized + 레거시 분리 전 type 제외. 일반 reporting 용.';
COMMENT ON COLUMN public.user_consents.notes IS
  '메타데이터. synthesized_from 키가 있으면 backfill 로 만들어진 행(직접 사용자 행위 아님).';
