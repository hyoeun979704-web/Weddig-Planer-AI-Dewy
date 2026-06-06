# 검증 회귀 사례 (상세)

> CLAUDE.md "검증" 섹션의 회귀 스토리 전문. 같은 실수를 반복하지 않기 위한 기록.

## 회귀 — label vs value 혼동 (Round 13)

- 사용자 요청: "전라남도 → 전남, 충청북도 → 충북 통일"
- 잘못된 적용: UI label 과 backend value 둘 다 약자로 통일
- 결과: `ILIKE '%충남%'` 가 `"충청남도"` 매칭 안 됨 (비연속 글자) → 충남/충북/전남/경남/경북 필터 전부 0건
- 검증 실패: SQL row count 만 확인하고 정상 보고
- 진짜 검증: 사용자가 실제 앱 스크린샷으로 0건 표시 보여줌

**규칙**: label (사용자 표시) vs value (백엔드 매칭) 의 의미를 항상 분리해서 생각.
사용자 표시 문구 변경 요청 ≠ 백엔드 검색 키워드 변경.

## 회귀 — DB 스키마 정합성 미확인 (Round 14)

- 사용자 보고: "충남 필터 0건"
- 추정 원인 (잘못): 데이터 sparsity 라고 판단
- 진짜 원인: `useWeddingSchedule` SELECT 가 DB 에 없는 컬럼 15개(role, country,
  persona_mode, wedding_venue_* 등) 요청 → PostgREST 422 에러 → 전체 쿼리 실패 →
  weddingSettings empty → 필터 흐름 차단
- 검증 실패: 코드와 마이그레이션 파일만 보고 "DB 에 당연히 있다" 가정. DB 실제 스키마
  미확인. 사용자가 e2e 결과 보여줄 때까지 못 잡음
- 진짜 검증: `SELECT column_name FROM information_schema.columns WHERE table_name=...`
  으로 실제 컬럼 list 확인

**규칙**: DB 의존 코드 검토 시 **항상 `list_tables` / `information_schema` 로 DB 실제
스키마 먼저 확인.** 마이그레이션 파일 존재만으로 안심 금지. `supabase_migrations.
schema_migrations` 의 적용 history 와 repo 의 마이그레이션 파일 수가 다르면 즉시
경고 + 적용 가능한 것 식별.
