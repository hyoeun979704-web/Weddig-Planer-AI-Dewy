# 인수인계 — 하객사진 → Google Drive 백업 (2026-06-22)

> 다음 세션은 **이 문서부터 읽어라.** 기능 구현은 끝났고, 남은 건 대부분 **사용자/실환경
> 액션**과 선택적 후속 작업이다. 검증 방법은 `docs/260622_invitation_drive_sync_simulation.md`.

## 1. 한 줄 요약
하객 사진을 **신랑신부 본인 Google Drive**에 백업하는 기능. 코드·마이그레이션·엣지펑션
**프로덕션 반영 완료**. 수동 "지금 동기화"는 동작 가능. **자동 cron·실 OAuth e2e만 미완**(아래 §4).

## 2. PR / 브랜치 상태
| 항목 | 상태 |
|---|---|
| 작업 브랜치 | `claude/invitation-drive-sync` |
| PR #408 (기능) | ✅ **머지됨** — 재오픈/중복 PR 금지 |
| PR #409 (문서: 시뮬레이션 플레이북 + 설정 보강) | 🟡 **열림(draft)** — 머지 대기 |
| 프로덕션 Supabase | project_id `qabeywyzjsgyqpjqsvkd` |

## 3. 이미 끝난 것 (재작업 금지)
- **마이그레이션 `20260622090000` 프로덕션 적용 완료**(MCP `apply_migration`). 구조 검증 통과:
  테이블 3개(`user_drive_accounts`·`drive_oauth_states`·`invitation_drive_settings`), RLS ON,
  `user_drive_accounts` SELECT 정책 0개(토큰 보호), 컬럼 `drive_file_id`/`drive_synced_at`,
  부분 인덱스, cron `drive-sync-auto` `*/10 * * * *` active.
- **엣지펑션 4종 배포(ACTIVE)**: `drive-oauth-start`/`drive-oauth-callback`(verify_jwt=false)/
  `drive-photos`/`drive-sync-cron`(verify_jwt=false, service_role 키 일치 가드).
- 클라: `useInvitationDrive` 훅 + `DriveBackupCard`(InvitationPhotos에 배치).
- 정적검증(esbuild·build·lint·567 test)·SQL 런타임 시뮬(read-only) 통과.

## 4. 남은 일 — 사용자/실환경 액션 (우선순위 순)
1. **Google Cloud Console (필수, 안 하면 OAuth 자체가 깨짐)**
   OAuth 2.0 웹 클라이언트 → 승인된 리디렉션 URI에 추가:
   `<SUPABASE_URL>/functions/v1/drive-oauth-callback`
   (scope `drive.file`은 인앱 메일로 이미 등록 — 추가 심사 불필요. 콜백 URI만 새로 등록.)
2. **자동 cron 켜기 (선택 — 수동 동기화로 대체 가능)**
   대시보드 SQL Editor에서 Vault 시크릿 2개 등록(없으면 cron no-op, 기존 `cleanup-ai-uploads`도 동일):
   ```sql
   select vault.create_secret('https://qabeywyzjsgyqpjqsvkd.supabase.co','project_url');
   select vault.create_secret('<service_role_key>','service_role_key'); -- 대시보드 Settings→API
   ```
   `project_url`(비밀 아님)은 에이전트가 MCP로 넣어줄 수 있음. `service_role_key`만 사용자가 직접.
3. **실 OAuth → 업로드 e2e** — 실기기/실계정에서 `simulation.md §6` 체크리스트로 확인.
   (이 환경은 실 커플 토큰·하객 사진 데이터가 없어 불가.)

## 5. 사용자가 검토 중이던 선택적 후속 (지시 대기)
- **`project_url` MCP 주입** — "응" 하면 즉시 가능(service_role_key는 사용자 직접).
- **SessionStart 훅 생성** — `session-start-hook` 스킬로 `.claude/settings.json`에 `npm ci` 자동화
  (현재 훅 0개라 새 세션마다 의존성 수동 설치 필요). 새 세션 시뮬 재현성용.
- **소비자 인앱 가이드(`/help`)에 "드라이브 백업" 추가** — `docs/guide-authoring.md` 플레이북 필요
  (캡처 스크립트·시뮬레이션 동반). 별도 작업.

## 6. 핵심 파일 맵
```
supabase/migrations/20260622090000_invitation_drive_sync.sql   # 스키마+cron (적용됨)
supabase/functions/_shared/googleDrive.ts                      # OAuth+ensureFolder+uploadToFolder
supabase/functions/_shared/driveSyncCore.ts                    # syncInvitation (수동·cron 공용)
supabase/functions/drive-oauth-start|drive-oauth-callback|drive-photos|drive-sync-cron/
src/hooks/useInvitationDrive.ts
src/components/invitation/DriveBackupCard.tsx
src/pages/invitation/InvitationPhotos.tsx                      # 카드 배치 + ?drive= 콜백 처리
docs/260622_invitation_drive_sync_simulation.md                # 검증·시뮬 방법 (필독)
docs/ai-uploads-retention.md                                   # Vault 설정 절차(공유 시크릿)
```

## 7. 환경/도구 메모 (다음 세션이 알아야 할 것)
- 이 세션엔 **Supabase MCP**(execute_sql/apply_migration/get_logs/get_advisors 등)와
  **Google Drive MCP**가 붙어 있었다. 다음 세션에도 환경을 재사용하면 유지된다.
- `gh` CLI·`send_later` 없음 → CI 폴링·예약 점검 불가. PR 이벤트는 webhook으로만 옴.
- Drive MCP로 **세션 드라이브에 쓰기**는 auto-mode가 차단함(정상 — 기능은 커플 드라이브용).
- 프로덕션 직접 변경(apply_migration 등)은 **사용자 명시 승인 후에만**.

## 8. 설계 불변식 (회귀 방지)
- 업로드 대상 = `invitation_drive_settings.drive_user_id`(연결한 커플 본인). 운영자 아님.
- 토큰은 service-role 전용. 클라엔 `get_my_drive_account()`/`drive-photos info`로 상태·이메일만.
- `drive-photos`의 모든 청첩장 액션은 소유자/배우자 인가(`is_couple_partner`) 검증.
- 멱등: `drive_file_id IS NULL`만 업로드. 회당 150장 cap.
