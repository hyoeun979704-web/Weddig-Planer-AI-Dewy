# PR 4-0 — 출시 연속성 인벤토리·동결 (260628)

> Phase 4 실행 기획(`260628_phase4_monorepo_partners_app_plan.md`)의 첫 PR. **코드 변경 없음 — 문서만.**
> 목적: 모노레포 전환(4-A3에서 `android/`·`ios/`를 `apps/consumer/` 아래로 이동)이 **라이브 소비자
> Android 앱의 정체성(appId·서명·스킴)을 바꿔 "신규 앱"으로 갈라지는 사고**를 막기 위한 고정표.
> 이동 후 release 빌드가 아래 값과 **동일**해야 머지 가능(검증 게이트).

## 0. 출시 상태 확정 (사용자, 2026-06-28)
| 앱/플랫폼 | 상태 | 연속성 |
|---|---|---|
| 소비자 Android | **라이브 출시됨** | 🔴 **보존 필수**(appId·서명·스킴 승계) |
| 소비자 iOS | **미출시** | 신규 제출 — 연속성 부담 없음 |
| 사장님 Android/iOS | 신규(Phase 4-B) | 신규 appId |
| 콘솔 | 웹/PWA | 해당 없음 |

→ **연속성 보존 대상 = 소비자 Android 단 하나.** 소비자 iOS·사장님은 신규 제출이라 자유도 높음.

## 1. 소비자 Android — 보존 인벤토리 (실측, repo 기준)
| 항목 | 현재 값 | 출처 | 이동 후 |
|---|---|---|---|
| applicationId | `app.dewy` | `android/app/build.gradle:15` | **동일 필수** |
| namespace | `app.dewy` | `android/app/build.gradle:12` | 동일 |
| versionCode | `8` | `build.gradle:18` | **단조 증가**(다음 ≥9) |
| versionName | `2.2.1` | `build.gradle:19` | 증가 |
| Capacitor appId | `app.dewy` | `capacitor.config.ts:11` | 동일 |
| 커스텀 URL 스킴 | `app.dewy` | `AndroidManifest.xml:30`, `ios Info.plist` | 동일(OAuth 콜백 의존) |
| OAuth 콜백 | `app.dewy://auth/callback` | `src/lib/native/deepLink.ts:17` | 동일(Supabase redirect 등록값) |
| 권한 | `INTERNET`, `com.google.android.gms.permission.AD_ID` | `AndroidManifest.xml:82,86` | 동일(admob) |
| SDK 버전 | `rootProject.ext`(compile/min/target) | `build.gradle:13,16,17` | 동일 |
| webDir | `dist` | `capacitor.config.ts:14` | 앱 이동 시 경로 재설정해도 산출물 동일 |

**딥링크 모델**: 커스텀 스킴(`app.dewy://`)만 사용. **Universal Links/App Links(`.well-known/
apple-app-site-association`·`assetlinks.json`) 미사용**(repo에 파일 없음). → 4-B 사장님 앱은 자체 스킴을
새로 받으면 되고, 소비자 association 파일 마이그레이션 이슈는 없음.

## 2. repo 밖(외부) 보존 항목 — 계정 소유자 확인 필요 🔴
모노레포 이동으로 **바뀌면 안 되지만 repo에 없는** 값들. 이동 작업과 별개로 보관 확인:
- **Android 서명키**: `android/keystore.properties`(git 미커밋) + keystore 파일. `keyAlias`·`storeFile`·
  `storePassword`·`keyPassword`. **이 키로 서명해야 기존 앱 업데이트로 인정**(키 바뀌면 신규 앱). 백업 필수.
- **Play App Signing 사용 여부**: 사용 중이면 upload key 만 관리(Google이 최종 서명). Play Console에서 확인.
- **Supabase Auth redirect 허용목록**: `app.dewy://auth/callback` 등록 유지(스킴 안 바뀌므로 변경 없음).
- **Play Console 앱 항목**: `app.dewy` 패키지에 계속 업로드(신규 항목 생성 금지).

## 3. 소비자 iOS (미출시 — 참고값, 신규 제출)
- bundle id `app.dewy`(`ios/App/App.xcodeproj/project.pbxproj:388,413`), 스킴 `app.dewy`(Info.plist).
- 권한문구 존재: `NSCameraUsageDescription`·`NSPhotoLibraryUsageDescription`·`NSPhotoLibraryAddUsageDescription`·
  `NSUserTrackingUsageDescription`(ATT — admob 때문). 신규 제출이므로 runbook §11 체크리스트로 첫 심사 준비.

## 4. 사장님 앱 신규 값 (제안 — 4-B에서 확정)
| 항목 | 제안 값 | 비고 |
|---|---|---|
| appId / bundle | `app.dewy.partners` | 소비자와 분리 |
| appName | `Dewy 파트너` | 스토어 표기 |
| 커스텀 스킴 | `app.dewy.partners` | 소비자 스킴과 충돌 방지 |
| OAuth 콜백 | `app.dewy.partners://auth/callback` | Supabase redirect **신규 등록 필요** |
| 권한 | `INTERNET`, 카메라/사진, **푸시** | **AD_ID 없음**(admob 미탑재) |
| ATT 문구 | **불필요** | 광고 없음 → `NSUserTrackingUsageDescription` 생략 → 추적 동의 회피 |
| 서명키 | **신규 keystore** | 소비자 키와 별도 |

## 5. 4-A3 머지 검증 게이트 (이 인벤토리로 대조)
`android/`·`ios/`를 `apps/consumer/`로 이동한 뒤 **머지 전 필수 확인**:
1. release 빌드 산출 `applicationId == app.dewy` (변동 0).
2. 동일 keystore로 서명됨(서명 인증서 지문 비교) — 키 변경 0.
3. `versionCode` ≥ 9(증가), 스킴 `app.dewy://` 동작(OAuth 콜백 e2e).
4. `cap sync` 경로(webDir) 정상, 권한·SDK 동일.
5. 소비자 웹 빌드 산출물 회귀 0(캡처 시뮬레이션).

→ 하나라도 어긋나면 머지 금지(기존 사용자 업데이트 단절 위험).

## 6. 다음
PR 4-A1(워크스페이스 골격)로 진행. 본 인벤토리는 4-A3까지 **고정 기준**으로 참조.
외부 항목(§2)은 계정 소유자(사용자)가 keystore 백업·Play App Signing 여부만 확인해주면 됨.

---
*문서 끝. 코드 변경 없음 — 연속성 동결 기준 문서.*
