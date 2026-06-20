# 결제 컴플라이언스 — 실행 스펙 (단일 소스, 그대로 따라 실행)

> Play/Apple 정책 적합 결제 구조의 **실행 기준 문서**. 헷갈리지 않게 결정·파일·순서·가드레일을
> 명시. 관련: `260620_google_play_policy_audit.md`(정책), `android-target-sdk-upgrade.md`(SDK).
> ⚠️ IAP 결제 자체는 **스토어 샌드박스 + 실기기**에서만 검증 — 이 컨테이너 불가(추상화·서버·유닛까지만).

## 0. 확정 결정 (변경 금지 — 이대로 실행)
1. **레포: 단일 유지**(분리 안 함). 다른 건 결제수단 1개뿐 → 공용코드 복제 금지.
2. **결제수단 분기**: 웹 = **카카오페이**(기존 그대로) / 네이티브(Android+iOS) = **네이티브 IAP**
   (**RevenueCat 등 SaaS 미사용** — 스토어 빌링 직접).
3. **iOS: 코드·설정 전부 선반영** → **Apple 개발자 계정만 생기면 즉시 출시** 가능 상태로 준비.
4. **IAP 가격 = 웹가 +10%**(스토어 수수료 흡수). 단일 소스: `src/lib/heartPackages.ts`
   `iapPriceForKrw()` (구현·테스트 완료).

## 1. 전수조사 — "데이터 공유 + 결제만 플랫폼별" 업계 표준 패턴
앱·웹이 **같은 계정/데이터**를 쓰고 결제만 플랫폼마다 다른 경우의 정석:

1. **서버가 단일 진실원천(entitlement)**: 하트 잔액·구독상태는 **Supabase(서버)**에만 둔다.
   어느 플랫폼에서 샀든 서버에 적립 → 웹·Android·iOS 어디서나 동일하게 사용. 클라는 **표시만**.
2. **Apple 3.1.3(b) 멀티플랫폼**: "타 플랫폼/웹에서 구매한 콘텐츠·구독을 앱에서 사용하게 해도 됨,
   **단 그 항목이 앱 내 IAP로도 구매 가능**해야 함." → 웹 카카오 구매분을 앱에서 쓰는 건 OK.
3. **anti-steering(필수)**: iOS 앱 안에서 **외부(웹) 결제로 유도·언급 금지**(권유성 문구·링크 금지).
   Google은 Epic 합의 후 완화됐으나 동일하게 보수적으로. → **네이티브 빌드에선 카카오페이 UI/링크 숨김.**
4. **플랫폼 구독은 각자 관리 + 서버 매핑층**: Google/Apple/Kakao 상품ID는 1:1 대응이 없으므로
   서버가 `product_id → 통합 entitlement`로 변환하는 매핑층을 둔다.
5. **갱신·취소·환불 동기화(webhook)**: Google **RTDN**(Pub/Sub), Apple **App Store Server
   Notifications v2**, Kakao 정기결제 콜백 → 각각 서버 엣지함수가 받아 **멱등** 반영.
6. **소비성(하트)**: IAP consumable → **서버 영수증검증 후 1회만 적립**(멱등키=구매 transaction id),
   이후 스토어에 consume 처리(재구매 가능).
7. **식별**: 서버 `user_id`에 각 플랫폼 구매를 연결(로그인 계정 기준).

## 2. IAP 가격표 (웹가 +10%, `iapPriceForKrw`)
| 상품 | 웹(카카오) | **IAP(+10%)** | 종류 |
|---|---|---|---|
| 하트 starter(10) | 1,900 | **2,090** | consumable |
| 하트 basic(30) | 4,900 | **5,390** | consumable |
| 하트 popular(70) | 9,900 | **10,890** | consumable |
| 하트 value(100) | 13,900 | **15,290** | consumable |
| 하트 premium(150) | 19,900 | **21,890** | consumable |
| 구독 월간 | 4,900 | **5,390** | auto-renewable |
| 구독 연간 | 39,000 | **42,900** | auto-renewable |
| 구독 trial(카드인증 100원) | 100 | — | IAP는 **스토어 네이티브 무료체험** 사용(별도 청구 X) |
> ⚠️ Apple은 가격포인트 제약이 있어 위 값에 **가장 가까운 스토어 가격포인트로 등록** 필요할 수 있음.
> 최종 등록가는 Play Console / App Store Connect와 일치시킨다. (코드 단가는 표시·검증용.)

## 3. 아키텍처 / 파일 맵 (실행 기준 — 어디를 건드리나)
**클라이언트**
- `src/lib/payments/index.ts` (신규): `getPaymentProvider(getPlatform())` →
  `web`=kakaoProvider(기존 `kakao-pay-*` 엣지 호출 래핑) / `android`·`ios`=iapProvider.
- `src/lib/payments/iap.ts` (신규): 네이티브 IAP 플러그인 래퍼(상품조회·구매·복원·consume).
- `src/lib/payments/products.ts` (신규): 상품ID 상수(하트5 + 구독2) ↔ `heartPackages`/구독 매핑.
- 결제 UI(`src/pages/HeartCharge.tsx`, `Premium.tsx`, `SubscriptionCheckout.tsx`):
  `isNativeApp()` 분기 — 네이티브는 IAP 상품·가격(+10%) 표시, **카카오 UI/외부링크 숨김**.
- 네이티브 플러그인: **OSS 직접 빌링**(예: `cordova-plugin-purchase`/CdvPurchase = 양 스토어
  지원, SaaS 아님) 또는 Capacitor 네이티브 빌링 플러그인. **RevenueCat 제외.**

**서버(Supabase 엣지함수 — 신규)**
- `iap-verify-google`: Play Developer API로 구매 검증 → 하트적립/구독활성(멱등). consume 처리.
- `iap-verify-apple`: App Store Server API로 검증 → 동일.
- `play-rtdn`: Google RTDN(구독 갱신/취소/환불) 수신 → 구독상태 멱등 반영.
- `apple-notifications-v2`: Apple 서버알림 수신 → 동일.
- 기존 `kakao-pay-*`(웹)·`earn_hearts`·구독 테이블 **재사용**(적립 로직 공통화).

**DB(마이그레이션 — 신규)**
- `iap_transactions(id, user_id, platform, product_id, store_txn_id UNIQUE, type, status, created_at)`
  → `store_txn_id` UNIQUE 로 **멱등 적립**(중복 webhook/재시도 1회만).

## 4. 실행 체크리스트 (이 순서대로)
**P0-A 결제 분리 (Android 먼저, iOS 코드 동시 반영)**
1. `src/lib/payments/` 추상화 레이어 + 타입(provider 인터페이스).
2. 네이티브 빌링 플러그인 설치 + `products.ts` 상품ID 상수(하트5·구독2).
3. DB `iap_transactions` 마이그레이션(멱등키).
4. `iap-verify-google` / `iap-verify-apple` 엣지함수(영수증검증→`earn_hearts`/구독활성, 멱등).
5. `play-rtdn` / `apple-notifications-v2` 엣지함수(구독 갱신·취소·환불 동기화).
6. 결제 UI 플랫폼 분기 + **anti-steering**(네이티브에서 카카오 숨김).
7. **구매 복원(restore)** + 구독상태 동기화.
8. 스토어 상품 등록(수동): Play Console / App Store Connect, 가격 = §2 표.

**P0-B AI 생성물 신고**(결제와 독립 — 병행): AI 결과(피팅·스드메·촬영·청첩장)에 인앱 신고
(`ReportDialog` 재사용) + 엣지 입력/출력 모더레이션 + AI 라벨.

**P1**: Data Safety 폼(사진·광고ID·계정·삭제) · AdMob 동의(UMP)·광고ID 표기.
**P2**: 타깃 API 상향 · Play 빌링 라이브러리 정책 준수 · 한국 대체결제 검토.

## 5. 가드레일 (실행 중 반드시 지킴)
- **영수증은 서버 검증**(클라 결과 신뢰 금지).
- **멱등**: 모든 적립/구독변경은 `store_txn_id`(또는 notification id) 키로 1회만.
- **anti-steering**: 네이티브 빌드에서 외부/웹 결제 유도·언급·링크 **금지**(특히 iOS).
- **서버 단일 원천**: 잔액·구독은 서버가 결정, 클라는 표시만. 이중지급 방지.
- **검증 한계**: IAP 실제 동작은 **스토어 샌드박스 + 실기기**에서만(이 컨테이너 불가). 추상화·서버
  로직·유닛까지만 여기서 검증하고, 결제 e2e는 로컬에서 — "빌드 통과=완료" 보고 금지.

## 6. iOS "계정만 있으면 즉시 출시" 준비물 (선반영 목록)
코드/심사 대응은 Android과 **공용**이라 미리 다 해둔다. Apple 계정만 남기면 출시:
- [ ] `@capacitor/ios` 플랫폼 추가 + `cap sync`(iOS 셸 생성).
- [ ] StoreKit 상품ID = Android과 동일 매핑(`products.ts`), `iap-verify-apple`·`apple-notifications-v2` 준비.
- [ ] anti-steering·AI신고·계정삭제·개인정보 = 공용 반영(이미/예정).
- [ ] App Store Connect 설정 문서화(앱 등록·IAP 상품가 §2·약관/개인정보 URL·App Privacy(Data Safety)).
- [ ] **유일 차단요소 = Apple Developer 계정/인증서**(있으면 Archive→업로드만).

## 출처
- Apple 3.1.3(b) 멀티플랫폼 & anti-steering: developer.apple.com/app-store/review/guidelines (3.1.3),
  developer.apple.com/news (2025 가이드라인 업데이트), Apple Developer Forums 3.1.3(b).
- 크로스플랫폼 entitlement/서버검증: developer.android.com/google/play/billing(백엔드),
  Play Developer API, Apple App Store Server API/Notifications v2, Google RTDN.
