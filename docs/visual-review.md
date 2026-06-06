# 비주얼 UX 검토 (Playwright 스크린샷 harness)

단위/통합 테스트가 못 잡는 **레이아웃·시각 회귀**를 실제 화면으로 확인하기 위한 harness.
특히 페르소나·온보딩·모달 같은 UX 변경 검토에 쓴다.

## 가능/불가능 (환경 의존)

- ✅ **앱 셸 / 정적 UI**: 헤드리스 크롬 + Vite dev 서버면 어디서나 캡처 가능.
- ⚠️ **로그인·데이터 의존 화면**(페르소나 모달, 동의 게이트, persona 큐레이션 등): 앱이
  **Supabase 에 네트워크로 닿아야** 동작한다. 일부 샌드박스/CI 는 `*.supabase.co` 를
  allowlist 로 막아(`Host not in allowlist` / `Failed to fetch`) 백엔드 의존 플로우 캡처가
  불가하다 — 이 경우 셸만 렌더된다. **Supabase 가 닿는 환경(개발 머신/네트워크 열린 CI)**
  에서 실행할 것.
- ❌ **네이티브(Play Store) 앱**: 이 harness 는 웹(Capacitor 래핑 대상)만 본다. 네이티브
  전용(AdMob·Capacitor 플러그인·네이티브 내비)은 실제 기기/에뮬레이터가 필요 → 아래 참조.

## 준비 (1회)

```bash
npm i -D playwright
npx playwright install chromium
```

## 실행

```bash
# 1) dev 서버 (IPv4 바인딩 — 일부 환경은 기본 IPv6 :: 가 EAFNOSUPPORT)
npm run dev:vite -- --host 127.0.0.1 --port 5199

# 2) 캡처 (다른 터미널)
node scripts/visual-review/screenshot.cjs /          out/home.png
node scripts/visual-review/screenshot.cjs /schedule  out/schedule.png
# 로그인이 필요한 화면:
E2E_EMAIL=you@example.com E2E_PASSWORD=... \
  node scripts/visual-review/screenshot.cjs /schedule out/persona-modal.png --login
```

옵션: `--full`(전체 페이지), `BASE`(기본 `http://127.0.0.1:5199`), `SETTLE_MS`(렌더 대기).
사전설치 브라우저만 있고 다운로드가 막힌 환경은 `/opt/pw-browsers/chromium-*` 를 자동 fallback.

**보안**: 기본은 TLS 검증을 유지한다. 프록시가 self-signed cert 로 가로채는 샌드박스에서만
`INSECURE_TLS=1` 로 인증서 검증을 끈다(`--ignore-certificate-errors`). **실네트워크에서는
켜지 말 것**(MITM 노출). 로그인 시 **전용 throwaway 테스트 계정**만 쓰고(실유저/관리자 금지),
자격증명은 셸 env 로만 전달(코드/저장소에 하드코딩 금지) — RLS 가 최종 방어선.

## 네이티브 Android(Play Store) 테스트는?

웹 harness 로는 안 된다. 실기기/에뮬레이터가 필요:
- **Play Console 내부 테스트 트랙**(이미 사용 중 — `/beta` 설치 링크): 실제 기기에 설치해 수동 검토.
- **Firebase Test Lab / BrowserStack** 등 클라우드 디바이스 팜: 자동 스크린샷·구동 테스트.
- 로컬 `npm run android:dev`(Android SDK + 에뮬레이터/기기 필요).
- 다만 UI 대부분은 웹 레이어라 위 웹 harness 로 커버되고, 네이티브 전용만 기기 검증하면 된다.
