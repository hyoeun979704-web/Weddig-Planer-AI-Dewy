-- 글 목록에서 글마다 좋아요/댓글 수를 별도 count 쿼리로 가져오던 N+1 제거.
-- community_posts 에 집계 컬럼을 두고 트리거로 동기화한다.
alter table public.community_posts add column if not exists like_count integer not null default 0;
alter table public.community_posts add column if not exists comment_count integer not null default 0;

-- 기존 데이터 백필
update public.community_posts p set
  like_count = coalesce((select count(*) from public.community_likes l where l.post_id = p.id), 0),
  comment_count = coalesce((select count(*) from public.community_comments c where c.post_id = p.id), 0);

-- 좋아요 수 트리거
create or replace function public.sync_post_like_count()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if tg_op = 'INSERT' then
    update public.community_posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.community_posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;
drop trigger if exists trg_sync_post_like_count on public.community_likes;
create trigger trg_sync_post_like_count
  after insert or delete on public.community_likes
  for each row execute function public.sync_post_like_count();

-- 댓글 수 트리거 (대댓글 포함 전체)
create or replace function public.sync_post_comment_count()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if tg_op = 'INSERT' then
    update public.community_posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.community_posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;
drop trigger if exists trg_sync_post_comment_count on public.community_comments;
create trigger trg_sync_post_comment_count
  after insert or delete on public.community_comments
  for each row execute function public.sync_post_comment_count();
