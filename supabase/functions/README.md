# Supabase Edge Functions — 도메인 인덱스

> **단일 소스**: 함수·테이블·`_shared` 의 도메인 소유권 **상세**는 `docs/260625_backend_domain_map.md`
> 에 있다(여긴 그 인덱스 — 사본 만들지 말 것, 드리프트 방지).

## 왜 도메인 하위폴더로 안 나누나 (평면 구조 유지 이유)

프론트는 `src/features/{consumer,partners,console}` 로 물리 분리됐지만, **edge functions 는 평면
유지**한다. `supabase/functions/<도메인>/<함수>/` 처럼 중첩하면 **배포가 깨지기** 때문:

- `supabase functions deploy`(인자 없음 — `.github/workflows/deploy-functions.yml`)는
  `supabase/functions/` **직속 자식 디렉터리**를 각각 함수 slug 로 배포한다.
- `config.toml` 도 평면 `[functions.<name>]` 키. Supabase 공식 권장 구조도 함수 = 직속 자식,
  공유 코드만 `_`(underscore) 폴더(`_shared`). 도메인 중첩은 미지원.

→ 도메인 구분은 **물리 폴더가 아니라 이 인덱스 + 함수별 헤더 주석**으로 한다.

## 도메인별 함수 인덱스 (상세는 도메인 맵 문서 §1)

- **consumer (34)**: AI 도구(`ai-planner`·`dewy-*`), 청첩장(`invitation-*`),
  결제(`kakao-pay-*`·`design-purchase-*`), 동기화(`drive-*`·`cal-*`·`mail-*`·`gmail-list`), `photo-enhance-batch`·
  `wedding-consulting`·`cleanup-ai-uploads`
- **partners (2)**: `verify-business`, `notify-inquiry` (나머지 사업자 기능은 PostgREST+RLS)
- **console (11)**: 마케팅(`instagram-*` 4종), 상품수집(`product-*` 3종), `mirror-image`·
  `vendor-web-search`·`migrate-data`·`place-geocode-backfill`
- **shared (10)**: 결제검증(`iap-verify-*`), 웹훅(`apple-notifications-v2`·`play-rtdn`·
  `kakao-chatbot-skill`), `cancel-subscription`·`delete-account`·`send-push`·`gmail-send`·`place-static-map`

> 합계 57. (2026-06-25 데드/스텁 3개 제거: `dewy-studio`·`ask-gemini`·`invitation-extract-layout` —
> 호출처 0. `invitation-extract-layout` 설계 스펙은 `docs/invitation-extract-layout-spec.md` 로 보존.)

> 분류 근거 = **실제 클라이언트 호출처 grep**(함수명 추측 금지 — 회귀 교훈, 도메인 맵 §1 참조).

## 새 함수 추가 시

1. `supabase/functions/<hyphen-name>/index.ts` (직속 자식, 하이픈 네이밍).
2. 필요 시 `config.toml` 에 `[functions.<name>]` (verify_jwt 등).
3. **도메인 맵 문서 §1 + 위 인덱스에 등재**(어느 도메인인지). 빠지면 감사 사각지대가 된다.
4. 공유 로직은 `_shared/` 에(함수간 fetch 보다 import — rate limit 회피).
