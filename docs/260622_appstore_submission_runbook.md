# App Store 제출 런북 (Dewy / iOS) — 2026-06-22

> **개발자 계정 승인 완료** 시점 기준의 "지금부터 끝까지" 실행 체크리스트.
> 기술 셋업 상세는 `docs/ios-packaging.md`, 스토어 카피·개인정보 원본은
> `docs/play-store-listing.md` 를 **단일 소스로 재사용**한다(여기선 iOS 차이만 보강).
>
> ⚠️ **이 저장소는 리눅스 CI** — `ios/` 생성·빌드·서명·업로드는 **macOS + Xcode 에서만** 가능.
> 코드/설정/문서는 이미 반영돼 있고(아래 §0), 남은 건 전부 **Mac·콘솔 작업**이다.

---

## 0. 이미 코드에 반영된 것 (재작업 금지)

| 항목 | 위치 | 상태 |
|---|---|---|
| `@capacitor/ios` 의존성 + `ios:open` 스크립트 | `package.json` | ✅ |
| `appId: app.dewy` / `appName: Dewy` / `webDir: dist` | `capacitor.config.ts` | ✅ |
| 안전영역(노치/다이나믹아일랜드)·상태바 스타일 | `src/lib/native/safeArea.ts`, `index.css` | ✅ |
| **Sign in with Apple — 코드 구현** | `AuthContext.signInWithApple`, `src/lib/native/oauth.ts`, `Auth.tsx`(버튼) | ✅ |
| OAuth 딥링크 핸들러(`app.dewy://auth/callback`) | `deepLink.ts` / `AuthContext` | ✅ (플랫폼 공용) |

> 즉 **코드 레벨의 심사 블로커(Sign in with Apple)는 이미 구현**됐다. 남은 Apple 작업은
> 콘솔 설정(Service ID·Key)과 Supabase Provider 활성화뿐.

---

## 1. 사전 준비물 (체크)

- [x] Apple Developer Program 멤버십 (**승인 완료**)
- [ ] macOS + 최신 Xcode (App Store) + Xcode Command Line Tools
- [ ] CocoaPods (`sudo gem install cocoapods` 또는 `brew install cocoapods`)
- [ ] App Store Connect 접근 권한(같은 Apple ID)
- [ ] 하트 로고 앱 아이콘 원본(1024×1024 PNG, **알파 없음** — iOS 마케팅 아이콘은 불투명 필수)

---

## 2. `ios/` 프로젝트 생성 (Mac, 1회) — 상세 `ios-packaging.md §1`

```bash
npm install
npm run cap:build            # vite build --mode capacitor && cap sync
npx cap add ios              # ios/ Xcode 프로젝트 생성 + pod install
npx cap sync ios
npm run ios:open             # Xcode 로 열기
```

> 생성된 `ios/` 는 커밋한다(`Pods/`·`build/`·`output/` 은 `.gitignore` 제외). 커밋은
> 반드시 작업 브랜치(`claude/...` 또는 별도 feature 브랜치)에서 — `main` 직접 push 금지.

---

## 3. App Store Connect — 앱 레코드 생성

1. **Certificates, Identifiers & Profiles → Identifiers** 에서 App ID 등록:
   - Bundle ID = `app.dewy` (Explicit)
   - **Capabilities 체크: `Sign In with Apple`** (필수 — §4), AdMob 쓰면 그대로, 푸시는 1차 보류.
2. **App Store Connect → 나의 앱 → +** 새 앱:
   - 플랫폼 iOS / 이름 `Dewy` / 기본 언어 한국어 / Bundle ID `app.dewy` / SKU 임의(`dewy-ios-001`).
3. **App 정보**: 카테고리 = 라이프스타일(보조: 참고), 콘텐츠 권한, 개인정보처리방침 URL
   (`https://dewy-wedding.com` 의 정책 페이지 — Play 와 동일 URL 재사용).

---

## 4. ⚠️ Sign in with Apple — **심사 블로커 #1** (가이드라인 4.8)

Google/Kakao 소셜 로그인을 제공하므로 **Apple 로그인 미제공 시 100% 반려**. 코드는 이미 됐고(§0),
**콘솔/백엔드 연결만** 남았다.

1. **Apple Developer 콘솔**:
   - **Identifiers → Services IDs** 새 Service ID 생성(예: `app.dewy.signin`) → Sign In with Apple 활성화 →
     **Return URLs** 에 Supabase 콜백 추가: `https://qabeywyzjsgyqpjqsvkd.supabase.co/auth/v1/callback`
   - **Keys** 새 Key 생성(Sign In with Apple 체크) → **`.p8` 다운로드(1회 한정)** + **Key ID** 기록.
   - **Team ID** 기록(우상단).
2. **Supabase 대시보드 → Authentication → Providers → Apple** 활성화:
   - Service ID(=`app.dewy.signin`), Team ID, Key ID, `.p8` 내용 입력.
   - **Redirect/Additional Redirect URLs** 에 `app.dewy://auth/callback` 이 있는지 확인(없으면 추가 — Android 와 공유).
3. **Xcode → Signing & Capabilities → + Sign In with Apple** 추가.
4. 검증: iOS 시뮬레이터/실기기에서 "Apple로 계속하기" → Apple 시트 → 앱 복귀(딥링크) → 세션 생성.

> 코드상 Apple 버튼은 **전 플랫폼 노출**(웹 포함)이라도 무방하다 — Apple 은 *iOS 에 존재*만 요구한다.

---

## 5. Xcode 설정 (심사 통과 필수) — 상세 `ios-packaging.md §2~3`

- **Signing**: Team 선택, Bundle Identifier = `app.dewy`, 자동 서명 권장.
- **Info.plist**:
  - `CFBundleDisplayName` = `Dewy`
  - `UIStatusBarStyle` = `UIStatusBarStyleDarkContent`, `UIViewControllerBasedStatusBarAppearance` = `NO`
    (밝은 핑크 헤더 → 어두운 상태바 아이콘; 부팅 깜빡임 방지)
  - `CFBundleURLTypes` 에 URL Scheme `app.dewy`(OAuth 딥링크)
- **앱 아이콘/스플래시**: `ios/App/App/Assets.xcassets` 에 하트 로고(Android 동일 소스).

---

## 6. AdMob iOS 설정 (광고 출시 시) — 상세 `ios-packaging.md §5-B`

Android 앱ID/광고단위와 **별개**. 미설정 시 광고만 비노출 — 심사 자체 블로커는 아님.
- AdMob 콘솔에서 iOS 앱ID + iOS 광고단위 발급(Android `ca-app-pub-…~7146431266` 재사용 금지).
- `Info.plist`: `GADApplicationIdentifier`, `SKAdNetworkItems`, `NSUserTrackingUsageDescription`(ATT 문구).
- **ATT(5.1.2)**: IDFA 개인화 광고는 App Tracking Transparency 프롬프트 필요. 미동의 시 비개인화 노출.
- **PrivacyInfo.xcprivacy**(앱+AdMob SDK) — §8 개인정보와 일관되게.

---

## 7. ⚠️ 결제 정책 — **심사 블로커 후보 #2** (가이드라인 3.1.1)

현재 결제는 **카카오페이(외부 위임, `@capacitor/browser`)** + `cordova-plugin-purchase`. Apple 은
**디지털 콘텐츠/구독을 앱에서 팔면 IAP(StoreKit) 강제**. 제출 전 반드시 정리:

- **하트 충전·프리미엄 구독**(디지털 재화)은 iOS 에서 **StoreKit IAP 로 제공해야** 반려를 피한다.
  - 옵션 A(권장): iOS 빌드에서 디지털 결제는 `cordova-plugin-purchase`(StoreKit) 경로로 분기,
    카카오페이 외부 링크는 iOS 에서 **숨김/비활성**.
  - 옵션 B: 1차 iOS 출시에서 **디지털 결제 화면 자체를 iOS 에서 비노출**(읽기 전용 기능만)로 심사 통과 후 후속.
- **실물/예약/오프라인 서비스 결제**는 외부 결제 허용 여지 — 단 품목별로 IAP 대상인지 제출 전 확인.

> ❗이 항목은 **제품 결정**이 필요하다(A vs B). 코드 분기 위치: 결제 진입 CTA 들(하트 충전·구독).
> 결정되면 별도 작업으로 구현 — 본 런북은 정책 게이트만 명시.

---

## 8. App 개인정보(App Privacy) — App Store Connect "앱 개인정보 보호"

Play **Data Safety**(`play-store-listing.md §4`)와 **동일 사실관계**를 Apple 양식으로 재기입.
주요 매핑:

| Apple 데이터 종류 | 수집 | 연결(Identity) | 추적(Tracking) | 비고 |
|---|---|---|---|---|
| 연락처 정보(이름·이메일·전화) | 예 | 예 | 아니오 | 계정/인증 |
| 사용자 콘텐츠(사진) | 예 | 예 | 아니오 | AI 드레스/메이크업, 처리 후 삭제 |
| 식별자(User ID·Device ID) | 예 | 예 | AdMob 시 IDFA 별도 | |
| 사용 데이터(상호작용·검색) | 예 | 예 | 아니오 | |
| 진단(크래시·성능) | 예 | 아니오 | 아니오 | |
| **금융(결제카드)** | 아니오 | — | — | 카카오페이/StoreKit 가 처리, 앱 미보관 |

- **추적(Tracking)**: AdMob IDFA 개인화 광고를 켜면 "추적"에 해당 → ATT 동의 + 여기 "예" 일관 필수.
- 전송 암호화 HTTPS, 사용자 삭제 요청 가능(회원 탈퇴 즉시 파기) — Play 와 동일.

---

## 9. 스토어 메타데이터 · 스크린샷 (iOS)

**카피는 `play-store-listing.md §1~2` 재사용**(앱 이름·짧은 설명·자세한 설명). iOS 길이 한도만 주의:
- 이름 30자, 부제(Subtitle) 30자, 프로모션 텍스트 170자, 설명 4000자.
- 부제 추천: `결혼 준비 체크리스트·예산·일정` (Play 짧은 설명 축약).

**스크린샷(필수 규격, App Store Connect 업로드)** — 컷·캡션은 `play-store-listing.md §6` 표 재사용:
| 디스플레이 | 해상도(px) | 필수 |
|---|---|---|
| 6.9"/6.7" (iPhone 16 Pro Max 등) | 1290×2796 또는 1320×2868 | **필수(최소 1세트)** |
| 6.5" (iPhone 11 Pro Max 등) | 1242×2688 | 권장 |
| 5.5" (선택, 구형) | 1242×2208 | 선택 |
| iPad 12.9"(아이패드 지원 시) | 2048×2732 | iPad 지원 시 필수 |

> iOS 17+ 는 6.7"(또는 6.9") 1세트만 있어도 다른 크기 자동 스케일 — **최소 6.7"/6.9" 한 세트**는 필수.
> 시뮬레이터(`npx cap run ios`)에서 ⌘S 로 캡처.

---

## 10. TestFlight · 심사 제출

1. Xcode → Product → **Archive** → Organizer → **Distribute App → App Store Connect → Upload**.
2. App Store Connect → TestFlight 에서 빌드 처리 대기(수출 규정 ENCRYPTION 문항 응답 — TLS만 쓰면 면제 가능).
3. 내부 테스터로 **§4 Apple 로그인 / §5 상태바·safe-area / 라우팅 / 결제 정책(§7)** 실기기 확인.
4. App Store Connect → 버전 → 빌드 선택 → 메타·스크린샷·개인정보 입력 완료 → **심사 제출**.

---

## 11. 심사 반려 단골 체크리스트 (제출 전 최종)

- [ ] **Sign in with Apple 동작**(§4) — 4.8 최빈 반려 사유
- [ ] **디지털 결제 IAP 정책 결정·반영**(§7) — 3.1.1
- [ ] 회원 탈퇴(계정 삭제) **앱 내 경로** 제공 — 가이드라인 5.1.1(v) (소셜 로그인 앱 필수)
- [ ] 개인정보처리방침 URL 유효 + 외부 SDK(Supabase·Gemini·OpenAI·Kakao·AdMob·Vercel) 명시
- [ ] App Privacy 양식 ↔ 실제 코드 수집 항목 일치(§8)
- [ ] 빈 화면/placeholder CTA 없음(데모 계정으로 walkthrough) — App Review 가 막힌 기능 보면 반려
- [ ] (UGC) 커뮤니티 신고·차단·삭제 동작 — 1.2 UGC 안전장치
- [ ] 데모 계정 + 리뷰 메모 제공(소셜/결제 테스트 방법)

---

## 12. 이 리눅스 세션에서 **불가능**한 것 (Mac 필수)

`cap add ios`·`pod install`·Xcode Archive·서명·TestFlight 업로드·시뮬레이터 캡처는 전부 macOS 전용.
본 세션이 한 것: 코드 블로커(Sign in with Apple) 구현 확인 + 본 런북 작성. 실제 빌드/제출은 Mac 에서.

---

## 13. 참고 문서

- `docs/ios-packaging.md` — 기술 셋업(ios/ 생성·Info.plist·딥링크·AdMob) 상세.
- `docs/play-store-listing.md` — 스토어 카피·연령등급·데이터안전(원본, iOS 재사용).
- `docs/capacitor-migration-plan.md` — 네이티브 래핑 설계·푸시 보류 근거.
