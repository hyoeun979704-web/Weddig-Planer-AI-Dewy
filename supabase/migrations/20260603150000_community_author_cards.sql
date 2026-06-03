-- 커뮤니티 작성자 "정체성" 공개 read 모델.
-- 다른 사용자에게 노출하는 것은 안전 필드만: 닉네임(가명) + 웨딩스타일 + 역할(예신/예랑).
-- 예식일/지역/이메일 등 민감정보는 절대 노출하지 않는다.
alter table public.profiles add column if not exists community_nickname text;

create or replace view public.community_author_cards
with (security_invoker = false) as
select
  u.user_id,
  pr.community_nickname,
  ws.wedding_style,
  ws.role
from (
  select user_id from public.profiles
  union
  select user_id from public.user_wedding_settings
) u
left join public.profiles pr on pr.user_id = u.user_id
left join public.user_wedding_settings ws on ws.user_id = u.user_id;

grant select on public.community_author_cards to anon, authenticated;
