# 인앱 이메일(Gmail/Drive) — 설계 & 셋업 가이드

> 목표(사용자 요청): 보정 업체와의 **메일 교환이 불가피**하므로, ① 앱에서 메일로 바로 가는
> 경로 ② **앱 안에서 메일을 읽고/보내기**(메일앱 따로 안 열고) ③ 대용량은 **Google Drive
> 링크 공유**. 결정: **C안 — Gmail OAuth 인앱 메일함 + Drive 링크**.
>
> 기존 자산 재사용: 앱은 이미 **Google OAuth**(캘린더 `cal-oauth-*`, 시크릿 `GOOGLE_CLIENT_ID/
> SECRET`)를 쓴다. 같은 Google 클라이언트에 **Gmail·Drive scope 만 추가**(incremental)하면 됨.

## ⚠️ 꼭 알아야 할 한계 (정직)
- **첨부 한도**: Gmail 25MB. 100~300장 ZIP 은 초과 → **Drive 업로드 후 공유 링크**를 본문에
  넣는다(Gmail 웹과 동일 동작). 그래서 "대용량 첨부"는 채널 불문 결국 링크다.
- **검증 불가(sandbox)**: 이 환경엔 Google 자격증명·라이브가 없어 **OAuth 왕복·Gmail/Drive
  API 호출을 e2e 검증 못 함**. 코드는 Google REST 규격대로 작성하되, **배포+아래 셋업 후
  실환경 1회 확인 필수**(검증 규칙).
- **개인정보**: 사용자의 메일/드라이브에 접근 → 동의 화면·범위 최소화·토큰 안전보관 필요.

## 셋업 체크리스트 (운영자 — 코드 머지 후 1회)
1. Google Cloud Console → 기존 OAuth 클라이언트(캘린더용)에:
   - **Gmail API · Google Drive API 사용 설정(Enable)**
   - OAuth 동의화면 **scope 추가**: `gmail.readonly` `gmail.send` `drive.file`
   - 승인된 리디렉션 URI 에 `https://<project>.supabase.co/functions/v1/mail-oauth-callback` 추가
2. Supabase → Edge Functions Secrets: 기존 `GOOGLE_CLIENT_ID/SECRET` 재사용(추가 시크릿 없음).
3. 마이그레이션 적용(`user_mail_accounts`·`mail_oauth_states`).
4. 민감 scope 라 Google **앱 검증(verification)** 필요할 수 있음(검수 전엔 테스트 사용자만).

## 아키텍처 (cal-oauth 패턴 그대로)
```
[연결] /mail → mail-oauth-start(JWT) → 동의 URL → Google 동의
   → mail-oauth-callback(verify_jwt=false) → 토큰 교환 → user_mail_accounts upsert → /mail?mail=connected
[읽기] /mail → gmail-list(JWT) → 토큰으로 Gmail threads.list/get → 스레드 목록/본문
[보내기] 작성 → gmail-send(JWT):
   - 첨부 합계 ≤ 20MB → MIME 첨부로 messages.send
   - 초과 → Drive files.create(업로드) + permissions(anyoneWithLink) → 본문에 링크 + messages.send
[토큰] 만료 시 refresh_token 으로 갱신(googleMail.refresh) — 서버 사이드만.
```

## 스키마
- `user_mail_accounts(user_id, provider='google', email, access_token, refresh_token,
  token_expires_at, scopes, connected_at)` PK(user_id,provider). **RLS: 클라 토큰 SELECT 금지**
  (토큰은 edge function service-role 만). 연결상태/이메일은 정의자 함수 `get_my_mail_account()`.
- `mail_oauth_states(state, user_id, redirect_origin, return_path, expires_at)` — 일회용 CSRF state.

## 엣지 함수
- `_shared/googleMail.ts` — authUrl(Gmail+Drive scope)·exchangeCode·refresh·gmailFetch·driveUpload.
- `mail-oauth-start`(verify_jwt=true) · `mail-oauth-callback`(false) — cal-oauth 미러.
- `gmail-list`(true) — 최근 스레드(보낸/받은, q 필터) 목록+스니펫.
- `gmail-send`(true) — 보내기(+대용량 Drive 링크). 첨부는 클라가 storage/임시 업로드 후 경로 전달
  또는 base64(소용량). 대용량 ZIP 은 Drive 경로.

## UI
- `/mail` 페이지: 미연결 → "메일 연결하기"(Gmail). 연결됨 → 스레드 목록 → 열기/답장 + 새 메일 작성
  (수신자·제목·본문·첨부). 업체 상세/접수에서 "메일로 보내기" → `/mail?to=<업체메일>&subject=...`.
- 마이페이지 진입 + 업체 상세 CTA(딥링크).

## 단계 (이 PR = 1~2, 이후 = 3~4)
1. **스키마 + OAuth 스캐폴드**(start/callback/googleMail/config) — 연결 왕복.
2. **/mail 연결 UI** — 연결/해제 + 상태.
3. gmail-list + 스레드 읽기 UI.
4. gmail-send + 작성 UI + 대용량 Drive 링크.

> 이 PR 은 1~2(연결 기반)와 3~4 스캐폴드까지 올리되, **셋업·검증 전엔 비활성/연결유도** 상태로
> 안전 동작(시크릿/연결 없으면 "연결하기"만 — dead-end 토스트 아님).
