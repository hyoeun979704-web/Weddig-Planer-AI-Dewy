-- ============================================================================
-- 공개 텍스트 방명록(축하 한마디) — 인터랙티브 스크롤 청첩장용.
--
-- 기존 스키마엔 공개 텍스트 방명록 테이블이 없다(invitation_guest_photos = 사진,
-- invitation_rsvp.message = 소유자 전용 읽기). 스크롤 청첩장의 "축하 한마디"는
-- 누구나 읽고 쓸 수 있는 공개 텍스트 방명록이라 전용 테이블을 추가한다.
-- ============================================================================

create table if not exists public.invitation_guestbook (
  id            uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  name          text not null default '익명',
  message       text not null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_inv_guestbook_inv_created
  on public.invitation_guestbook (invitation_id, created_at desc);

-- RLS: 공개 read + 공개 insert, 삭제는 청첩장 소유자만.
alter table public.invitation_guestbook enable row level security;

drop policy if exists gb_public_read on public.invitation_guestbook;
create policy gb_public_read on public.invitation_guestbook
  for select to anon, authenticated
  using (true);

drop policy if exists gb_public_insert on public.invitation_guestbook;
create policy gb_public_insert on public.invitation_guestbook
  for insert to anon, authenticated
  with check (
    char_length(message) between 1 and 500
    and char_length(name) <= 40
  );

drop policy if exists gb_owner_delete on public.invitation_guestbook;
create policy gb_owner_delete on public.invitation_guestbook
  for delete to authenticated
  using (
    exists (
      select 1 from public.invitations i
      where i.id = invitation_id
        and i.user_id = auth.uid()   -- invitations 소유자 컬럼 = user_id
    )
  );
