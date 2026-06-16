-- 외부 캘린더(Google/Kakao) 양방향 동기화 — 토큰·매핑·OAuth state 저장.
--
-- 모든 테이블은 **서비스 롤 전용**(Edge Function 만 접근). 토큰/리프레시토큰 같은 민감정보를
-- 클라이언트에 절대 노출하지 않기 위해 authenticated 정책을 두지 않는다(RLS enable + 정책
-- 0개 = 클라 직접 접근 차단, Edge Function 의 service_role 키는 RLS 우회). 연결 상태·동기화는
-- 전용 Edge Function(gcal-sync action=status) 으로만 노출한다.

-- ── 연결 계정(토큰) ─────────────────────────────────────────────────────────
create table if not exists public.user_calendar_accounts (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google', 'kakao')),
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  sync_token text,                      -- Google 증분 동기화 토큰(다음 pull 기준점)
  calendar_id text not null default 'primary',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);
alter table public.user_calendar_accounts enable row level security;
-- (authenticated 정책 없음 — 클라 직접 접근 차단. Edge Function service_role 만 접근)

-- ── 일정 항목 ↔ 외부 이벤트 매핑(에코 루프 방지·갱신·삭제 추적) ──────────────
create table if not exists public.calendar_event_links (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google', 'kakao')),
  schedule_item_id uuid not null references public.user_schedule_items(id) on delete cascade,
  external_event_id text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, provider, schedule_item_id)
);
create index if not exists calendar_event_links_ext_idx
  on public.calendar_event_links (user_id, provider, external_event_id);
alter table public.calendar_event_links enable row level security;

-- ── OAuth state(CSRF + 콜백↔사용자 결속) — 콜백엔 사용자 JWT 가 없으므로 ────────
-- start 에서 단기 state 행을 만들고, 콜백이 그 state 로 사용자/리다이렉트를 복원·삭제한다.
create table if not exists public.calendar_oauth_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google', 'kakao')),
  redirect_origin text not null,
  return_path text not null default '/settings',
  expires_at timestamptz not null
);
alter table public.calendar_oauth_states enable row level security;

drop trigger if exists user_calendar_accounts_set_updated_at on public.user_calendar_accounts;
create trigger user_calendar_accounts_set_updated_at
  before update on public.user_calendar_accounts
  for each row execute function public.set_updated_at();
