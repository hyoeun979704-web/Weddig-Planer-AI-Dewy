-- 결과물 수령(S8) — 업체(사장님)가 계약 후 보정본/결과물 파일을 소비자에게 인앱 전달.
-- 설계: docs/260616_retouch_vendor_flow_simulation.md §4. 사설보정 등 etc 상세업체의
-- "결과물 수령" 인앱 부재(dead-end)를 메운다.
--
-- 결과물(웨딩 보정본)은 민감 → **프라이빗 버킷 + 서명 URL**. 접근은 vendor_deliveries
-- 테이블 멤버십(소유자=업체 / 수신자=소비자)으로 게이팅한다(quote-uploads 의 public
-- 버킷과 달리 사적 사진이므로 강화).

-- 1) 프라이빗 버킷.
insert into storage.buckets (id, name, public) values ('vendor-deliveries', 'vendor-deliveries', false)
on conflict (id) do nothing;

-- 2) 전달 메타 테이블.
create table if not exists public.vendor_deliveries (
  id uuid primary key default gen_random_uuid(),
  -- 어느 문의(상담)에 대한 결과물인지(선택) — 수신자 도출의 근거.
  inquiry_id uuid references public.place_inquiries(id) on delete set null,
  place_id uuid references public.places(place_id) on delete set null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,     -- 업체(업로더)
  recipient_user_id uuid not null references auth.users(id) on delete cascade, -- 소비자(수신)
  title text,
  message text,
  file_paths text[] not null default '{}',
  status text not null default 'delivered' check (status in ('delivered','received')),
  created_at timestamptz not null default now(),
  received_at timestamptz
);

create index if not exists idx_vendor_deliveries_recipient on public.vendor_deliveries(recipient_user_id, created_at desc);
create index if not exists idx_vendor_deliveries_owner on public.vendor_deliveries(owner_user_id, created_at desc);

alter table public.vendor_deliveries enable row level security;

-- 소유자(업체)·수신자(소비자)만 행을 본다.
drop policy if exists vendor_deliveries_select on public.vendor_deliveries;
create policy vendor_deliveries_select on public.vendor_deliveries for select to authenticated
  using (auth.uid() = owner_user_id or auth.uid() = recipient_user_id);
-- 업체만 생성(본인 소유로).
drop policy if exists vendor_deliveries_insert on public.vendor_deliveries;
create policy vendor_deliveries_insert on public.vendor_deliveries for insert to authenticated
  with check (auth.uid() = owner_user_id);
-- 업체는 전달 내용 수정, 수신자는 수령 표시(상태) 가능.
drop policy if exists vendor_deliveries_update on public.vendor_deliveries;
create policy vendor_deliveries_update on public.vendor_deliveries for update to authenticated
  using (auth.uid() = owner_user_id or auth.uid() = recipient_user_id)
  with check (auth.uid() = owner_user_id or auth.uid() = recipient_user_id);
-- 업체만 삭제.
drop policy if exists vendor_deliveries_delete on public.vendor_deliveries;
create policy vendor_deliveries_delete on public.vendor_deliveries for delete to authenticated
  using (auth.uid() = owner_user_id);

-- 3) 스토리지 정책 — 업체는 본인 uid 폴더에 업로드, 열람은 전달 멤버십(소유자/수신자)으로.
drop policy if exists "vendor_deliveries_upload_own" on storage.objects;
create policy "vendor_deliveries_upload_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'vendor-deliveries' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "vendor_deliveries_delete_own" on storage.objects;
create policy "vendor_deliveries_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'vendor-deliveries' and (storage.foldername(name))[1] = auth.uid()::text);

-- 열람(서명 URL 발급에 필요한 SELECT) — 이 파일이 등록된 전달의 소유자/수신자만.
drop policy if exists "vendor_deliveries_read_member" on storage.objects;
create policy "vendor_deliveries_read_member" on storage.objects for select to authenticated
  using (
    bucket_id = 'vendor-deliveries' and exists (
      select 1 from public.vendor_deliveries d
      where (auth.uid() = d.owner_user_id or auth.uid() = d.recipient_user_id)
        and storage.objects.name = any (d.file_paths)
    )
  );

comment on table public.vendor_deliveries is '업체→소비자 결과물(보정본 등) 전달. 프라이빗 버킷 vendor-deliveries + 서명 URL, 접근은 행 멤버십으로 게이팅.';
