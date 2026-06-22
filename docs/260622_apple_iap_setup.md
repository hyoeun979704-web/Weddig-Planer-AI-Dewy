# App Store 인앱결제(IAP) 등록·설정 체크리스트 (iOS)

> 코드(`src/lib/payments/*`, `supabase/functions/iap-verify-apple`·`apple-notifications-v2`,
> `_shared/appStore.ts`)는 구현됨. 이 문서는 **App Store Connect·키·시크릿 등 코드 밖 수동작업** 절차다.
> 상품ID·가격은 코드와 1:1로 고정한다. 설계 단일소스: `260620_payment_compliance_plan.md`,
> Android 대응판: `260620_google_iap_setup.md`. ⚠️ 실결제 검증은 **실기기 + 샌드박스 테스터**에서만.

## 0. 핵심 사실
- Apple 은 Google 의 'base plan' 개념이 없다 → **기간별로 별도 자동갱신 상품**을 둔다(한 구독 그룹 안 월/년).
- 무료체험(trial)은 별도 상품이 아니라 **월간 상품의 Introductory Offer(무료 체험)** 로 제공한다.
- 결제 검증은 **App Store Server API**(transactionId 기준), 갱신·환불 동기화는 **App Store Server
  Notifications v2**. 클라가 보내는 건 `transactionId` 뿐이고 **지급은 서버 검증 후에만**(멱등).

## 1. App Store Connect — 인앱 상품 등록
**나의 앱 → (Dewy) → 수익화 → 인앱 구입 / 구독.** 상품ID는 **등록 후 변경 불가**(코드와 동일해야 함).

### 1-A. 하트(소비형 Consumable) 5종 — "인앱 구입"
| 상품ID(Product ID) | 참조 이름 | 가격(KRW, 웹+10% 근사) |
|---|---|---|
| `hearts_starter` | 하트 10개 | 2,090 |
| `hearts_basic` | 하트 30개 | 5,390 |
| `hearts_popular` | 하트 70개 | 10,890 |
| `hearts_value` | 하트 100개 | 15,290 |
| `hearts_premium` | 하트 150개 | 21,890 |

> Apple 가격은 **가격 티어(Price Point)** 중 위 값에 가장 가까운 것으로 등록. 코드 단가는 표시·검증용.

### 1-B. 구독(자동 갱신) — "구독" 그룹 `dewy_premium`
구독 그룹 1개(예: `Dewy Premium`) 안에 **상품 2개**:
| 상품ID | 기간 | 가격(KRW) | 비고 |
|---|---|---|---|
| `dewy_premium_monthly` | 1개월 | 5,390 | **Introductory Offer = 무료 체험(예: 7일)** 추가 → 앱의 "무료 체험" |
| `dewy_premium_yearly` | 1년 | 42,900 | |

- 두 상품을 **같은 구독 그룹**에 두어 업/다운그레이드가 자연스럽게 동작하게 한다.
- **G3 구독 고지(3.1.2)**: 구독 paywall(`SubscriptionCheckout`)에 구독명·기간·가격/기간 + 개인정보·이용약관
  인앱 링크가 보여야 함(이미 반영). App Store Connect 의 **이용약관(EULA)·개인정보 URL** 필드도 채운다.

## 2. App Store Server API 키(.p8) — 영수증검증·재조회용
**App Store Connect → 사용자 및 액세스 → 통합(Integrations) → In-App Purchase 키 → 키 생성.**
1. 키 생성 후 **`.p8` 다운로드(1회 한정)** + **Key ID** 기록.
2. **Issuer ID**(같은 페이지 상단) 기록.
3. **Bundle ID** = `app.dewy`.

### Supabase 시크릿 등록(서버 검증 함수가 사용)
```
APPLE_IAP_KEY_ID      = <In-App Purchase 키의 Key ID>
APPLE_IAP_ISSUER_ID   = <Issuer ID>
APPLE_IAP_PRIVATE_KEY = <.p8 파일 전체 내용(-----BEGIN PRIVATE KEY----- 포함)>
APPLE_BUNDLE_ID       = app.dewy        # 기본값과 같으면 생략 가능
APPLE_IAP_ENV         = auto            # auto(기본: prod→sandbox) | production | sandbox
```
> `.p8` 는 PKCS#8 EC(P-256) 키 — 함수가 ES256 JWT 서명에 사용(`_shared/appStore.ts`).

## 3. App Store Server Notifications v2 (갱신·취소·환불 동기화)
**App Store Connect → (앱) → 일반 → App 정보 → App Store Server Notifications.**
1. **Production / Sandbox** 각각 **Version 2** URL 등록:
   `https://qabeywyzjsgyqpjqsvkd.supabase.co/functions/v1/apple-notifications-v2?token=<APPLE_ASN_TOKEN>`
2. Supabase 시크릿 `APPLE_ASN_TOKEN` = 위 비밀값(설정 시 함수가 대조 — 선택이지만 권장).
   - 미설정이어도 함수는 originalTransactionId 로 **Apple 에 권위 재조회**해 위조 payload 를 무력화하지만,
     토큰 게이트를 함께 두면 1차 방어가 된다(play-rtdn 와 동일 사상).

## 4. 샌드박스 테스트(실청구 없음)
- **App Store Connect → 사용자 및 액세스 → Sandbox → 테스터** 추가.
- 실기기 **설정 → App Store → 샌드박스 계정**으로 로그인 → TestFlight/개발빌드에서 결제 플로우 테스트.
- 점검: 하트 구매→서버 `iap_transactions`(platform=ios) 기록 + 하트 적립 / 구독 구매→`subscriptions`
  활성(payment_method=app_store) / 해지·환불→ASN v2 반영. (시뮬레이터 IAP 불가 — 실기기 필수.)

## 5. 코드 ↔ 콘솔 일치 표(드리프트 주의)
| 항목 | 코드 위치 | 콘솔 |
|---|---|---|
| 하트 상품ID | `src/lib/payments/products.ts` `HEART_PRODUCT_IDS` / 서버 `_shared/iapProducts.ts` `HEART_BY_PRODUCT` | 인앱 구입 상품ID |
| 구독 상품ID | `products.ts` `APPLE_SUBSCRIPTION_PRODUCT_IDS` / 서버 `APPLE_SUB_BY_PRODUCT` | `dewy_premium_monthly`·`dewy_premium_yearly` |
| 무료체험 | `appleSubscriptionProductId("trial")`=월간 | 월간 상품의 Introductory Offer |
| 가격(+10%) | `src/lib/heartPackages.ts` `iapPriceForKrw` | 등록 가격 티어 |

## 6. 배포 메모
- 엣지함수는 `main` push(paths 필터) 시에만 배포된다 → 브랜치 작업은 배포 영향 0. 머지 후
  `iap-verify-apple`·`apple-notifications-v2` 가 ACTIVE 가 되며, 그 전에 위 시크릿을 등록해 둔다.
- `supabase/config.toml`: `iap-verify-apple` verify_jwt=true, `apple-notifications-v2` verify_jwt=false(반드시).

## 검증 한계(중요)
빌드·유닛·엣지 번들까지만 이 환경에서 확인했다. **실결제·구독갱신·ASN·복원은 실기기 + 샌드박스**에서만
검증되며, 그 e2e 전에는 "완료" 아님. anti-steering: 네이티브 빌드에서 외부(웹·카카오) 결제 UI·링크는
노출하지 않는다(코드 반영됨 — iOS 도 `getPaymentProvider()`="iap").
