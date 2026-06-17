-- 멀티지점 + 같은-좌표/같은-업체 중복등록 차단 (Phase 1: 백엔드, 전부 additive·멱등).
--
-- 결정(docs/260617_multibranch_geodedup_plan.md):
--   · 한 계정이 여러 지점 소유 가능(places.owner_user_id 에 UNIQUE 없음 — storage 차원 이미 가능).
--   · 중복 판정은 '오프라인 매장 유무'로 분기:
--       - 매장 있음 → 좌표 반경(~50m, 같은 category) 중복 차단
--       - 매장 없음(스냅·축의대·축가 등) → 이름(정규화)+시/도+구/군 중복 차단
--   · 매칭이 카탈로그(owner 없음)면 차단 대신 claim 유도, 타 owner 면 차단, 본인이면 '이미 등록' 안내.
--   · 가드는 SECURITY DEFINER RPC 서버측(클라 검사만으론 우회 가능).
--
-- 기존 upsert_my_listing(7-arg)/get_my_listing 은 건드리지 않는다(무중단). 프론트는 Phase 2에서
-- get_my_listings / create_my_branch / update_my_branch 로 전환.

-- ── 1) 컬럼 (additive) ───────────────────────────────────────────────
alter table public.places
  add column if not exists has_offline_store boolean not null default true,
  add column if not exists road_address text,
  add column if not exists lat double precision,
  add column if not exists lng double precision;

create index if not exists idx_places_owner_created on public.places(owner_user_id, created_at);
create index if not exists idx_places_geo on public.places(lat, lng) where lat is not null and lng is not null;

-- ── 2) 정규화 이름(매장無 텍스트 매칭용) ─────────────────────────────
create or replace function public._place_norm_name(p text)
returns text language sql immutable as $$
  select regexp_replace(lower(coalesce(trim(p), '')), '\s+', '', 'g');
$$;

-- ── 3) 중복 후보 탐색 (폼 사전경고 + 서버가드 공용) ──────────────────
-- 반환: 매칭되는 기존 place 1건(없으면 0행). owner_user_id/data_source 로 호출부가 claim/차단 분기.
create or replace function public.find_duplicate_place(
  p_category text,
  p_name text,
  p_city text,
  p_district text,
  p_has_offline_store boolean,
  p_lat double precision,
  p_lng double precision,
  p_exclude uuid default null
)
returns table(place_id uuid, name text, owner_user_id uuid, data_source text)
language plpgsql security definer set search_path = public stable as $$
begin
  if p_has_offline_store and p_lat is not null and p_lng is not null then
    -- 좌표 반경 50m (haversine, 지구반경 6371km). 같은 업종만.
    return query
      select p.place_id, p.name, p.owner_user_id, p.data_source
      from public.places p
      where p.category = p_category
        and p.lat is not null and p.lng is not null
        and p.moderation_status in ('approved', 'pending')
        and (p_exclude is null or p.place_id <> p_exclude)
        and 6371000 * acos(least(1, greatest(-1,
              sin(radians(p_lat)) * sin(radians(p.lat))
            + cos(radians(p_lat)) * cos(radians(p.lat)) * cos(radians(p.lng - p_lng))
            ))) <= 50
      order by p.owner_user_id nulls last, p.created_at
      limit 1;
  else
    -- 이름(정규화)+지역 매칭. 같은 업종만.
    return query
      select p.place_id, p.name, p.owner_user_id, p.data_source
      from public.places p
      where p.category = p_category
        and p.moderation_status in ('approved', 'pending')
        and (p_exclude is null or p.place_id <> p_exclude)
        and public._place_norm_name(p.name) = public._place_norm_name(p_name)
        and coalesce(p.city, '') = coalesce(p_city, '')
        and coalesce(p.district, '') = coalesce(p_district, '')
      order by p.owner_user_id nulls last, p.created_at
      limit 1;
  end if;
end;
$$;

-- ── 4) 내 지점 전체 조회(지점 선택기) ───────────────────────────────
create or replace function public.get_my_listings()
returns setof public.places
language sql security definer set search_path = public stable as $$
  select * from public.places where owner_user_id = auth.uid() order by created_at;
$$;

-- ── 5) 새 지점 등록 (중복 가드 내장) ────────────────────────────────
create or replace function public.create_my_branch(
  p_name text,
  p_description text,
  p_city text,
  p_district text,
  p_main_image_url text,
  p_min_price int,
  p_tags text[],
  p_has_offline_store boolean default true,
  p_road_address text default null,
  p_lat double precision default null,
  p_lng double precision default null
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_bp record;
  v_category text;
  v_dup record;
  v_place_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'auth_required');
  end if;
  select * into v_bp from public.business_profiles where user_id = v_uid;
  if v_bp.id is null or v_bp.approval_status <> 'approved' then
    return jsonb_build_object('ok', false, 'error', 'not_approved');
  end if;
  if coalesce(trim(p_name), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'name_required');
  end if;

  v_category := public._biz_category_to_place(v_bp.service_category);

  -- 중복 가드 (서버 권위)
  select * into v_dup from public.find_duplicate_place(
    v_category, p_name, p_city, p_district, p_has_offline_store, p_lat, p_lng, null
  );
  if found then
    if v_dup.owner_user_id is null then
      return jsonb_build_object('ok', false, 'reason', 'claimable',
        'place_id', v_dup.place_id, 'name', v_dup.name);
    elsif v_dup.owner_user_id = v_uid then
      return jsonb_build_object('ok', false, 'reason', 'duplicate_own',
        'place_id', v_dup.place_id, 'name', v_dup.name);
    else
      return jsonb_build_object('ok', false, 'reason', 'duplicate_other',
        'place_id', v_dup.place_id, 'name', v_dup.name);
    end if;
  end if;

  v_place_id := gen_random_uuid();
  insert into public.places (
    place_id, category, owner_user_id, name, description, city, district,
    main_image_url, min_price, tags, has_offline_store, road_address, lat, lng,
    is_active, moderation_status, is_partner, data_source
  ) values (
    v_place_id, v_category, v_uid, p_name, p_description, p_city, p_district,
    p_main_image_url, p_min_price, p_tags, p_has_offline_store, p_road_address, p_lat, p_lng,
    false, 'pending', true, 'business'
  );
  return jsonb_build_object('ok', true, 'place_id', v_place_id);
end;
$$;

-- ── 6) 지점 수정 (소유자 확인 + 주소변경 시 self 제외 중복 재검사) ──
create or replace function public.update_my_branch(
  p_place_id uuid,
  p_name text,
  p_description text,
  p_city text,
  p_district text,
  p_main_image_url text,
  p_min_price int,
  p_tags text[],
  p_has_offline_store boolean default true,
  p_road_address text default null,
  p_lat double precision default null,
  p_lng double precision default null
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_category text;
  v_dup record;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'auth_required');
  end if;
  select owner_user_id, category into v_owner, v_category
  from public.places where place_id = p_place_id;
  if v_owner is null or v_owner <> v_uid then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  -- 다른 기존 지점과 충돌하는 위치/이름으로 바꾸려는 경우 차단(자기 자신 제외).
  select * into v_dup from public.find_duplicate_place(
    v_category, p_name, p_city, p_district, p_has_offline_store, p_lat, p_lng, p_place_id
  );
  if found then
    if v_dup.owner_user_id is null then
      return jsonb_build_object('ok', false, 'reason', 'claimable',
        'place_id', v_dup.place_id, 'name', v_dup.name);
    else
      return jsonb_build_object('ok', false, 'reason',
        case when v_dup.owner_user_id = v_uid then 'duplicate_own' else 'duplicate_other' end,
        'place_id', v_dup.place_id, 'name', v_dup.name);
    end if;
  end if;

  update public.places set
    name = p_name, description = p_description, city = p_city, district = p_district,
    main_image_url = p_main_image_url, min_price = p_min_price, tags = p_tags,
    has_offline_store = p_has_offline_store, road_address = p_road_address,
    lat = coalesce(p_lat, lat), lng = coalesce(p_lng, lng),
    is_active = false, moderation_status = 'pending', updated_at = now()
  where place_id = p_place_id and owner_user_id = v_uid;

  return jsonb_build_object('ok', true, 'place_id', p_place_id);
end;
$$;

-- ── 7) 권한 ─────────────────────────────────────────────────────────
revoke all on function public.find_duplicate_place(text,text,text,text,boolean,double precision,double precision,uuid) from public;
revoke all on function public.get_my_listings() from public;
revoke all on function public.create_my_branch(text,text,text,text,text,int,text[],boolean,text,double precision,double precision) from public;
revoke all on function public.update_my_branch(uuid,text,text,text,text,text,int,text[],boolean,text,double precision,double precision) from public;
grant execute on function public.find_duplicate_place(text,text,text,text,boolean,double precision,double precision,uuid) to authenticated;
grant execute on function public.get_my_listings() to authenticated;
grant execute on function public.create_my_branch(text,text,text,text,text,int,text[],boolean,text,double precision,double precision) to authenticated;
grant execute on function public.update_my_branch(uuid,text,text,text,text,text,int,text[],boolean,text,double precision,double precision) to authenticated;

comment on function public.find_duplicate_place is '중복 업체 탐색 — 매장有=좌표50m, 매장無=이름+지역. owner_user_id 로 claim/차단 분기.';
comment on function public.create_my_branch is '새 지점 등록(중복 가드 내장). 반환 reason: claimable/duplicate_own/duplicate_other.';
