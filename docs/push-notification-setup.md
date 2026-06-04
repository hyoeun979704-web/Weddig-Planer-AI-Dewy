# 푸시 알림 활성화 절차 (운영자 작업)

로컬 알림(D-day/일정/예산)은 Firebase 없이 즉시 동작한다. 아래는 **서버 푸시**
(커뮤니티 반응·파트너 활동·찜한 업체·이벤트)를 켜기 위한 선행 작업이다.
관련 코드/마이그레이션은 모두 리포에 커밋돼 있고, **적용·시크릿 등록만 남았다.**

## 1. Firebase (FCM)
1. Firebase 콘솔에서 프로젝트 생성 → **Android 앱**(`app.dewy`) 등록 →
   `google-services.json` 다운로드 → `android/app/google-services.json` 배치.
   (build.gradle 이 파일이 있으면 자동으로 google-services 플러그인 적용.)
2. iOS 는 `npx cap add ios` 후 APNs 키 + Firebase iOS 앱 등록(GoogleService-Info.plist).
3. Firebase **서비스 계정 키(JSON)** 발급 → Supabase Secrets 에 등록:
   - `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`
     (PRIVATE_KEY 의 줄바꿈은 `\n` 으로 escape).

## 2. Android 권한/매니페스트
- `POST_NOTIFICATIONS` 권한은 이미 추가됨. 클라이언트가 런타임에 요청한다.
- FCM 기본 알림 아이콘 meta-data 가 필요하면 추가(선택).

## 3. DB 마이그레이션 적용 (순서대로)
```sql
-- 1) 디바이스 토큰 테이블
supabase/migrations/20260519050000_device_tokens.sql
-- 2) outbox + 시나리오 트리거 + user_notification_prefs
supabase/migrations/20260604120000_push_outbox_and_notification_triggers.sql
```
적용 후 검증:
```sql
select to_regclass('public.device_tokens'), to_regclass('public.push_outbox'),
       to_regclass('public.user_notification_prefs');
-- 트리거 동작: 커뮤니티 댓글 INSERT 후 push_outbox 에 row 가 생기는지 확인.
```

## 4. Edge Function 배포
```bash
supabase functions deploy send-push
supabase functions deploy dispatch-push
```

## 5. 디스패처 스케줄 (pg_cron + pg_net)
`20260604120000_...sql` 하단 주석의 `cron.schedule(...)` 블록에서
`<project-ref>` 와 `<SERVICE_ROLE_KEY>` 를 채워 1분 주기로 `dispatch-push` 를 호출.

## 발송 가드 (dispatch-push 에 구현됨)
- 사용자 설정(`user_notification_prefs`) + 마케팅 동의(`user_consents`) 존중.
- 카테고리 매핑: community/partner=서비스, schedule=일정 토글,
  vendor/event=마케팅 동의 필요.
- 조용한 시간 KST 21:00~08:00 미발송, 1인당 24h 최대 3건.

## 클라이언트
- `@capacitor/push-notifications` 설치됨. `src/lib/native/pushNotifications.ts` 가
  권한 요청 → 토큰을 `device_tokens` 에 upsert → 수신/탭 처리.
- 설정 화면에서 "푸시 알림" 토글을 켜면 권한 요청이 트리거된다.
