-- audit A3: 조회수 카운터 어뷰징 완화. 기존 RPC 는 호출마다 무조건 +1 이라 같은 사용자가
-- 새로고침/루프로 무한 인플레가 가능했다. 로그인 사용자는 (대상,사용자,KST일) 1회만
-- 집계되도록 dedup 한다. (anon 은 세션/IP 식별이 없어 dedup 불가 → 종전대로 집계.
--  완전 차단은 엣지 rate-limit/세션 필요 — 별도 트랙.)
create table if not exists public.view_events (
  target_kind text not null,            -- 'post' | 'place'
  target_id   text not null,
  user_id     uuid not null,
  day         date not null default (now() at time zone 'Asia/Seoul')::date,
  primary key (target_kind, target_id, user_id, day)
);
alter table public.view_events enable row level security;
-- 정책 없음: SECURITY DEFINER 함수(소유자 권한)로만 기록, 클라 직접 접근 차단.

create or replace function public.increment_post_views(p_post_id uuid)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid(); v_cnt int;
begin
  if v_uid is not null then
    insert into public.view_events(target_kind, target_id, user_id)
    values ('post', p_post_id::text, v_uid)
    on conflict do nothing;
    get diagnostics v_cnt = row_count;
    if v_cnt = 0 then return; end if;  -- 오늘 이미 본 사용자 → 중복 집계 안 함
  end if;
  update public.community_posts set views = coalesce(views, 0) + 1 where id = p_post_id;
end; $function$;

create or replace function public.increment_place_views(p_place_id text)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid(); v_cnt int;
begin
  if v_uid is not null then
    insert into public.view_events(target_kind, target_id, user_id)
    values ('place', p_place_id, v_uid)
    on conflict do nothing;
    get diagnostics v_cnt = row_count;
    if v_cnt = 0 then return; end if;
  end if;
  update public.places set view_count = coalesce(view_count, 0) + 1 where place_id = p_place_id::uuid;
end; $function$;
