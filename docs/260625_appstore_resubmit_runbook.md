# App Store 반려 대응 — 재제출 런북 (2026-06-25)

> 2026-06-24 Apple 심사 반려 4건(3.1.1 IAP · 1.2 UGC · 2.3.8 빈 아이콘 · 3.1.2(c) 구독 EULA 링크)
> 대응 기록. **핵심 진단**: 반려에 첨부된 스크린샷(`결제 정보 등록 / 카드 인증 / 카카오페이로 인증 /
> 구독 결제 기능을 준비 중이에요`)은 **현재 main 코드에선 나올 수 없는 화면**이다 — `getPlatform()`은
> `web|ios|android`만 반환하므로 `getPaymentProvider()`의 `"unavailable"`("준비 중") 분기는 **도달 불가능**
> (`src/lib/payments/index.ts`). 즉 **Apple이 리뷰한 건 IAP 도입 전 구버전 바이너리**다. 코드는 이미
> iOS→App Store IAP로 분기돼 있다(`iap.ts`, `iap-verify-apple`). 따라서 #1·#3·#4의 최종 블로커는
> 대부분 **콘솔/Mac 작업 + 최신 코드로 재빌드·재제출**이다.

---

## 0. 반려 4건 × 상태 매트릭스

| # | 가이드라인 | 코드로 닫은 것 (이 PR) | 남은 필수 작업 (Mac/App Store Connect — 이 Linux 세션 불가) |
|---|---|---|---|
| 1 | **3.1.1** IAP 외 결제 | trial 화면 비-IAP "100원 카드 인증" 문구를 provider별 분기(iOS=IAP 무료체험 문구) · `/invitation/market`(카카오 디지털재화 판매) 라우트 플래그 가드 | **App Store Connect에 IAP 상품 등록**(`dewy_premium_monthly/yearly` + 하트 5종) · **최신 코드로 재빌드** · 샌드박스 e2e |
| 2 | **1.2** UGC 안전장치 | Terms §11의2 신설(불쾌콘텐츠 무관용 + 신고·차단·**24시간 내 삭제**·악용자 퇴출 명시) | **물리 기기 화면녹화**(EULA 동의 → 신고 → 차단) 3종을 리뷰 노트에 첨부 |
| 3 | **2.3.8** 빈 앱 아이콘 | 불투명 1024 아이콘 소스(`assets/`) + `@capacitor/assets` + `npm run assets:generate` | **Mac**: `cap add ios` 후 `npm run assets:generate` → `ios/App/...AppIcon.appiconset` 채움 → 커밋 |
| 4 | **3.1.2(c)** 구독 EULA 링크 | 구독 화면에 이용약관·개인정보처리방침 **인앱 기능 링크** + IAP 자동갱신 고지 강화 | **App Store Connect** 앱 설명/EULA 필드에 약관 URL, 개인정보처리방침 URL 입력 |

> **이미 구현돼 있던 것(재작업 금지)**: 신고(`ReportDialog`+`community_reports`)·차단(`BlockUserDialog`+
> `user_blocks`)·관리자 삭제(`AdminReports`), iOS IAP 엔진(`iap.ts`·`iap-verify-apple`), Apple 로그인
> (`AuthContext.signInWithApple`), 약관/개인정보 페이지(`/terms`·`/privacy`). 상세 `260622_appstore_submission_runbook.md`.

---

## 1. 3.1.1 — IAP 외 결제

### 코드(완료)
- **trial 문구 분기** (`src/pages/SubscriptionCheckout.tsx`): `provider==="iap"`(iOS/Android)일 때
  "100원 카드 인증 후 즉시 환불"(카카오 전용 사실관계)을 **노출하지 않고**, 스토어 무료체험 →
  자동갱신 문구로 대체. iOS 빌드에 외부 카드결제를 암시하는 문구가 남지 않게 함.
- **`/invitation/market` 가드** (`src/App.tsx`): 청첩장 디자인 마켓은 **디지털재화를 카카오 PG로 판매**
  하는데 provider 분기가 없다(`InvitationMarket.tsx`의 `design-purchase-ready`). `DESIGN_MARKET_ENABLED=false`
  동안 메뉴만 가려졌을 뿐 **직접 URL 도달 가능** → 리뷰어가 URL 입력 시 iOS에서 외부결제 노출 위험.
  플래그 off면 라우트를 `/`로 리다이렉트해 원천 차단.
  - ⚠️ **이 플래그를 켜기 전 반드시** `InvitationMarket` 결제에 IAP 분기를 추가할 것(디지털 디자인
    다운로드 = 3.1.1 대상). 켜진 채 iOS 제출 시 재리젝.

### 전수 감사 결과(iOS 결제경로 — 누수 없음 확인)
구독·하트는 iOS에서 IAP로 분기(`getPaymentProvider`), 카카오/웹링크는 web/android에서만 렌더.
실물 쇼핑(`Checkout.tsx`)·외부 어필리에이트(`ProductDetail` `window.open`)는 디지털재화가 아니라 IAP 면제.
식전영상 외주는 현재 **인앱 판매 없음**(waitlist만) → 정상.

### 콘솔/Mac (필수)
1. App Store Connect → 기능 → 구독: 그룹 `dewy_premium` 안에
   `dewy_premium_monthly`(무료체험 intro offer)·`dewy_premium_yearly` 등록. 하트 5종 소비성 등록.
   상세 `260622_apple_iap_setup.md`. **상품 미등록 시 IAP `store.get()`이 undefined → 구매 불가 →
   리뷰어가 "결제 안 됨"으로 또 반려**한다. 이 단계가 #1의 진짜 블로커.
2. App Store Server API 키(.p8) + Supabase 시크릿(`APPLE_IAP_*`) + ASN v2 URL.
3. 샌드박스 + 실기기 e2e(구매→적립, 구독→활성, 해지·환불).

---

## 2. 1.2 — UGC 안전장치

### 코드(완료)
- `src/pages/Terms.tsx` **제11조의2 (이용자 생성 콘텐츠 및 커뮤니티 운영)** 신설:
  - 불쾌·모욕 콘텐츠 및 악의적 이용자에 대한 **무관용(zero-tolerance) 원칙** 명시
  - 금지 콘텐츠 목록 · **신고** · **차단** 기능 안내
  - **신고 접수 후 24시간 이내 삭제** + 반복/중대 위반자 **이용정지·퇴출** 명문화
- 약관은 가입 시 동의 체크박스에서 링크됨(`Auth.tsx`) → "등록 전 EULA 제시" 요건 충족.

### Apple 제출(필수) — 리뷰 노트 + 화면녹화
물리 기기 화면녹화 3종을 App Store Connect "앱 리뷰 정보 > 노트"에 첨부:
1. 가입/로그인 **전** 약관(EULA) 동의 화면
2. 게시글·댓글 **신고** 동작(`ReportDialog`)
3. 사용자 **차단** 동작(`BlockUserDialog`) → 차단 즉시 피드에서 사라짐

> (선택 강화) 욕설 자동 필터는 Apple 1.2 필수 요건은 아님(신고+차단+24h 삭제가 핵심). 추후 보강 가능.

---

## 3. 2.3.8 — 빈 앱 아이콘

### 근본 원인
`ios/` 프로젝트가 **repo에 없음**(Android는 정상). Mac에서 `cap add ios` 시 Capacitor가 만드는
placeholder(빈/투명) 아이콘이 그대로 제출돼 "비어 보임".

### 코드(완료)
- `assets/icon-only.png`(1024×1024, **불투명** — App Store 마케팅 아이콘 알파 금지), `icon-foreground.png`,
  `icon-background.png` 생성. 소스 = `public/icon-512.png`(Dewy 하트 로고)를 흰 배경에 평탄화.
- `scripts/generate-app-icons.mjs`(sharp) — 재현 가능한 소스 생성기.
- `package.json`: `@capacitor/assets` devDep + `npm run assets:generate`(소스 생성 → iOS/Android 아이콘셋 매핑).

### Mac(필수)
```bash
npm install                  # @capacitor/assets 포함 설치(Mac은 sharp prebuild 정상)
npm run cap:build
npx cap add ios
npm run assets:generate      # assets/ → ios/App/.../AppIcon.appiconset 채움 + Android 재생성
npx cap sync ios
# 생성된 ios/ 커밋(Pods/·build/·output/ 제외 — .gitignore 반영됨)
```
> 이 Linux 세션에선 `@capacitor/assets`가 끌어오는 구버전 sharp가 프록시에서 libvips 다운로드 실패로
> 설치 불가했다. 아이콘 **소스(assets/\*.png)는 이미 커밋**돼 있어 Mac에서 매핑만 하면 된다.

---

## 4. 3.1.2(c) — 구독 EULA/개인정보 링크 + 자동갱신 고지

### 코드(완료)
- `SubscriptionCheckout.tsx`: 구독 화면 하단에 **이용약관(/terms)·개인정보처리방침(/privacy) 인앱
  기능 링크** 추가. IAP 결제수단 안내에 **자동갱신 고지**(상품명·기간·가격 + "기간 종료 전 자동 갱신,
  갱신 24h 전 스토어에서 해지 안 하면 다음 기간 요금 청구") 강화.

### ⚠️ 자동갱신 표기 일관성(결정 필요)
- 현재 약관 §8-2 = "구독은 **자동 갱신되지 않으며** 만료일에 직접 재결제". 이는 **웹(카카오)** 동작.
- 그러나 **iOS IAP 상품은 자동갱신 구독**(`PAID_SUBSCRIPTION`)이다. App Store는 자동갱신을 전제로 심사.
- → 결제수단별로 사실이 다르므로 **결제 화면 고지는 코드에서 분기**(완료)했으나, **약관 §8-2도
  "네이티브(App Store/Google Play) 구독은 스토어 정책에 따라 자동 갱신된다"는 단서를 추가 권장**
  (추후 약관 개정 시 반영 — 본 PR 범위 밖, deferred).

### App Store Connect(필수)
- 개인정보처리방침 URL 필드 + 앱 설명/EULA 필드에 이용약관 링크 입력(표준 Apple EULA를 쓰면 설명에
  Apple 표준 EULA 링크, 커스텀이면 ASC EULA 필드에 약관 URL). 자동갱신 구독은 메타데이터에
  제목·기간·가격·개인정보·약관 링크가 모두 있어야 함.

---

## 5. 참고 — 빌드/앱 구조 (왜 비즈니스·운영 화면이 iOS 바이너리에 섞이나)

현재는 **단일 코드베이스·단일 빌드**다(`App.tsx` 1개에 소비자·`/business/*`·`/admin/*` 130+ 라우트,
`vite build` 1회). 같은 `dist/`를 Capacitor가 Android·iOS로 각각 래핑(`appId: app.dewy`). 따라서
iOS 바이너리에 **기업·운영 화면도 (lazy지만) 포함**되어, `/invitation/market` 같은 surface가 URL로
새는 일이 생긴다(§1 가드로 차단). 구조적 해법은 **앱 분리 로드맵 Phase 2**(네이티브 빌드에서
console/partners 라우트 빌드타임 제외) — `docs/260624_app_separation_roadmap.md`. Mac은 **별도 빌드가
아니라 브라우저 웹**으로 지원(같은 문서 §3-A).

---

## 6. 제출 전 최종 체크 (이 라운드)
- [ ] 최신 코드로 **재빌드**(스크린샷의 "준비 중" 구버전 절대 재제출 금지)
- [ ] App Store Connect IAP 상품 등록 완료 + 샌드박스 구매 성공
- [ ] 아이콘: `npm run assets:generate` 후 Xcode에서 AppIcon 채워짐 육안 확인
- [ ] 메타데이터에 개인정보처리방침 URL + 약관(EULA) 링크
- [ ] 리뷰 노트에 UGC 화면녹화 3종 + 데모 계정 + 소셜/결제 테스트 방법
