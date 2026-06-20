# 🚀 Dewy 출시 마스터 계획서 (단일 소스 — 여기부터 읽는다)

> 이 문서가 출시 관련 **모든 계획의 단일 진입점**이다. 세부는 각 전용 문서로 링크.
> 충돌·중복은 여기서 정리한다(섹션 간 혼선 방지). 최종 갱신 260620.
> 진행 모드: **계획 확정 — 코드 착수 대기**(사용자 지시). ⚠️ 결제·스토어·실기기 검증은 컨테이너 불가.

---
## 0. 문서 맵 (어디를 볼지)
| 주제 | 전용 문서 | 본 계획서 섹션 |
|---|---|---|
| 결제(IAP 분리·멱등·anti-steering) | `260620_payment_compliance_plan.md` | §3-A |
| 전 영역 출시 준비 감사 | `260620_launch_readiness_audit.md` | §3-B |
| Google Play 정책 매핑 | `260620_google_play_policy_audit.md` | §3-B |
| iOS 패키징·SiwA·심사 | `ios-packaging.md` | §3-A,B,C |
| 성장(추천인·공유·체험) | `260620_growth_improvements_plan.md` | §3-D |
| 안드로이드 타깃 SDK | `android-target-sdk-upgrade.md` | §3-F |
| 안전영역(상/하단 바) | `safe-area-system.md` | §3-F |
| 웨딩촬영 시안(기능) | `260620_wedding_photoshoot_draft_plan.md` | §3-G |
| 스토어 등록정보/Data Safety | `play-store-listing.md` | §3-B,H |
| 릴리스 빌드 절차(Android) | `release-guide-android.md` | §3-H |

---
## 1. 확정 결정 로그 (single source — 다른 문서가 이와 충돌하면 이 표가 우선)
| # | 결정 | 값 |
|---|---|---|
| D1 | 레포 구조 | **단일 레포**(분리 X). 플랫폼 차이는 런타임 분기 + `android/`·`ios/` 네이티브 폴더 |
| D2 | 결제 분기 | 웹 = **카카오페이**(기존) / 네이티브(Android·iOS) = **네이티브 IAP** |
| D3 | IAP 솔루션 | **네이티브 스토어 빌링 직접**(RevenueCat 등 SaaS 미사용) |
| D4 | IAP 가격 | **웹가 +10%**(`heartPackages.iapPriceForKrw`, 구현·테스트 완료) |
| D5 | iOS | 코드·설정 **전부 선반영** → **Apple 개발자 계정만 생기면 출시** |
| D6 | 데모 계정 | **고정 리뷰어 계정**(하트·프리미엄 시드, 제출노트 기재) |
| D7 | Google 계정 | **비공개테스트 진행 중**(신규 개인계정 12×14일 트랙) |
| D8 | 푸시 알림 | **사용함 → 스코프 포함**(권한·FCM/APNs·발송·마케팅/야간 동의) |
| D9 | 위치 기능 | **첫 출시 제외**(지오로케이션 미사용 → 위치사업 신고 불요) |
| D10 | 무료체험 | **1개월(무조건)** / **데모 테스터 2개월**(서버 부여) |
| D11 | 추천인 초대 | **추가**(기존 `referral_codes`/`referrals` 완성, 보상 하트=earned→IAP 비대상) |
| D12 | AI 결과 공유 | **원탭 공유만**(워터마크 X) |
| D13 | 영어(i18n)·A/B | **현 시점 제외** |
| D14 | AI 결과 UX 개선 | **사용자 별도 설계 보유** → 본 계획 제외(설계 위치 공유 시 정합 검토) |

---
## 2. 스코프
**포함**: 결제 IAP 분리, 정책 보강(Apple/Google/한국), 푸시, 추천인, 원탭공유, 무료체험(1개월),
AI 생성물 신고, 데모계정, (별개) 웨딩촬영 시안 기능.
**제외/후순위**: 위치 기능, 영어, A/B 실험, 한국 대체결제(아래 미해결 U1), AI 결과 UX(D14).

---
## 3. 작업 스트림별 계획 (상태 + 세부 링크)
### A. 결제 — 네이티브 IAP 분리 🔴P0  · 세부 `payment_compliance_plan.md`
- 추상화 `src/lib/payments/`(web=Kakao / native=IAP), 서버 단일 잔액에 웹훅 멱등 적립.
- 신규 엣지: `iap-verify-google`·`iap-verify-apple`·`play-rtdn`·`apple-notifications-v2`,
  DB `iap_transactions`(store_txn_id UNIQUE 멱등).
- anti-steering(네이티브에서 카카오 UI/링크 숨김), 구매 복원, 상품 등록(가격=+10%표).
- 상태: **설계 완료, 구현 대기**. 검증=스토어 샌드박스(로컬).

### B. 정책 컴플라이언스 🔴P0 · 세부 `launch_readiness_audit.md`·`google_play_policy_audit.md`·`ios-packaging.md`
- 이미 충족(✅): 사업자정보·통신판매업신고·만14세·개인정보방침·AI 초상권 가드·환불정책·커뮤니티 신고+차단.
- **추가 필요(보강 5)**: ① 푸시 권한/동의(§C) ② **SiwA 토큰 폐기**(`delete-account`에 `auth/revoke`)
  ③ **Data Safety/App Privacy 갱신**(IAP 반영 — `play-store-listing.md`의 "카카오페이" 신고를 IAP로)
  ④ **청약철회 ↔ 스토어 IAP 환불 정합** ⑤ **콘텐츠 등급(IARC/Apple)** 설문.
- **iOS 필수(이미 계획)**: G1 Sign in with Apple(`ios-packaging`§4), G2 ATT, G3 구독 고지(약관·개인정보
  인앱 링크), Apple 프라이버시 매니페스트(앱+AdMob), 암호화 수출신고(plist), 4.2 최소기능.

### C. 푸시 알림 🟡P1 (D8)
- `@capacitor/push-notifications` + 권한 플로우 + **Android13+ `POST_NOTIFICATIONS`**(현 매니페스트 미보유)
  + APNs(.p8) + 발송 백엔드(`send-push` 재연결).
- **동의**: 마케팅 푸시 수신 동의 + **야간(21~08시) 별도 동의**(정보통신망법) + Apple 마케팅 동의.

### D. 성장 🟡P1 · 세부 `growth_improvements_plan.md`
- **추천인**(D11): 코드발급·원탭공유·가입 attribution·양쪽 하트(`earn_hearts`)·어뷰징 가드.
- **원탭 공유**(D12): 전 AI 결과에 `@capacitor/share`(웹 `navigator.share` 폴백), 워터마크 X.
- **무료체험**(D10): `trial_ends_at`=+30일 상수화, 데모=+60일 서버부여, 네이티브=스토어 인트로오퍼.
  **자동결제 고지** 정합(3.1.2/전자상거래) — UpgradeModal 문구 ↔ 실제 동작 재확인.

### E. AI 생성물 신고 🔴P0 (genAI 정책)
- 전 AI 결과(피팅·스드메·촬영·청첩장)에 인앱 신고(`ReportDialog` 재사용) + 엣지 모더레이션 + AI 라벨.
- **이 환경에서 끝까지 구현·검증 가능**(결제 무관) → 코드 착수 시 1순위 권장.

### F. 안드로이드 인프라 🟡 · 세부 `android-target-sdk-upgrade.md`·`safe-area-system.md`
- 안전영역(상/하단 바): **수정 완료(코드 반영)** — raw env() 제거+표준화+가드 테스트.
- 타깃 SDK: 현재 35. Capacitor 8 + API36 권장, API37은 Capacitor 지원 시(Play 강제 2027-08). 로컬 빌드 검증.

### G. 웨딩촬영 시안(기능, 출시 필수 아님) 🟢 · 세부 `wedding_photoshoot_draft_plan.md`
- P1 기반(컷 프롬프트 엔진+잡큐 스키마) **코드 반영**. 잡큐 워커·PDF·UI는 후속.

### H. 출시 운영
- 데모 고정계정 시드(D6), Data Safety/App Privacy 작성(`play-store-listing.md` 갱신),
  콘텐츠 등급 설문, Android 릴리스(`release-guide-android.md`), iOS는 Mac+계정(`ios-packaging.md`).

---
## 4. 우선순위 로드맵
- **P0(출시 차단)**: A 결제 IAP · B 정책 보강(SiwA 폐기·Data Safety·G1~G3·매니페스트) · E AI 신고 · H 데모계정.
- **P1**: C 푸시 · D 성장(체험→공유→추천인) · B 청약철회/콘텐츠등급.
- **P2**: F 타깃 SDK 상층 · G 촬영시안 후속 · U1 한국 대체결제 검토.
- **일정 의존성**: D7 비공개테스트(2주)·D5 Apple 계정이 실제 게이트. 코드는 그와 병렬 진행.
- **착수 권장순서**(코드 시작 시): E(AI신고, 여기서 완결) → D-체험 → D-공유 → D-추천인 → A(결제, 로컬검증).

---
## 5. 검증 한계 (컨테이너 제약 — "정적 통과=완료" 보고 금지)
- 결제(IAP)·스토어 인트로오퍼·실공유시트·딥링크 attribution·푸시·네이티브 빌드·실기기 = **로컬/샌드박스 필요**.
- 여기서 가능: UI·로직·유닛테스트·빌드·esbuild·문서.

---
## 6. 결정 완료 / 진행 (벤치마킹 후 해소)
- **U1 (결제 전략) = 해결**: **네이티브 IAP 확정**(한국 대체결제 미추진 — 수수료 4%↓뿐이라 실익
  미미, 네이버·카카오 웹툰도 앱=IAP/웹=저렴 모델). 현 계획(웹 카카오 저렴 + 앱 IAP +10% + 서버가
  양쪽 인정)이 대형사 표준과 동일.
- **U3 (무료체험) = 해결 → 후속 P0**: **자동갱신(a) 확정**. ⚠️ 따라서 현 UpgradeModal **"체험 종료
  후 자동 결제 없음" 문구는 거짓 → 즉시 수정 필요(다크패턴·반려 위험)**. 교체: **"1개월 무료 후
  ₩X/월(또는 연 ₩Y) 자동결제, 언제든 해지"** + **결제 전 사전 리마인더**(한국 정기결제 사전고지·
  Apple 3.1.2). → §3-D·§3-B P0 작업으로 승격(`payment-disclosure-fix`).
- **U2 (AI 결과 UX) = 검증 완료**(현 코드 6패턴 대조, 성숙도 ~47/100):
  - ✅ **충족**: 재생성("다른 X 시도"), 히스토리/갤러리(전 surface 테이블+갤러리), 공유(6중 5).
  - ❌ **누락**: 변형(결과 1장만), 전후 비교, 확대/풀스크린, 즐겨찾기, HD 업스케일/업셀.
  - ⚠️ 공유 버튼 **불일치**(헤어·포토픽스·컨설팅 누락) → 빠른 통일(P1).
  - 권장: 자체 설계(D14)가 위 누락을 커버하는지 대조 / 쉬운순=확대→전후비교→공유통일.
