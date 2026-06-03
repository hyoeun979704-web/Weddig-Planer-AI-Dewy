-- #2: community_author_cards 를 "실제 커뮤니티 참여자(글/댓글 작성자)" 로 한정.
-- 기존엔 profiles ∪ user_wedding_settings 라 글 한 번 안 쓴 전체 가입자의 role·style 까지
-- anon 에 노출됐다. 작성자만 노출하도록 좁힌다.
create or replace view public.community_author_cards
with (security_invoker = false) as
select
  u.user_id,
  pr.community_nickname,
  ws.wedding_style,
  ws.role
from (
  select user_id from public.community_posts
  union
  select user_id from public.community_comments
) u
left join public.profiles pr on pr.user_id = u.user_id
left join public.user_wedding_settings ws on ws.user_id = u.user_id;

grant select on public.community_author_cards to anon, authenticated;

-- #6: 좋아요/댓글 집계 트리거에 UPDATE 분기 추가. 행의 post_id 가 바뀌면
-- 기존 글 -1, 새 글 +1 로 재조정(현재 경로는 없지만 미래 회귀 방지).
create or replace function public.sync_post_like_count()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if tg_op = 'INSERT' then
    update public.community_posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.community_posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  elsif tg_op = 'UPDATE' and new.post_id is distinct from old.post_id then
    update public.community_posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
    update public.community_posts set like_count = like_count + 1 where id = new.post_id;
  end if;
  return null;
end;
$$;
drop trigger if exists trg_sync_post_like_count on public.community_likes;
create trigger trg_sync_post_like_count
  after insert or delete or update on public.community_likes
  for each row execute function public.sync_post_like_count();

create or replace function public.sync_post_comment_count()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if tg_op = 'INSERT' then
    update public.community_posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.community_posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  elsif tg_op = 'UPDATE' and new.post_id is distinct from old.post_id then
    update public.community_posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
    update public.community_posts set comment_count = comment_count + 1 where id = new.post_id;
  end if;
  return null;
end;
$$;
drop trigger if exists trg_sync_post_comment_count on public.community_comments;
create trigger trg_sync_post_comment_count
  after insert or delete or update on public.community_comments
  for each row execute function public.sync_post_comment_count();
