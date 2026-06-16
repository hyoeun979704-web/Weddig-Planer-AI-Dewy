# 캘린더 양방향 동기화 — 배포·설정·검증 런북

앱 일정(`user_schedule_items`) ↔ Google·Kakao 캘린더 양방향 동기화. 코드는 정적/빌드/esbuild
검증만 거쳤고, **OAuth·Edge Function·외부 API 실동작은 배포 + 아래 설정 후에만 검증 가능**하다.

## 구성 (허브-스포크)
- 앱이 source of truth. Google·Kakao 는 각각 앱과 독립 양방향.
- provider 간 전파는 앱을 거친다(앱→A push, B→앱 pull). 매핑(`calendar_event_links`)을 provider별
  분리 저장해 중복·에코 없음.
- 충돌: 나중 동기화 우선. 삭제: 앱·Google 양방향 / 카카오는 증분토큰 부재로 pull 삭제 비활성.

## 1) 필요한 시크릿 (Supabase → Project Settings → Edge Functions Secrets)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `KAKAO_REST_API_KEY` (필요 시 `KAKAO_CLIENT_SECRET`)
- `ALLOWED_PAYMENT_ORIGINS` 에 앱 도메인 포함 (origin 화이트리스트 재사용). 예:
  `https://dewy-wedding.com,https://www.dewy-wedding.com`
- (기본 제공) `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

## 2) OAuth 앱 설정 — 공용 리디렉션 URI 하나
```
<SUPABASE_URL>/functions/v1/cal-oauth-callback
```
- **Google Cloud** → OAuth 동의 화면 + 사용자 인증정보(OAuth 2.0 웹 클라이언트):
  승인된 리디렉션 URI 에 위 콜백 등록. 스코프 `https://www.googleapis.com/auth/calendar.events`.
- **Kakao Developers** → 내 앱 → 카카오 로그인 → Redirect URI 에 위 콜백 등록.
  동의항목에서 `talk_calendar`(톡캘린더, **비즈니스 권한 심사 필요**) 활성화.

## 3) 배포
- `main` 에 머지 → `supabase/functions/*` 변경분이 배포(paths 필터). 마이그레이션
  `20260616010000_calendar_sync.sql` 적용 확인.
- 함수 3종 배포 확인: `cal-oauth-start` / `cal-oauth-callback`(verify_jwt=false) / `cal-sync`.

## 4) 실환경 검증 체크리스트
설정(`/settings`) → "캘린더 연동" 에서:

1. **연결(Google)**: '연결' → 구글 동의 → `/settings?calendar=connected&calprovider=google` 복귀
   → "연결됨" + 자동 1회 동기화 토스트(보냄 N).
2. **앱→Google push**: 앱에서 일정 추가 → 약 4초 후(자동) 또는 '동기화' 버튼 → Google 캘린더에
   해당 날짜 종일 일정 생성 확인.
3. **Google→앱 pull**: Google 캘린더에서 일정 생성/수정 → 앱에서 '동기화' → 일정 페이지·캘린더에
   반영 확인(수정은 제목·날짜 갱신, 삭제는 항목 제거).
4. **카카오 연결·동기화**: 동일 절차로 Kakao. talk_calendar 승인 전이면 `kakao_not_configured`
   또는 동의 단계에서 막힘 → 승인 후 재시도.
5. **둘 다 연결**: Google 에서 만든 일정이 (Google→앱)→(앱→Kakao) 두 번의 동기화 후 Kakao 에도
   나타나는지 확인(최종 일관성).
6. **연결 해제**: 해제 후 더 이상 동기화 안 됨. 기존 외부 일정은 남음(설계).

## 5) 자동 동기화 동작 (구현됨)
- 일정 **추가·수정·삭제·완료토글·템플릿 생성** 시 4초 디바운스로 연결된 provider 에 백그라운드
  `cal-sync`. 연결 안 했으면 호출 0(localStorage 게이트). 연결 직후·설정의 '동기화' 버튼은 즉시.

## 6) 알려진 한계 / 후속
- 카카오 톡캘린더 API 의 정확한 요청/응답 필드는 승인 후 실응답으로 확정 필요(현재 문서 기준 best-effort).
- Google → 앱 **실시간** 반영은 현재 "앱에서 동기화 시 pull". 완전 실시간은 Google push
  notifications(watch)+webhook 필요(후속).
- 종일 일정만 동기화(시간대 일정 미지원).
