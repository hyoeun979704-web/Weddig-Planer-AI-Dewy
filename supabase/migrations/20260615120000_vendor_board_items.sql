-- 내 업체 보드(예비신부 업체 체크리스트) — Threads 에서 신부들이 "전체 카테고리 슬롯을
-- 만들고 각 슬롯에 선택 업체/미정/견적중을 채우는" 정리 행동을 앱에 그대로 반영한다.
--
-- 슬롯 분류(택소노미)는 코드 단일 소스(src/lib/vendorBoard.ts)에 두고, 여기엔 사용자가
-- 실제로 채운 상태/선택 업체만 저장한다(빈 슬롯은 행을 만들지 않음 → 시드 불필요).
-- 견적 매칭(quote_requests)·예산·일정과는 클라이언트에서 best-effort 로 동기화한다.

create table if not exists public.vendor_board_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- 코드 택소노미의 슬롯 키(venue·studio·mc·jeju_snap 등). 한 유저당 슬롯 1행.
  slot_key text not null,
  -- undecided(미정) · quoting(견적중) · booked(예약완료)
  status text not null default 'undecided' check (status in ('undecided', 'quoting', 'booked')),
  -- 선택한 Dewy 입점 업체(있으면). 없으면 vendor_name 으로 외부 업체 직접 기록.
  place_id uuid references public.places(place_id) on delete set null,
  vendor_name text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slot_key)
);

create index if not exists vendor_board_items_user_idx on public.vendor_board_items (user_id);

alter table public.vendor_board_items enable row level security;

-- 본인 행만 읽기/쓰기(인가: 이 user 가 이 리소스 소유자인가).
drop policy if exists "vendor_board own select" on public.vendor_board_items;
create policy "vendor_board own select" on public.vendor_board_items
  for select using (auth.uid() = user_id);

drop policy if exists "vendor_board own insert" on public.vendor_board_items;
create policy "vendor_board own insert" on public.vendor_board_items
  for insert with check (auth.uid() = user_id);

drop policy if exists "vendor_board own update" on public.vendor_board_items;
create policy "vendor_board own update" on public.vendor_board_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "vendor_board own delete" on public.vendor_board_items;
create policy "vendor_board own delete" on public.vendor_board_items
  for delete using (auth.uid() = user_id);

drop trigger if exists vendor_board_items_set_updated_at on public.vendor_board_items;
create trigger vendor_board_items_set_updated_at
  before update on public.vendor_board_items
  for each row execute function public.set_updated_at();
