# 결제·정책 컴플라이언스 개선 계획 (260620)

> `260620_google_play_policy_audit.md` 의 P0(결제·AI신고)을 포함한 **모든 정책 적합** 실행 계획.
> 핵심 결정: **웹=카카오페이 / Google·Apple 앱=인앱결제(IAP)** 분기, **레포는 나누지 않는다.**

## 0. 결론 — "레포 나눠야 하나?" → **아니오 (단일 레포 유지)**
플랫폼 간 다른 건 **결제 수단 1개뿐**이다. UI·플래닝·커뮤니티·AI·백엔드(Supabase)는 전부 공용.
레포를 나누면 그 공용 코드가 **2~3벌로 복제→드리프트**(우리 단일 소스 원칙 정면 위반), 유지보수
3배, 버그 동기화 지옥. 표준 해법은 **단일 코드베이스 + 런타임 플랫폼 분기**다(이미 `src/lib/platform.ts`
`getPlatform()`/`isNativeApp()` 보유, Capacitor가 web/android/ios 동일 번들 사용).

| 무엇이 다른가 | 어떻게 해결 (레포 분리 불요) |
|---|---|
| 결제 수단 | `payments/` 추상화가 플랫폼별 provider 선택(web=Kakao, native=IAP) |
| 결제 UI 노출 | 네이티브 빌드에선 카카오페이 UI 숨김(anti-steering) — 런타임 분기 |
| 스토어 상품 | Play Console / App Store Connect 상품 등록(설정, 코드 아님) |
| 빌드 | 이미 `--mode capacitor` 존재 — 추가 분리 불요 |

> "레포 분리"가 정당한 경우는 웹과 앱이 **다른 제품**이 될 때뿐. Dewy는 동일 제품 → 분리 불요.

## 1. 현재 상태 (실측)
- **웹 결제 = 카카오페이 완비**: `kakao-pay-ready/approve`, `kakao-pay-charge-ready/approve`,
  `kakao-pay-order-*`, `cancel-subscription` 엣지함수 + `HeartChargeSuccess/Fail`(pg_token).
- 하트 판매(`heartPackages.ts` 1,900~19,900원) + 프리미엄 구독(`/premium/subscribe`).
- **IAP 없음**(package.json에 결제 플러그인 0) → 현재 네이티브 앱도 카카오페이로 흐를 것 = **Play/Apple 정책 위반**.
- 플랫폼 감지·잔액(서버 `earn_hearts`/`spend_hearts`) 인프라 보유.

## 2. 목표 아키텍처 — 결제 추상화 레이어
```
                         결제 요청 (하트 패키지 / 구독)
                                   │
                    getPaymentProvider(getPlatform())
        ┌──────────────┬────────────────────┬─────────────────┐
      web            android                ios
   KakaoPay        Play Billing          StoreKit(App Store)
  (기존 그대로)      └────── IAP(권장: RevenueCat 단일 SDK) ──────┘
                                   │
                         결제 성공 → 웹훅/검증
        Kakao approve fn / RevenueCat(또는 Play·Apple) server notification
                                   │
                  ⬇ 단일 진실원천: Supabase 잔액/구독 (earn_hearts·구독 테이블)
                  하트 지급·구독 활성화는 **서버에서** (플랫폼 무관, 모든 기기 공유)
```
- **단일 잔액**: 어느 플랫폼에서 샀든 하트/구독은 서버에 적립 → 웹·안드·iOS 어디서나 사용(좋은 UX).
- **소비성(consumable) 하트**는 IAP에서 consumable, **구독**은 auto-renewable subscription 으로 등록.
- IAP 영수증은 **서버 검증 필수**(클라 신뢰 금지) — RevenueCat 사용 시 대행.

## 3. 권장 솔루션 — RevenueCat (양 스토어 통합)
- `@revenuecat/purchases-capacitor` 하나로 **Google Play + Apple** IAP + 영수증검증 + 웹훅 +
  entitlement + 구독상태 동기화. 두 스토어를 손으로 각각 붙이는 것보다 안정적·표준.
- 대안: 네이티브 per-store(`@capacitor-community/in-app-purchases`/cordova-plugin-purchase) —
  비용 0이나 영수증검증·구독 갱신·환불 웹훅을 직접 구현해야 해 리스크↑. **RevenueCat 권장.**

## 4. anti-steering(스토어 심사 통과 핵심)
- **네이티브 빌드에서 카카오페이/웹결제 UI·링크 숨김**. 특히 **Apple은 디지털재화의 외부결제 유도
  금지**(반려 단골). Google은 Epic 합의 후 완화됐으나 신중. → 결제 화면을 `isNativeApp()` 분기로
  IAP만 노출.
- 웹(브라우저)은 카카오페이 그대로(스토어 정책 미적용).

## 5. 스토어 상품 등록 + 가격
- `HEART_PACKAGES` 5종 + 구독을 **Play Console / App Store Connect 상품**으로 등록(상품ID 매핑).
- **수수료**: 스토어 15~30% 차감 → 마진 감소. ⓐ 동일 원화가 유지(마진↓) ⓑ 앱가 상향 중 택1(결정 필요).
- 한국 Google **대체결제(인앱)**: 수수료 소폭↓ 옵션 — 후순위 검토.
- 포인트 할인(`POINT_DISCOUNT_MAX` 50%)은 IAP에선 적용 제약 가능 → 정책 검토.

## 6. 단계별 실행 플랜
- **P0-결제**: ① `src/lib/payments/` 추상화(provider 분기) ② RevenueCat 도입(Android 먼저) ③
  결제 UI 플랫폼 분기(네이티브=IAP만) ④ IAP 웹훅 엣지함수 → 서버 하트지급/구독활성(기존 적립로직 재사용)
  ⑤ 구매복원(restore)·구독상태 동기화.
- **P0-AI신고**: AI 결과(피팅·스드메·촬영·청첩장)에 인앱 신고(커뮤니티 `ReportDialog` 재사용) +
  엣지단 입력/출력 모더레이션 + AI 라벨 + 레드팀 테스트 기록.
- **P1**: Data Safety 폼(사진·광고ID·계정·삭제) 정확 작성 · AdMob 동의(UMP)·광고ID 표기 · 계정삭제 폼 일치.
- **P2**: 타깃 API 상향(`android-target-sdk-upgrade.md`) · Play 빌링 v8(2026-08, RevenueCat가 추상화) ·
  한국 대체결제 검토 · 2026-04 권한 신정책(해당 시).
- **iOS**: 추상화는 양 스토어 모두 대비해 짜되, **Android 먼저 출시**(릴리스 파이프라인 보유),
  iOS 는 Apple 개발자계정·App Store Connect·StoreKit 준비되면(결정 필요).

## 7. 결정 필요
1. **IAP 솔루션**: RevenueCat(권장) vs 네이티브 per-store.
2. **iOS 시점**: Android 먼저 → iOS 추후 vs 동시.
3. **가격**: 스토어 수수료를 마진으로 흡수 vs 앱 내 가격 상향.

## 8. 검증·리스크
- IAP는 **실기기 + 스토어 샌드박스**(Play 라이선스 테스터 / Apple Sandbox)로만 검증 가능 — 이 컨테이너
  불가. 추상화·서버 로직까지는 빌드/유닛테스트, 결제 자체는 로컬+샌드박스.
- 서버 단일 잔액이라 **이중지급·중복 웹훅 방지**(멱등키) 필수.
- 출시 전 현행 Play/Apple 결제 정책 + 한국 규정 재확인.
