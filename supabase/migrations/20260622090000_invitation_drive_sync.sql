-- 하객 사진 → 신랑신부 Google Drive 자동 백업 (PR #407 후속, 2단계)
--
-- 기존 패턴 미러:
--   · 토큰 저장(service-role 전용)   = user_calendar_accounts / user_mail_accounts
--   · 일회용 OAuth state             = calendar_oauth_states / mail_oauth_states
--   · pg_cron + Vault 시크릿 호출     = 20260520120000_ai_uploads_30day_cleanup
-- drive.file scope 는 인앱 메일(googleMail.ts MAIL_SCOPES)에서 이미 사용 중이라
-- Google OAuth 클라이언트에 등록돼 있음(추가 동의화면 심사 불필요).

-- ── 1. 연결 계정(토큰) — service-role 전용 ──────────────────────────────────
-- 토큰/리프레시토큰은 민감정보 → 클라이언트에 SELECT 노출 금지(정책 0개 = 차단).
-- 연결 상태/이메일은 정의자 함수 get_my_drive_account() 로만 노출.
create table if not exists public.user_drive_accounts (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'google' check (provider in ('google')),
  email text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);
alter table public.user_drive_accounts enable row level security;

-- 클라이언트는 토큰을 읽을 수 없다(SELECT 정책 없음). 연결 해제(delete)만 본인 허용.
drop policy if exists user_drive_accounts_delete_own on public.user_drive_accounts;
create policy user_drive_accounts_delete_own on public.user_drive_accounts
  for delete to authenticated using (user_id = auth.uid());

-- 연결 상태/이메일만 안전 반환(토큰 비노출).
create or replace function public.get_my_drive_account()
  returns jsonb language sql security definer set search_path to 'public' stable
as $$
  select coalesce(
    (select jsonb_build_object('connected', true, 'email', email)
       from public.user_drive_accounts
      where user_id = auth.uid() and provider = 'google' limit 1),
    jsonb_build_object('connected', false)
  );
$$;
revoke all on function public.get_my_drive_account() from public, anon;
grant execute on function public.get_my_drive_account() to authenticated;

-- ── 2. 일회용 OAuth state(CSRF + 콜백↔사용자 결속) ──────────────────────────
-- 콜백엔 사용자 JWT 가 없으므로 start 에서 단기 state 행을 만들고 콜백이 복원·삭제한다.
create table if not exists public.drive_oauth_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  redirect_origin text not null,
  return_path text not null default '/invitation/my',
  expires_at timestamptz not null
);
alter table public.drive_oauth_states enable row level security;
-- 클라 접근 불가(정책 없음). service-role 만.

-- ── 3. 청첩장별 드라이브 설정(대상 계정·폴더·자동동기화 토글) ───────────────
create table if not exists public.invitation_drive_settings (
  invitation_id uuid primary key references public.invitations(id) on delete cascade,
  drive_user_id uuid not null references auth.users(id) on delete cascade, -- 사진을 받을 연결 계정
  folder_id text,                 -- 첫 동기화 때 Edge Function(service-role)이 생성·기록
  auto_sync boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.invitation_drive_settings enable row level security;

-- 읽기: 청첩장 소유자/배우자만(자동동기화 상태·폴더 표시용).
-- 쓰기는 전부 Edge Function(service-role) — drive_user_id 를 호출자 본인으로 강제하기 위함.
drop policy if exists invitation_drive_settings_select on public.invitation_drive_settings;
create policy invitation_drive_settings_select on public.invitation_drive_settings
  for select to authenticated using (
    exists (
      select 1 from public.invitations i
       where i.id = invitation_id
         and (i.user_id = auth.uid() or public.is_couple_partner(i.user_id))
    )
  );

-- ── 4. 동기화 추적 컬럼(어떤 사진이 드라이브에 올라갔나) ─────────────────────
alter table public.invitation_guest_photos add column if not exists drive_file_id text;
alter table public.invitation_guest_photos add column if not exists drive_synced_at timestamptz;
-- 미동기화 사진 빠른 조회용 부분 인덱스.
create index if not exists idx_guest_photos_unsynced
  on public.invitation_guest_photos(invitation_id) where drive_file_id is null;

-- updated_at 트리거.
drop trigger if exists user_drive_accounts_set_updated_at on public.user_drive_accounts;
create trigger user_drive_accounts_set_updated_at
  before update on public.user_drive_accounts
  for each row execute function public.set_updated_at();

drop trigger if exists invitation_drive_settings_set_updated_at on public.invitation_drive_settings;
create trigger invitation_drive_settings_set_updated_at
  before update on public.invitation_drive_settings
  for each row execute function public.set_updated_at();

-- ── 5. pg_cron — 10분마다 자동 동기화 Edge Function 호출 ─────────────────────
-- Vault 시크릿(project_url·service_role_key)을 읽어 net.http_post 로 호출.
-- ai-uploads cleanup 과 동일 전제 — Vault 미설정 시 cron 은 조용히 실패하므로
-- docs/ai-uploads-retention.md 의 Vault 설정 절차를 1회 실행해야 자동 동기화가 동작한다
-- (같은 시크릿을 두 cron 이 공유). 시뮬레이션·검증: docs/260622_invitation_drive_sync_simulation.md.
-- (Vault 미설정·pg_cron 미가용이어도 '지금 동기화' 수동 경로는 정상 동작.)
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'drive-sync-auto') then
    perform cron.unschedule('drive-sync-auto');
  end if;
end $$;

select cron.schedule(
  'drive-sync-auto',
  '*/10 * * * *',  -- 10분마다
  $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/drive-sync-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  ) as request_id;
  $cron$
);

comment on table public.user_drive_accounts is 'Google Drive OAuth 토큰(하객사진 백업). 클라 토큰 SELECT 금지 — get_my_drive_account() 로 상태만.';
comment on table public.invitation_drive_settings is '청첩장별 드라이브 백업 설정. 쓰기는 drive-photos Edge Function(service-role)만 — drive_user_id 위변조 방지.';
