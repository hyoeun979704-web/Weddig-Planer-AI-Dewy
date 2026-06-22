# 청첩장 하객사진 → Google Drive 백업: 시뮬레이션·검증 플레이북

> 대상 기능: PR #408 `feat(invitation): 하객 사진 → 신랑신부 Google Drive 자동 백업`
> 작성: 2026-06-22. 이 문서는 **이 기능을 어떻게 시뮬레이션/검증하는지**의 단일 소스다.
> "작동한다 ≠ 검증됨"(AGENTS.md 검증 섹션) 원칙에 따라, **무엇이 검증됐고 무엇이 실환경
> 의존이라 미검증인지**를 명시한다.

## 0. 요약 (현재 상태)

| 레이어 | 상태 | 근거 |
|---|---|---|
| 마이그레이션(`20260622090000`) | ✅ **프로덕션 적용됨** | MCP `apply_migration` → 구조 검증 통과 |
| 엣지펑션 4종 | ✅ **배포됨(ACTIVE)** | `list_edge_functions` |
| 토큰 보호(RLS) | ✅ 실DB 확인 | `user_drive_accounts` SELECT 정책 0개 |
| 수동 "지금 동기화" | ✅ 동작 가능 | 스키마·함수·SQL 경로 검증 |
| 자동 cron 동기화 | ⚠️ **Vault 미설정 시 비동작** | `vault.decrypted_secrets`에 `project_url`/`service_role_key` 없음 |
| 실제 OAuth→업로드 e2e | ⛔ **미검증(실환경 의존)** | 실 커플 토큰·하객 사진 데이터 없음 |

## 1. 아키텍처 한눈에 (누구 드라이브에 올라가나)

**커플(신랑·신부) 본인의 Google Drive.** 운영자 드라이브가 아니다.

```
하객(익명) ──업로드──▶ Storage:guest-photos + invitation_guest_photos(row)
                                   │
신랑/신부 ──OAuth(drive.file)──▶ user_drive_accounts(그 사람 토큰, service-role 전용)
                                   │
invitation_drive_settings(drive_user_id=연결한 사람, folder_id, auto_sync)
                                   │
   ┌─ 수동: drive-photos(action=sync) ─┐
   │                                    ├─▶ driveSyncCore.syncInvitation()
   └─ 자동: pg_cron(10분) → drive-sync-cron ┘     │
                                                  ▼
        그 커플의 Drive 폴더 "Dewy 하객사진 - 신랑 · 신부" 에 업로드
        (drive_file_id/drive_synced_at 기록 — 멱등, 미동기화만 처리)
```

- **Vault `service_role_key`는 Google 자격증명이 아니다.** pg_cron이 엣지펑션을 호출할 때 쓰는
  Supabase 함수 인증키일 뿐. 실제 Drive 업로드는 함수 안에서 **커플 본인 OAuth 토큰**으로 일어난다.

## 2. 정적 검증 (로컬, 매 변경 시)

```bash
# 엣지펑션 번들(Deno) — URL/npm import 는 external
for fn in drive-oauth-start drive-oauth-callback drive-photos drive-sync-cron; do
  npx esbuild supabase/functions/$fn/index.ts --bundle --platform=neutral \
    --external:https://* --external:npm:* --outfile=/dev/null
done
npm run build          # vite build
npm run lint           # 신규 파일 경고 0건 기대
npm run test           # vitest (567 통과 기준)
```

## 3. DB 구조 검증 (마이그레이션 적용 후 — 재현용 SQL)

Supabase MCP `execute_sql` 또는 대시보드 SQL Editor에서 실행. **기대: 모든 행이 존재/일치.**

```sql
select 'tables' as kind, string_agg(c.relname, ', ' order by c.relname) as detail
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in
  ('user_drive_accounts','drive_oauth_states','invitation_drive_settings')
union all
select 'policies', string_agg(tablename||'.'||policyname||'['||cmd||']', ', ' order by tablename,policyname)
from pg_policies where schemaname='public' and tablename in
  ('user_drive_accounts','drive_oauth_states','invitation_drive_settings')
union all
-- 핵심 보안: 토큰 테이블에 SELECT/ALL 정책이 0개여야 클라가 토큰을 못 읽는다
select 'token_select_policies(want 0)',
  (select count(*)::text from pg_policies where schemaname='public'
   and tablename='user_drive_accounts' and cmd in ('SELECT','ALL'))
union all
select 'new_columns', string_agg(column_name, ', ' order by column_name)
from information_schema.columns where table_schema='public'
  and table_name='invitation_guest_photos' and column_name in ('drive_file_id','drive_synced_at')
union all
select 'cron_job', coalesce((select schedule||' active='||active::text
  from cron.job where jobname='drive-sync-auto'), 'MISSING');
```

**2026-06-22 실행 결과(통과):** 테이블 3개 / 정책 = `invitation_drive_settings_select[SELECT]` +
`user_drive_accounts_delete_own[DELETE]` / **token_select_policies = 0** / 컬럼 2개 /
cron `*/10 * * * * active=true`.

### 마이그레이션 적용 전 의존성 사전검증(추측 코딩 방지 게이트)

```sql
select 'is_couple_partner', exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='is_couple_partner')
union all select 'set_updated_at', exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='set_updated_at')
union all select 'couple_links.status', exists(select 1 from information_schema.columns
  where table_schema='public' and table_name='couple_links' and column_name='status')
union all select 'guest-photos bucket', exists(select 1 from storage.buckets where id='guest-photos')
union all select 'pg_cron', exists(select 1 from pg_extension where extname='pg_cron')
union all select 'pg_net', exists(select 1 from pg_extension where extname='pg_net');
-- 전부 true 여야 마이그레이션이 깨지지 않는다.
```

## 4. SQL 레벨 런타임 시뮬레이션 (읽기 전용, 데이터 오염 0)

엣지펑션이 실제 던지는 쿼리를 실 DB에 대해 검증한다.

```sql
-- 미연결 기본값이 안전하게 반환되나 (get_my_drive_account)
select public.get_my_drive_account();            -- 기대: {"connected": false}
-- drive-photos 'info' 의 카운트 쿼리
select count(*) total,
       count(*) filter (where drive_synced_at is not null) synced
from public.invitation_guest_photos;
-- syncInvitation 의 미동기화 조회(부분 인덱스 idx_guest_photos_unsynced 사용)
select count(*) from public.invitation_guest_photos where drive_file_id is null;
```

**2026-06-22 결과:** `{"connected": false}` ✓ / total 0, synced 0(프로덕션에 아직 하객 사진
업로드 이력 없음) / unsynced 0 — 쿼리 전부 정상 실행.

## 5. Drive API 측 시뮬레이션 (게이트됨)

- 세션의 Google Drive MCP로 폴더 생성·업로드를 재현하려 했으나, **auto-mode 분류기가
  "에이전트 자신의 드라이브에 대한 외부 쓰기"로 올바르게 차단**했다. 기능은 *각 커플의* 드라이브에
  쓰므로 운영자/세션 드라이브에 테스트 파일을 만드는 건 의미가 다르다 — 차단이 정확하다.
- **Drive API 의미론은 기존 프로덕션 코드로 이미 검증됨**: `_shared/googleMail.ts`의
  `driveUploadAndShare`가 동일한 `drive.file` scope + multipart 업로드를 운영 중이고,
  `googleDrive.ts`는 이를 미러링했다(폴더 보장·`parents` 업로드만 추가).

## 6. 실제 OAuth → 업로드 e2e (실환경 수동 — 아직 미검증)

### 사전 설정 (1회, 필수)

- **Edge Functions Secrets**: `GOOGLE_CLIENT_ID`·`GOOGLE_CLIENT_SECRET`(이미 캘린더/인앱메일
  연동으로 설정돼 있음 — 같은 OAuth 클라이언트 재사용), `ALLOWED_PAYMENT_ORIGINS`에 앱 도메인 포함
  (origin 화이트리스트 재사용).
- **Google Cloud Console → OAuth 2.0 웹 클라이언트 → 승인된 리디렉션 URI에 추가(필수)**:
  ```
  <SUPABASE_URL>/functions/v1/drive-oauth-callback
  ```
  → 누락 시 동의 단계에서 `redirect_uri_mismatch`로 실패한다. 콜백 함수마다 URI를 따로 등록해야
  하므로 cal-/mail- 콜백이 이미 있어도 **drive- 콜백은 새로 추가**해야 한다.
- **Scope**: `drive.file`(+`userinfo.email`)은 인앱 메일(`MAIL_SCOPES`)에서 이미 쓰는 scope라
  Google 동의화면 **추가 심사는 불필요**.

### 체크리스트 (실기기/실계정 — 이 환경에선 불가: 실 커플 토큰·sandbox)

1. 로그인 → `/invitation/:id/photos` → "구글 드라이브 백업" 카드 → **연결**.
2. Google 동의(이미 `drive.file`은 인앱 메일에서 등록된 scope라 추가 심사 불필요) → 콜백 복귀
   `?drive=connected` → 토스트 "자동 업로드 시작" → 첫 동기화 실행.
3. 본인 Drive에 폴더 `Dewy 하객사진 - 신랑 · 신부` 생성 + 사진 업로드 확인, 카드의
   "폴더 열기" 링크(`https://drive.google.com/drive/folders/{id}`) 동작 확인.
4. 하객 업로드 페이지(`/i/:slug/photos`)에서 새 사진 추가 → **수동 "지금 동기화"** → 카운트 증가.
5. 자동 동기화는 **§7 Vault 설정 후** 10분 내 반영되는지 `cron.job_run_details`로 확인.
6. 관측: 실패 시 `client_error_logs`(user_agent) + 엣지펑션 로그(MCP `get_logs`).

## 7. 자동 cron 동기화 활성화 (Vault 시크릿 — 1회)

cron(`drive-sync-auto`)은 등록·active 상태지만 `net.http_post`가 Vault에서 URL/키를 읽는다.
**시크릿 미설정 시 cron은 조용히 no-op**(같은 시크릿을 쓰는 `cleanup-ai-uploads`도 동일).

대시보드 → SQL Editor에서 1회:
```sql
select vault.create_secret('https://qabeywyzjsgyqpjqsvkd.supabase.co', 'project_url');
select vault.create_secret('<service_role_key>', 'service_role_key');  -- 대시보드 Settings→API 에서 복사
```
검증:
```sql
select name from vault.secrets;                          -- 2개
select status, return_message, start_time from cron.job_run_details
where jobid=(select jobid from cron.job where jobname='drive-sync-auto')
order by start_time desc limit 3;                        -- succeeded
```
> `service_role_key`는 민감정보 — 깃/문서에 값을 남기지 말고 대시보드에서만 입력.

## 8. 새 세션에서도 시뮬레이션이 되게 (재현성)

Claude Code 웹 세션은 매번 새 컨테이너에 새로 clone된다. 시뮬레이션 도구를 매번 즉시 쓰려면:

- **SessionStart 훅**(`.claude/settings.json`)으로 새 세션 시작 시 `npm ci`를 자동 실행 →
  `npm run test`/`build`/`lint`/시각 시뮬(`npm run shot` + `scripts/visual-review/mock-supabase.cjs`)이
  바로 동작. (전용 스킬 `session-start-hook` 사용 권장.)
- **MCP(Supabase·GitHub·Drive)는 repo 훅이 아니라 환경(Environment) 설정 레벨** — 환경을
  재사용하는 한 세션 간 유지된다. 세션마다 깨지는 건 주로 로컬 의존성(`node_modules`)이다.
- 빈 화면 없는 캡처가 필요하면 `mock-supabase.cjs`로 시드(단위·enum 주의 — `docs/guide-authoring.md`).

## 9. 알려진 한계 / deferred

- 수동 동기화와 cron이 **정확히 동시**에 돌면 한 사진이 중복 업로드될 수 있음(둘 다
  `drive_file_id IS NULL`을 봄). 자가 치유·데이터 손실 없음. 필요 시 동기화 진입에 advisory lock 추가.
- 회당 업로드 cap = 150장(`driveSyncCore.MAX_PER_RUN`). 초과분은 다음 cron/수동 호출이 이어받음.
- 폴더는 비공개(커플 본인만). 공개 링크 공유는 의도적으로 하지 않음.
