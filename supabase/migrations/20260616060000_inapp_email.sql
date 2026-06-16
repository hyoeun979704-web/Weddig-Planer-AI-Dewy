-- 인앱 이메일(Gmail/Drive) — OAuth 토큰 저장 + state. 설계: docs/260616_inapp_email_design.md.
-- cal-oauth(user_calendar_accounts/calendar_oauth_states) 패턴 미러. 토큰은 민감 →
-- 클라이언트에 SELECT 노출 금지(edge function service-role 만). 연결상태/이메일은 정의자 함수.

create table if not exists public.user_mail_accounts (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'google' check (provider in ('google')),
  email text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text,
  connected_at timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table public.user_mail_accounts enable row level security;

-- 클라이언트는 토큰을 읽을 수 없다(SELECT 정책 없음 = 차단). 연결 해제만 허용.
drop policy if exists user_mail_accounts_delete_own on public.user_mail_accounts;
create policy user_mail_accounts_delete_own on public.user_mail_accounts for delete to authenticated
  using (user_id = auth.uid());

-- 연결 상태/이메일만 안전 반환(토큰 비노출).
create or replace function public.get_my_mail_account()
  returns jsonb language sql security definer set search_path to 'public' stable
as $$
  select coalesce(
    (select jsonb_build_object('connected', true, 'email', email, 'provider', provider)
       from public.user_mail_accounts where user_id = auth.uid() limit 1),
    jsonb_build_object('connected', false)
  );
$$;
revoke all on function public.get_my_mail_account() from public;
grant execute on function public.get_my_mail_account() to authenticated;

-- 일회용 OAuth state(CSRF). 전적으로 edge function(service-role) 이 관리.
create table if not exists public.mail_oauth_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  redirect_origin text not null,
  return_path text not null default '/mail',
  expires_at timestamptz not null
);
alter table public.mail_oauth_states enable row level security;
-- 클라 접근 불가(정책 없음). service-role 만.

comment on table public.user_mail_accounts is 'Gmail OAuth 토큰(인앱 메일). 클라 토큰 SELECT 금지 — get_my_mail_account() 로 상태만.';
