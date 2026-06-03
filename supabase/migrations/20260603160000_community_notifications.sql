-- 커뮤니티 알림: 내 글/댓글에 반응이 오면 기록. 트리거로 생성, 본인 행동은 제외.
create table if not exists public.community_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null,
  actor_id uuid not null,
  type text not null check (type in ('comment','reply','post_like','comment_like')),
  post_id uuid references public.community_posts(id) on delete cascade,
  comment_id uuid references public.community_comments(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_comm_notif_recipient on public.community_notifications(recipient_id, created_at desc);
create index if not exists idx_comm_notif_unread on public.community_notifications(recipient_id) where read_at is null;

alter table public.community_notifications enable row level security;
create policy "notif owner read" on public.community_notifications
  for select to authenticated using (recipient_id = auth.uid());
create policy "notif owner update" on public.community_notifications
  for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy "notif owner delete" on public.community_notifications
  for delete to authenticated using (recipient_id = auth.uid());

-- 댓글/답글 알림
create or replace function public.notify_on_comment()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare v_post_author uuid; v_parent_author uuid;
begin
  if new.parent_comment_id is not null then
    select user_id into v_parent_author from public.community_comments where id = new.parent_comment_id;
    if v_parent_author is not null and v_parent_author <> new.user_id then
      insert into public.community_notifications(recipient_id, actor_id, type, post_id, comment_id)
      values (v_parent_author, new.user_id, 'reply', new.post_id, new.id);
    end if;
  else
    select user_id into v_post_author from public.community_posts where id = new.post_id;
    if v_post_author is not null and v_post_author <> new.user_id then
      insert into public.community_notifications(recipient_id, actor_id, type, post_id, comment_id)
      values (v_post_author, new.user_id, 'comment', new.post_id, new.id);
    end if;
  end if;
  return null;
end;
$$;
drop trigger if exists trg_notify_on_comment on public.community_comments;
create trigger trg_notify_on_comment after insert on public.community_comments
  for each row execute function public.notify_on_comment();

-- 글 좋아요 알림
create or replace function public.notify_on_post_like()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare v_author uuid;
begin
  select user_id into v_author from public.community_posts where id = new.post_id;
  if v_author is not null and v_author <> new.user_id then
    insert into public.community_notifications(recipient_id, actor_id, type, post_id)
    values (v_author, new.user_id, 'post_like', new.post_id);
  end if;
  return null;
end;
$$;
drop trigger if exists trg_notify_on_post_like on public.community_likes;
create trigger trg_notify_on_post_like after insert on public.community_likes
  for each row execute function public.notify_on_post_like();

-- 댓글 좋아요 알림
create or replace function public.notify_on_comment_like()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare v_author uuid; v_post uuid;
begin
  select user_id, post_id into v_author, v_post from public.community_comments where id = new.comment_id;
  if v_author is not null and v_author <> new.user_id then
    insert into public.community_notifications(recipient_id, actor_id, type, post_id, comment_id)
    values (v_author, new.user_id, 'comment_like', v_post, new.comment_id);
  end if;
  return null;
end;
$$;
drop trigger if exists trg_notify_on_comment_like on public.community_comment_likes;
create trigger trg_notify_on_comment_like after insert on public.community_comment_likes
  for each row execute function public.notify_on_comment_like();
