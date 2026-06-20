# Google Play 인앱결제(IAP) 등록·설정 체크리스트 (Android)

> 코드(`src/lib/payments/*`, `supabase/functions/iap-verify-google`·`play-rtdn`)는 구현됨.
> 이 문서는 **콘솔·실기기 등 코드 밖 수동작업** 절차다. 상품ID·가격은 코드와 1:1로 고정한다.
> 설계 단일소스: `260620_payment_compliance_plan.md`. ⚠️ 실결제 검증은 실기기+라이선스 테스터에서만.

## 0. 핵심 사실
- **정식출시(프로덕션) 불필요.** AAB를 **내부 테스트(Internal testing)** 트랙에 1회 업로드하면 인앱상품 메뉴가 열린다.
- 단, 그 AAB에 **Play Billing 라이브러리/권한(`com.android.vending.BILLING`)** 이 있어야 한다 → `cordova-plugin-purchase` 의존성이 이미 추가됨(`package.json`). `npx cap sync android` 후 빌드하면 권한 자동 포함.
- 비공개테스트 12명×14일은 **프로덕션 출시 자격** 요건으로 **별개**.

## 1. 빌드·업로드 (메뉴 잠금 해제)
1. `npm run build && npx cap sync android`
2. Android Studio 또는 `cd android && ./gradlew bundleRelease` → 서명된 **AAB** 생성(업로드 키 필요).
3. Play Console → 테스트 → **내부 테스트** → 새 버전 만들기 → AAB 업로드 → 출시.

## 2. 하트(소비성 consumable) 5종 — "인앱 상품"
**수익 창출 → 제품 → 인앱 상품 → 상품 만들기.** 상품ID는 **등록 후 변경 불가**(코드 `HEART_PRODUCT_IDS`와 동일해야 함):

| 상품ID | 이름 | 가격(KRW, 웹+10%) |
|---|---|---|
| `hearts_starter` | 하트 10개 | 2,090 |
| `hearts_basic` | 하트 30개 | 5,390 |
| `hearts_popular` | 하트 70개 | 10,890 |
| `hearts_value` | 하트 100개 | 15,290 |
| `hearts_premium` | 하트 150개 | 21,890 |

- 전부 **활성(Active)**. 소비성이라 별도 설정 없음(앱이 구매 후 consume → 재구매 가능).

## 3. 구독(auto-renewable) — "정기 결제"
**수익 창출 → 제품 → 정기 결제 → 정기 결제 만들기.**
- 구독 **상품ID = `dewy_premium`** (코드 `SUBSCRIPTION_PRODUCT_ID`와 동일).
- 그 안에 **기본 요금제(Base plan)** 2개:
  | base plan ID | 결제주기 | 가격(KRW) |
  |---|---|---|
  | `monthly` | 1개월(P1M) | 5,390 |
  | `yearly` | 1년(P1Y) | 42,900 |
- **무료체험**: `monthly` base plan 에 **무료 체험 혜택(offer, 예: 7일)** 추가 → 앱의 "무료 체험" = 이 offer. (별도 trial 상품 없음.)
- base plan ID는 코드 `SUBSCRIPTION_BASE_PLANS`·서버 `SUB_PLANS`와 동일해야 함.

## 4. 서버 영수증 검증 — Play Developer API
서버 함수 `iap-verify-google` 가 구매를 검증하려면:
1. Google Cloud Console → 프로젝트(또는 Play 연결 프로젝트) → **서비스 계정** 생성 → **JSON 키** 발급.
2. Play Console → 설정 → **API 액세스** → 그 서비스 계정 연결 + 권한(재무 데이터/주문·구독 보기) 부여.
3. Supabase 시크릿 등록:
   - `GOOGLE_PLAY_SA_KEY` = 서비스계정 JSON **전체 문자열**
   - `ANDROID_PACKAGE_NAME` = `app.dewy` (기본값과 동일하면 생략 가능)

## 5. 갱신·취소·환불 동기화 — RTDN
함수 `play-rtdn` 가 구독 상태를 자동 동기화:
1. Google Cloud → **Pub/Sub 토픽** 생성(예: `play-rtdn`).
2. Play Console → 수익 창출 설정 → **실시간 개발자 알림(RTDN)** → 위 토픽 이름 등록.
3. Pub/Sub **푸시 구독** 생성 → endpoint =
   `https://<project>.supabase.co/functions/v1/play-rtdn?token=<RTDN_VERIFY_TOKEN>`
4. Supabase 시크릿 `RTDN_VERIFY_TOKEN` = 위 비밀값(설정 시 함수가 대조). 더 강한 보안은 Pub/Sub OIDC 인증 사용.

## 6. 샌드박스 테스트(실청구 없음)
- Play Console → 설정 → **라이선스 테스트**에 테스터 Gmail 추가 → 실청구 없이 결제 플로우 테스트.
- **실기기 + 내부테스트 트랙 설치본**에서만 동작(웹/에뮬레이터 일부 불가).
- 점검: 하트 구매→서버 `iap_transactions` 기록+하트 적립 / 구독 구매→`subscriptions` 활성 / 해지·환불→RTDN 반영.

## 7. 코드 ↔ 콘솔 일치 표(드리프트 주의)
| 항목 | 코드 위치 | 콘솔 |
|---|---|---|
| 하트 상품ID | `src/lib/payments/products.ts` `HEART_PRODUCT_IDS` | 인앱 상품ID |
| 하트 지급수 | `supabase/functions/_shared/iapProducts.ts` `HEART_BY_PRODUCT` | (서버 진실) |
| 구독 상품/요금제 | `products.ts` `SUBSCRIPTION_PRODUCT_ID`·`SUBSCRIPTION_BASE_PLANS` | `dewy_premium`/base plans |
| 가격(+10%) | `src/lib/heartPackages.ts` `iapPriceForKrw` | 등록가 |

## 검증 한계(중요)
빌드·유닛·엣지 번들까지만 이 환경에서 확인. **실결제·구독갱신·RTDN·복원은 실기기+샌드박스**에서만 검증되며,
그 e2e 전에는 "완료" 아님. anti-steering: 네이티브 빌드에서 카카오/외부결제 UI·링크는 노출하지 않는다(코드 반영됨).
