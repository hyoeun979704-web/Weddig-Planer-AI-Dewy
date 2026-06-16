-- 청첩장 디자인 마켓플레이스 — 작가 디자인 등록 + 구매(라이선스).
-- 설계: docs/260616_invitation_design_marketplace.md · docs/260616_invitation_product_types.md.
-- 결제는 실제 재화(KRW·카카오페이), 포인트는 결제 함수 내 할인 차감(후속). 등록은 동의 게이트 경유.

-- 작가 등록 디자인.
create table if not exists public.designer_designs (
  id uuid primary key default gen_random_uuid(),
  designer_user_id uuid not null references auth.users(id) on delete cascade,
  place_id uuid references public.places(place_id) on delete set null,
  title text not null,
  description text,
  preview_urls text[] not null default '{}',
  layout jsonb,                       -- 에디터 디자인 데이터(없으면 후속 연결)
  price int not null default 0,       -- KRW(라이선스 포함, 작가 책정)
  style_tags text[] not null default '{}',
  sellable text[] not null default '{design}',  -- 'design' | 'design_print'
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  review_note text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_designer_designs_market on public.designer_designs(status, active, created_at desc);
create index if not exists idx_designer_designs_owner on public.designer_designs(designer_user_id, created_at desc);

alter table public.designer_designs enable row level security;

-- 공개: 승인+활성 디자인은 누구나(마켓 노출).
drop policy if exists designer_designs_public_select on public.designer_designs;
create policy designer_designs_public_select on public.designer_designs for select
  using (status = 'approved' and active = true);
-- 작가 본인은 자기 디자인 전체 조회(초안·반려 포함).
drop policy if exists designer_designs_owner_select on public.designer_designs;
create policy designer_designs_owner_select on public.designer_designs for select to authenticated
  using (designer_user_id = auth.uid());
-- 등록: 본인 명의 + 항상 'pending' 으로 시작(자가 승인 금지).
drop policy if exists designer_designs_insert on public.designer_designs;
create policy designer_designs_insert on public.designer_designs for insert to authenticated
  with check (designer_user_id = auth.uid() and status = 'pending');
-- 수정: 본인 디자인. (승인 전환은 운영자 검토 경로에서 — 본 정책은 내용 수정용.)
drop policy if exists designer_designs_owner_update on public.designer_designs;
create policy designer_designs_owner_update on public.designer_designs for update to authenticated
  using (designer_user_id = auth.uid())
  with check (designer_user_id = auth.uid());
-- 삭제: 본인.
drop policy if exists designer_designs_owner_delete on public.designer_designs;
create policy designer_designs_owner_delete on public.designer_designs for delete to authenticated
  using (designer_user_id = auth.uid());

-- 구매(라이선스). grant 는 결제 승인 edge function(service-role)만 — 클라 임의 insert 금지(인가 핵심).
create table if not exists public.design_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  design_id uuid not null references public.designer_designs(id) on delete cascade,
  amount int not null,            -- 실제 결제액(KRW)
  points_used int not null default 0,
  order_ref text,                 -- 카카오페이 tid 등
  licensed_at timestamptz not null default now(),
  unique (user_id, design_id)
);
create index if not exists idx_design_purchases_user on public.design_purchases(user_id, licensed_at desc);

alter table public.design_purchases enable row level security;
-- 본인 구매 내역만 조회. INSERT/UPDATE 정책 없음 = 클라 차단(결제 함수 service-role 만).
drop policy if exists design_purchases_owner_select on public.design_purchases;
create policy design_purchases_owner_select on public.design_purchases for select to authenticated
  using (user_id = auth.uid());

comment on table public.designer_designs is '작가 등록 청첩장 디자인(마켓). 가격=라이선스 포함 작가 책정. 등록 시 동의 게이트, 운영자 승인 후 노출.';
comment on table public.design_purchases is '디자인 구매(이용권). grant 는 결제승인 함수만(클라 insert 금지).';
