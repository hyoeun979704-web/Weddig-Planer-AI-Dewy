# 앱 업데이트 배포 가이드 (Android / Play Store)

> Dewy 웹(Vercel)은 `main` 푸시로 **자동 배포**되지만, **안드로이드 앱(Play Store)은 매번
> 수동으로 빌드·서명·업로드**해야 한다. 이 문서는 새 버전을 Play Store 에 올리는 전 과정을
> 순서대로 정리한 단일 소스다.
>
> - 패키지명(appId): `app.dewy`
> - 빌드 산출물: Capacitor 가 `dist/`(Vite 빌드)를 감싼 AAB
> - 서명: `android/keystore.properties`(로컬 전용, 커밋 금지) + `signingConfigs.release`

---

## 0. 한 장 요약 (체크리스트)

매 릴리스마다 이 순서로 진행한다. 각 단계 상세는 아래 섹션 참조.

- [ ] **① 버전 올리기** — `android/app/build.gradle` 의 `versionCode`(정수 +1), `versionName`,
      그리고 `package.json` 의 `version` 을 **세 곳 동일하게** 맞춘다.
- [ ] **② CHANGELOG 갱신** — `CHANGELOG.md` 맨 위에 이번 버전 블록 추가.
- [ ] **③ 웹 자산 빌드 + 동기화** — `npm run cap:build` (= `vite build --mode capacitor && cap sync`).
- [ ] **④ 서명 키 준비** — `android/keystore.properties` 존재 확인(없으면 `*.example` 복사).
- [ ] **⑤ 릴리스 AAB 빌드** — Android Studio 또는 `cd android && ./gradlew bundleRelease`.
- [ ] **⑥ Play Console 업로드** — 프로덕션(또는 내부/비공개 테스트) 트랙에 AAB 업로드.
- [ ] **⑦ 출시 노트 입력** — 아래 "이번 업데이트" 문구 붙여넣기(한국어 + 필요 언어).
- [ ] **⑧ 검토 제출** — 단계적 출시(%) 설정 후 제출. 심사 통과까지 수 시간~며칠.
- [ ] **⑨ 태그·커밋** — 버전 bump 커밋을 `main` 에 머지하고 `vX.Y.Z` git 태그.

---

## 1. 버전 올리기 (세 곳 동기화)

Play Store 는 **같은 `versionCode` 로 재업로드를 거부**한다. 반드시 직전보다 큰 정수로 올린다.
`versionName` 은 사용자 표시용(예: 2.2.0), `versionCode` 는 내부 정수(예: 7)다.

**`android/app/build.gradle`**
```gradle
versionCode 7        // → 8 로 (정수 +1, 절대 중복/하향 금지)
versionName "2.2.0"  // → "2.3.0" 등 SemVer
```

**`package.json`**
```json
"version": "2.2.0"   // build.gradle 의 versionName 과 동일하게
```

> **왜 세 곳?** 푸터(앱 정보)에 노출되는 버전은 `package.json` 기준이고, 스토어/기기 업데이트
> 판정은 gradle 기준이다. 드리프트가 나면 "스토어는 2.3인데 앱 화면은 2.2" 같은 혼란이 생긴다.

### 버전 규칙 (SemVer)
- **MAJOR**(x.0.0): 호환 깨지는 큰 개편.
- **MINOR**(2.x.0): 기능 추가(이번 보드/비교 릴리스처럼).
- **PATCH**(2.2.x): 버그 수정·소규모.
- `versionCode` 는 의미와 무관하게 **매 업로드마다 +1**.

---

## 2. CHANGELOG 갱신

`CHANGELOG.md` 최상단에 블록을 추가한다(앱 버전 기준 단일 이력).

```md
## 2.3.0 (versionCode 8) — YYYY-MM-DD

<한 줄 요약>

**섹션 제목**
- 사용자 관점 변경점 (기술 용어 X, "무엇이 좋아졌나")
```

여기 내용을 압축해 ⑦의 Play Store "이번 업데이트" 문구로 재활용한다.

---

## 3. 웹 자산 빌드 + Capacitor 동기화

앱은 웹 번들(`dist/`)을 네이티브 셸로 감싸므로, **반드시 최신 웹을 먼저 빌드**해야 한다.

```bash
npm install            # 의존성 변경 있었으면
npm run cap:build      # = vite build --mode capacitor && cap sync
```

- `--mode capacitor`: 웹/앱 환경 분기(OAuth 커스텀 스킴 `app.dewy://` 등)를 앱용으로 빌드.
- `cap sync`: `dist/` 를 `android/` 로 복사 + 플러그인 네이티브 의존성 갱신.
- 동기화만 다시 하려면 `npm run cap:sync`.

> 빌드 실패 시 `npm run build` 단독으로 먼저 Vite 에러를 분리해 확인.

---

## 4. 서명 키 준비 (최초 1회 + 매 빌드 확인)

릴리스 AAB 는 **개발 서명 키로 서명**되어야 한다. 키와 비밀번호는 **절대 커밋하지 않는다**
(`android/.gitignore` 로 차단됨).

### 4-1. 최초 1회 — 키스토어 발급(이미 있으면 건너뜀)
```bash
keytool -genkey -v -keystore dewy-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias dewy
```
> ⚠️ 이 `.jks` 파일과 비밀번호를 **분실하면 같은 앱으로 업데이트가 영구 불가**하다
> (Play 앱 서명을 쓰더라도 업로드 키는 필요). **안전한 곳에 백업**(비밀번호 관리자 등).

### 4-2. 매 환경 — `keystore.properties` 생성
`android/keystore.properties.example` 를 복사해 `android/keystore.properties` 로 만들고 채운다:
```properties
storeFile=/절대경로/dewy-release.jks
storePassword=********
keyAlias=dewy
keyPassword=********
```
- 파일이 **없으면 release 빌드가 unsigned** 로 떨어져 Play 업로드가 거부된다(빌드 로그로 확인).
- Windows 경로는 `/` 또는 `\\`(역슬래시 2개) 사용.

---

## 5. 릴리스 AAB 빌드

Play Store 는 APK 가 아니라 **AAB(Android App Bundle)** 를 권장/요구한다.

### 방법 A — 명령줄(권장, 재현성 ↑)
```bash
cd android
./gradlew bundleRelease      # Windows: gradlew.bat bundleRelease
```
산출물: `android/app/build/outputs/bundle/release/app-release.aab`

### 방법 B — Android Studio
```bash
npm run android:open         # = cap open android
```
1. 메뉴 **Build → Generate Signed Bundle / APK → Android App Bundle**
2. 키스토어 선택(또는 `keystore.properties` 자동 사용) → **release** 빌드 변형 선택 → Finish.

### 빌드 검증(업로드 전)
- AAB 가 `release`(unsigned 아님)인지 확인: `versionName`/`versionCode` 가 의도대로 들어갔는지.
- 실기기 스모크 테스트가 필요하면 `npm run android:dev`(= `cap:build` + `cap run android`)로
  디버그 빌드를 기기에 올려 **핵심 플로우(로그인 → 견적 → 보드)** 를 직접 눌러본다.
  ("작동한다 ≠ 검증됨" — 빌드 성공만으로 완료 보고 금지.)

---

## 6. Play Console 업로드

1. [Play Console](https://play.google.com/console) → **Dewy** 앱 선택.
2. **테스트 → 비공개/내부 테스트** 또는 **프로덕션** 트랙 선택.
   - 큰 변경은 **내부 테스트 트랙 먼저** 올려 실기기 확인 후 프로덕션 승격을 권장.
3. **새 버전 만들기** → `app-release.aab` 업로드.
4. **Play 앱 서명**: 최초 등록 시 업로드 키 등록. 이후엔 업로드 키로 서명만 하면 Google 이
   배포용 서명을 대신 처리.

---

## 7. "이번 업데이트"(출시 노트) 입력

CHANGELOG 를 압축해 사용자 친화 문구로. **현재 v2.2.0 기준 문구**:

```
- 여러 업체 견적을 한 곳에서 비교하고, 수락하면 앱에서 바로 채팅·연락 연결
- 견적 진행 상태를 한눈에 + 미응답 알림으로 놓치지 않기
- 예약하면 예산·일정에 자동 반영
- '내 업체 보드'로 베뉴·드레스·스냅까지 준비 상태를 한 보드에서 정리
- 업체 비교·홈 빠른접근 추가 및 안정성 개선
```

작성 팁: 기술 용어 대신 "무엇이 좋아졌나", 핵심 3~5줄, 500자 한도. 다국어 지원 시 언어별 입력.

---

## 8. 검토 제출 · 단계적 출시

- **단계적 출시(Staged rollout)**: 프로덕션은 처음 10~20% 로 시작해 크래시/리뷰 모니터링 후
  100% 로 확대(문제 시 출시 중지 가능).
- 심사: 보통 수 시간~수 일. 정책 위반(권한·개인정보·광고)이 있으면 반려되니 사전 점검.
- 출시 후 **Android vitals**(ANR/크래시)와 리뷰를 1~2일 모니터링.

---

## 9. 마무리 — 커밋 · 태그

```bash
git add android/app/build.gradle package.json CHANGELOG.md
git commit -m "release: vX.Y.Z (versionCode N)"
# PR → main 머지 후
git tag vX.Y.Z && git push origin vX.Y.Z
```
> 웹(Vercel)은 `main` 머지 시점에 자동 배포되고, 앱은 위 ⑤~⑧로 별도 배포된다. **둘의 버전을
> 같은 커밋에서 맞추면** "웹은 신규 기능, 앱은 구버전" 불일치를 막는다.

---

## 부록 A — iOS / App Store (참고)

iOS 셸도 Capacitor 로 존재(`@capacitor/ios`)하나 빌드는 **macOS + Xcode** 필요.

1. `npm run cap:build` → `npm run ios:open`(= `cap open ios`).
2. Xcode 에서 **Signing & Capabilities**(Apple Developer 팀), `Info.plist` 의
   `CFBundleShortVersionString`(=versionName)·`CFBundleVersion`(=빌드번호) 갱신.
3. **Product → Archive** → Organizer → **Distribute App → App Store Connect** 업로드.
4. [App Store Connect](https://appstoreconnect.apple.com) 에서 새 버전 생성 → 빌드 선택 →
   "이번 버전의 새로운 기능"(⑦ 문구 재사용) 입력 → 심사 제출.
5. Apple 심사는 보통 24~48시간. 거부 사유는 Resolution Center 에서 확인·소명.

> iOS 는 별도 버전 번호 체계이므로 Android `versionCode` 와 직접 연동되지 않는다.
> `versionName`(2.x.y)만 마케팅 버전으로 양 플랫폼 동일하게 유지하면 된다.

---

## 부록 B — 자주 막히는 지점 (Troubleshooting)

| 증상 | 원인 / 해결 |
|---|---|
| 업로드 시 "이미 사용된 버전 코드" | `versionCode` 미증가 → +1 후 재빌드. |
| "App not signed / unsigned bundle" | `android/keystore.properties` 누락 → 4-2 생성. |
| 앱 화면 버전과 스토어 버전 불일치 | `package.json` ↔ gradle 동기화 누락(섹션 1). |
| 흰 화면/구 UI | `cap:build` 누락(웹 미빌드) → 3 재실행 후 다시 빌드. |
| OAuth 콜백 실패(앱) | `--mode capacitor` 빌드 아님 → `npm run cap:build` 로 빌드. |
| 권한/개인정보 정책 반려 | 데이터 보안 양식·권한 사유 점검(`docs/play-store-listing.md`). |
