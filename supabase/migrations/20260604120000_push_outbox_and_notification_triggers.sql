-- 푸시 알림 활성화: outbox 대기열 + 시나리오 트리거 + 사용자 알림 설정.
--
-- ⚠️ 이 마이그레이션은 리포에 커밋만 하고, 프로덕션 적용은 운영자가 직접 한다.
-- 활성화 선행조건(docs/push-notification-setup.md):
--   1) device_tokens 마이그레이션 적용(20260519050000) + Firebase(FCM) 시크릿 등록
--   2) send-push / dispatch-push edge function 배포
--   3) (선택) pg_cron + pg_net 확장 → 1분 주기로 dispatch-push 호출 (파일 하단 참고)
--
-- 설계: 트리거는 FCM 을 직접 호출하지 않고 push_outbox 에 적재만 한다.
-- dispatch-push(cron)가 사용자 설정/마케팅 동의/조용한 시간/빈도 상한을 적용해 발송한다.

-- ─── 1) 사용자별 알림 설정 (서버 발송 토글 존중) ────────────────────────────
-- 설정 화면(src/pages/Notifications.tsx)이 로그인 사용자에 한해 upsert.
create table if not exists public.user_notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push boolean not null default true,
  marketing boolean not null default false,
  chat boolean not null default true,
  schedule boolean not null default true,
  favorite boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.user_notification_prefs enable row level security;
drop policy if exists "notif prefs owner all" on public.user_notification_prefs;
create policy "notif prefs owner all" on public.user_notification_prefs
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─── 2) 푸시 발송 대기열(outbox) ────────────────────────────────────────────
create table if not exists public.push_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  body text not null,
  route text,
  -- service(=push 토글만) : community/partner/schedule
  -- marketing(=marketing 동의 필요) : vendor/event
  category text not null check (category in ('community','partner','schedule','vendor','event')),
  dedup_key text unique,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists idx_push_outbox_unsent
  on public.push_outbox(created_at) where sent_at is null;
create index if not exists idx_push_outbox_user_sent
  on public.push_outbox(user_id, sent_at);
alter table public.push_outbox enable row level security;
-- 일반 사용자 접근 불필요. 정책 없음 = 모든 일반 롤 차단. service role(엣지함수)만 접근.

-- ─── 3) enqueue 헬퍼 ────────────────────────────────────────────────────────
create or replace function public.enqueue_push(
  p_user_id uuid, p_title text, p_body text, p_route text,
  p_category text, p_dedup_key text default null
) returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if p_user_id is null then return; end if;
  insert into public.push_outbox(user_id, title, body, route, category, dedup_key)
  values (p_user_id, p_title, p_body, p_route, p_category, p_dedup_key)
  on conflict (dedup_key) do nothing;
end; $$;

-- 커플 파트너 조회(연결 상태만).
create or replace function public.partner_of(p_user uuid)
returns uuid language sql stable security definer set search_path to 'public' as $$
  select case when user_id = p_user then partner_user_id else user_id end
  from public.couple_links
  where status = 'linked' and (user_id = p_user or partner_user_id = p_user)
  limit 1;
$$;

-- ─── 4) 시나리오 트리거 ─────────────────────────────────────────────────────

-- (A) 커뮤니티: 내 글/댓글 반응 → 글 작성자에게. (community_notifications 적재 직후)
create or replace function public.outbox_on_community_notif()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare v_body text;
begin
  v_body := case new.type
    when 'comment' then '내 글에 댓글을 남겼어요'
    when 'reply' then '내 댓글에 답글을 남겼어요'
    when 'post_like' then '내 글을 좋아해요'
    when 'comment_like' then '내 댓글을 좋아해요'
    else '커뮤니티에 새 활동이 있어요' end;
  perform public.enqueue_push(
    new.recipient_id, '커뮤니티 알림', v_body,
    case when new.post_id is not null
         then '/community/' || new.post_id::text
         else '/community/notifications' end,
    'community', 'commnotif:' || new.id::text);
  return null;
end; $$;
drop trigger if exists trg_outbox_community on public.community_notifications;
create trigger trg_outbox_community after insert on public.community_notifications
  for each row execute function public.outbox_on_community_notif();

-- (B) 파트너 활동 — 예산 등록.
create or replace function public.outbox_on_budget_item()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  perform public.enqueue_push(public.partner_of(new.user_id),
    '파트너 활동', '파트너가 예산을 등록했어요', '/budget',
    'partner', 'budget:' || new.id::text);
  return null;
end; $$;
drop trigger if exists trg_outbox_budget on public.budget_items;
create trigger trg_outbox_budget after insert on public.budget_items
  for each row execute function public.outbox_on_budget_item();

-- (B) 파트너 활동 — 일기 작성.
create or replace function public.outbox_on_diary()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  perform public.enqueue_push(public.partner_of(new.author_id),
    '파트너 활동', '파트너가 새 일기를 작성했어요', '/couple-diary',
    'partner', 'diary:' || new.id::text);
  return null;
end; $$;
drop trigger if exists trg_outbox_diary on public.couple_diary;
create trigger trg_outbox_diary after insert on public.couple_diary
  for each row execute function public.outbox_on_diary();

-- (B) 파트너 활동 — 찜(업체류만).
create or replace function public.outbox_on_favorite()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.item_type in ('venue','studio','dress','makeup','honeymoon','jewelry',
                        'appliance','suit','hanbok','invitation_venues') then
    perform public.enqueue_push(public.partner_of(new.user_id),
      '파트너 활동', '파트너가 업체를 찜했어요', '/favorites',
      'partner', 'fav:' || new.id::text);
  end if;
  return null;
end; $$;
drop trigger if exists trg_outbox_favorite on public.favorites;
create trigger trg_outbox_favorite after insert on public.favorites
  for each row execute function public.outbox_on_favorite();

-- (C) 찜한 업체 — 새 쿠폰(승인 노출 시). INSERT 또는 승인으로 전환되는 UPDATE.
create or replace function public.outbox_on_business_coupon()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.moderation_status = 'approved' and coalesce(new.is_active, true)
     and (tg_op = 'INSERT' or old.moderation_status is distinct from 'approved') then
    insert into public.push_outbox(user_id, title, body, route, category, dedup_key)
    select f.user_id, '찜한 업체 소식', '찜한 업체에 새 쿠폰이 등록됐어요',
           '/coupons', 'vendor', 'coupon:' || new.id::text || ':' || f.user_id::text
    from public.favorites f
    where f.item_id = new.place_id::text
    on conflict (dedup_key) do nothing;
  end if;
  return null;
end; $$;
drop trigger if exists trg_outbox_coupon on public.business_coupons;
create trigger trg_outbox_coupon after insert or update of moderation_status, is_active
  on public.business_coupons
  for each row execute function public.outbox_on_business_coupon();

-- (C) 찜한 업체 — 새 이벤트(승인 노출 시).
create or replace function public.outbox_on_business_event()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.moderation_status = 'approved'
     and (tg_op = 'INSERT' or old.moderation_status is distinct from 'approved') then
    insert into public.push_outbox(user_id, title, body, route, category, dedup_key)
    select f.user_id, '찜한 업체 소식', '찜한 업체에 새 이벤트가 열렸어요',
           '/vendor/' || new.place_id::text, 'vendor',
           'bizevent:' || new.id::text || ':' || f.user_id::text
    from public.favorites f
    where f.item_id = new.place_id::text
    on conflict (dedup_key) do nothing;
  end if;
  return null;
end; $$;
drop trigger if exists trg_outbox_bizevent on public.business_events;
create trigger trg_outbox_bizevent after insert or update of moderation_status
  on public.business_events
  for each row execute function public.outbox_on_business_event();

-- (C) 찜한 업체 — 새 후기.
create or replace function public.outbox_on_place_review()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  insert into public.push_outbox(user_id, title, body, route, category, dedup_key)
  select f.user_id, '찜한 업체 소식', '찜한 업체에 새 후기가 올라왔어요',
         '/vendor/' || new.place_id::text, 'vendor',
         'review:' || new.review_id::text || ':' || f.user_id::text
  from public.favorites f
  where f.item_id = new.place_id::text
  on conflict (dedup_key) do nothing;
  return null;
end; $$;
drop trigger if exists trg_outbox_review on public.place_reviews;
create trigger trg_outbox_review after insert on public.place_reviews
  for each row execute function public.outbox_on_place_review();

-- (D) 이벤트 — 신규 라이브 프로모션을 타깃 사용자에게.
create or replace function public.outbox_on_promo_event()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.status = 'live'
     and (tg_op = 'INSERT' or old.status is distinct from 'live') then
    insert into public.push_outbox(user_id, title, body, route, category, dedup_key)
    select s.user_id, '새 이벤트', new.title,
           coalesce(new.cta_path, '/events'), 'event', 'promo:' || new.id::text || ':' || s.user_id::text
    from public.user_wedding_settings s
    where (new.target_personas is null or array_length(new.target_personas, 1) is null
           or s.persona_mode = any (new.target_personas))
      and (new.target_styles is null or array_length(new.target_styles, 1) is null
           or s.wedding_style = any (new.target_styles))
    on conflict (dedup_key) do nothing;
  end if;
  return null;
end; $$;
drop trigger if exists trg_outbox_promo on public.promotional_events;
create trigger trg_outbox_promo after insert or update of status
  on public.promotional_events
  for each row execute function public.outbox_on_promo_event();

-- ─── 5) (선택) pg_cron 으로 dispatch-push 1분 주기 호출 ─────────────────────
-- 아래는 운영자가 secret(서비스 롤 키)·함수 URL 을 채운 뒤 별도로 실행한다.
-- 확장과 외부 호출이 필요하므로 자동 적용하지 않는다.
--
--   create extension if not exists pg_cron;
--   create extension if not exists pg_net;
--   select cron.schedule('dewy-dispatch-push', '* * * * *', $cron$
--     select net.http_post(
--       url := 'https://<project-ref>.supabase.co/functions/v1/dispatch-push',
--       headers := jsonb_build_object(
--         'Content-Type','application/json',
--         'Authorization','Bearer <SERVICE_ROLE_KEY>'),
--       body := '{}'::jsonb)
--   $cron$);
