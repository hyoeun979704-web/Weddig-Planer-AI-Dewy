-- 입점(클레임) 업체가 문의 받는 방식을 직접 고르게 한다.
--   chat  = 인앱 문의 시트(기본)
--   url   = 사장님이 적은 외부 URL(카톡 오픈채팅·네이버 예약·구글폼 등)
--   phone = 사장님이 적은 전화번호
-- url/phone 값은 places 에 함께 저장하고, 상세페이지 '문의하기'가 channel 로 분기.
alter table public.places
  add column if not exists inquiry_channel text not null default 'chat',
  add column if not exists inquiry_url text,
  add column if not exists inquiry_phone text;

alter table public.places drop constraint if exists places_inquiry_channel_chk;
alter table public.places
  add constraint places_inquiry_channel_chk
  check (inquiry_channel in ('chat','url','phone'));

-- upsert_my_listing 에 문의 채널 파라미터 추가(기존 호출 호환 위해 DEFAULT).
-- 보안: url 은 http(s) 스킴만 허용(javascript:/data: 등 차단), phone 은 안전 문자만.
create or replace function public.upsert_my_listing(
  p_name text, p_description text, p_city text, p_district text,
  p_main_image_url text, p_min_price integer, p_tags text[],
  p_inquiry_channel text default 'chat',
  p_inquiry_url text default null,
  p_inquiry_phone text default null
)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
DECLARE
  v_uid UUID := auth.uid();
  v_bp RECORD;
  v_place_id UUID;
  v_category TEXT;
  v_channel TEXT;
  v_url TEXT;
  v_phone TEXT;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'auth_required'); END IF;
  SELECT * INTO v_bp FROM public.business_profiles WHERE user_id = v_uid;
  IF v_bp.id IS NULL OR v_bp.approval_status <> 'approved' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_approved'); END IF;
  v_category := public._biz_category_to_place(v_bp.service_category);

  -- 문의 채널 정규화/살균
  v_channel := lower(coalesce(p_inquiry_channel, 'chat'));
  IF v_channel NOT IN ('chat','url','phone') THEN v_channel := 'chat'; END IF;
  v_url := CASE WHEN p_inquiry_url ~ '^https?://' THEN btrim(p_inquiry_url) ELSE NULL END;
  v_phone := nullif(btrim(regexp_replace(coalesce(p_inquiry_phone,''), '[^0-9+()\- ]', '', 'g')), '');
  -- 고른 채널에 값이 없으면 안전하게 인앱 채팅으로 강등(죽은 버튼 방지)
  IF v_channel = 'url' AND v_url IS NULL THEN v_channel := 'chat'; END IF;
  IF v_channel = 'phone' AND v_phone IS NULL THEN v_channel := 'chat'; END IF;

  SELECT place_id INTO v_place_id FROM public.places WHERE owner_user_id = v_uid LIMIT 1;
  IF v_place_id IS NULL THEN
    v_place_id := gen_random_uuid();
    INSERT INTO public.places (
      place_id, category, owner_user_id, name, description, city, district,
      main_image_url, min_price, tags, is_active, moderation_status, is_partner, data_source,
      inquiry_channel, inquiry_url, inquiry_phone
    ) VALUES (
      v_place_id, v_category, v_uid, p_name, p_description, p_city, p_district,
      p_main_image_url, p_min_price, p_tags, false, 'pending', true, 'business',
      v_channel, v_url, v_phone
    );
  ELSE
    UPDATE public.places SET
      name = p_name, description = p_description, city = p_city, district = p_district,
      main_image_url = p_main_image_url, min_price = p_min_price, tags = p_tags,
      inquiry_channel = v_channel, inquiry_url = v_url, inquiry_phone = v_phone,
      is_active = false, moderation_status = 'pending', updated_at = now()
    WHERE place_id = v_place_id AND owner_user_id = v_uid;
  END IF;
  RETURN jsonb_build_object('ok', true, 'place_id', v_place_id);
END; $function$;
