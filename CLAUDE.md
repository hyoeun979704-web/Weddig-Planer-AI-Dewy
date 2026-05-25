# Dewy 작업 규칙

## 검증 — 항상 실제 반영 확인

코드 변경 시 **반드시 변경 결과가 실제로 의도대로 반영되는지 확인.**

SQL row count, type check, unit test 결과만 보고 "정상 작동" 으로 판단 금지.
실제 사용자 시점의 end-to-end 동작을 직접 확인해야 함:

- DB 데이터 변경: client query 패턴으로 실제 호출해서 row 반환 검증
- UI 변경: 실제 페이지에서 클릭/입력해서 의도된 결과 표시 확인
- API/로직 변경: 실제 호출 경로 시뮬레이션 (PostgREST URL build → 응답)

검증 환경 한계 (sandbox 외부 차단 등) 로 e2e 직접 확인 불가 시:
- "검증함" 이라고 보고하지 말 것
- 한계 명시 — "SQL 레벨만 확인, 클라이언트 e2e 미확인" 식으로 솔직하게
- 사용자에게 실제 환경 확인 요청

### 회귀 예시 (Round 13)
- 사용자 요청: "전라남도 → 전남, 충청북도 → 충북 통일"
- 잘못된 적용: UI label 과 backend value 둘 다 약자로 통일
- 결과: `ILIKE '%충남%'` 가 `"충청남도"` 매칭 안 됨 (비연속 글자) → 충남/충북/전남/경남/경북 필터 전부 0건
- 검증 실패: SQL row count 만 확인하고 정상 보고
- 진짜 검증: 사용자가 실제 앱 스크린샷으로 0건 표시 보여줌

규칙: label (사용자 표시) vs value (백엔드 매칭) 의 의미를 항상 분리해서 생각.
사용자 표시 문구 변경 요청 ≠ 백엔드 검색 키워드 변경.

## 검증 — 코드 ↔ DB 스키마 정합성

코드가 DB 컬럼 / 함수 / RPC / view 를 참조할 때 **그 객체가 실제 DB 에 존재하는지
직접 확인.** repo 의 마이그레이션 파일 존재 ≠ DB 적용 보장.

특히:
- 새로 추가한 컬럼 SELECT: `information_schema.columns` 로 컬럼 존재 확인
- RPC 호출: `SELECT FROM pg_proc` 로 함수 시그니처 확인
- view query: `SELECT 1 FROM <view>` 로 view 존재 확인
- 트리거 동작: `INSERT` 후 자동 계산 결과 검증

### 회귀 예시 (Round 14)
- 사용자 보고: "충남 필터 0건"
- 추정 원인 (잘못): 데이터 sparsity 라고 판단
- 진짜 원인: `useWeddingSchedule` SELECT 가 DB 에 없는 컬럼 15개(role, country,
  persona_mode, wedding_venue_* 등) 요청 → PostgREST 422 에러 → 전체 쿼리 실패 →
  weddingSettings empty → 필터 흐름 차단
- 검증 실패: 코드와 마이그레이션 파일만 보고 "DB 에 당연히 있다" 가정. DB 실제 스키마
  미확인. 사용자가 e2e 결과 보여줄 때까지 못 잡음
- 진짜 검증: `SELECT column_name FROM information_schema.columns WHERE table_name=...`
  으로 실제 컬럼 list 확인

규칙: DB 의존 코드 검토 시 **항상 `list_tables` / `information_schema` 로 DB 실제
스키마 먼저 확인.** 마이그레이션 파일 존재만으로 안심 금지. `supabase_migrations.
schema_migrations` 의 적용 history 와 repo 의 마이그레이션 파일 수가 다르면 즉시
경고 + 적용 가능한 것 식별.

