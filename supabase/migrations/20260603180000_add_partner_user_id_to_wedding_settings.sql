-- redeem_couple_invite RPC 와 일부 커플 기능이 user_wedding_settings.partner_user_id 를
-- 전제하지만 실제 컬럼이 누락되어 있었음 → 초대코드 redeem 시 RPC 가 "column does not
-- exist" 로 롤백되어 파트너 연동이 깨져 있었다. 코드가 전제하는 컬럼을 추가해 정합성 복구.
alter table public.user_wedding_settings
  add column if not exists partner_user_id uuid;

create index if not exists idx_uws_partner on public.user_wedding_settings(partner_user_id);

-- 이미 연결된 커플(couple_links.status='linked') 의 양쪽 설정 백필.
update public.user_wedding_settings s
  set partner_user_id = l.partner_user_id
  from public.couple_links l
  where l.status = 'linked' and s.user_id = l.user_id and l.partner_user_id is not null;

update public.user_wedding_settings s
  set partner_user_id = l.user_id
  from public.couple_links l
  where l.status = 'linked' and s.user_id = l.partner_user_id;
