-- Device push tokens for FCM / APNs.
-- 한 user 가 여러 기기를 가질 수 있고, 같은 기기를 재설치하면 token 만 갱신된다.
-- 따라서 unique 키는 token 자체로 두고, user_id 는 nullable + 인덱스만 둔다
-- (로그인 전 토큰 수신 → 추후 로그인 시 user_id 채워넣기 패턴 허용).

create table if not exists public.device_tokens (
  token text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists device_tokens_user_id_idx on public.device_tokens(user_id);

alter table public.device_tokens enable row level security;

-- 본인 토큰만 읽고 쓸 수 있다. Edge Function 은 service role 로 우회.
drop policy if exists "device_tokens_select_own" on public.device_tokens;
create policy "device_tokens_select_own"
  on public.device_tokens for select
  using (auth.uid() = user_id);

drop policy if exists "device_tokens_upsert_own" on public.device_tokens;
create policy "device_tokens_upsert_own"
  on public.device_tokens for insert
  with check (auth.uid() = user_id);

drop policy if exists "device_tokens_update_own" on public.device_tokens;
create policy "device_tokens_update_own"
  on public.device_tokens for update
  using (auth.uid() = user_id);

drop policy if exists "device_tokens_delete_own" on public.device_tokens;
create policy "device_tokens_delete_own"
  on public.device_tokens for delete
  using (auth.uid() = user_id);

-- updated_at 자동 갱신.
create or replace function public.touch_device_tokens_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists device_tokens_set_updated_at on public.device_tokens;
create trigger device_tokens_set_updated_at
  before update on public.device_tokens
  for each row execute function public.touch_device_tokens_updated_at();
