-- 타입 안전: upsert_my_listing 의 선택적(nullable) 파라미터에 DEFAULT 부여 → 생성 타입이
-- optional 로 잡혀 클라가 값을 생략(undefined)할 수 있다(as-any 제거 시 컴파일 타임 체크).
-- 동작/본문 불변 — 시그니처에 DEFAULT 만 추가(p_name 만 필수 유지).
create or replace function public.upsert_my_listing(
  p_name text,
  p_description text default null, p_city text default null, p_district text default null,
  p_main_image_url text default null, p_min_price integer default null, p_tags text[] default '{}',
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

  v_channel := lower(coalesce(p_inquiry_channel, 'chat'));
  IF v_channel NOT IN ('chat','url','phone') THEN v_channel := 'chat'; END IF;
  v_url := CASE WHEN p_inquiry_url ~ '^https?://' THEN btrim(p_inquiry_url) ELSE NULL END;
  v_phone := nullif(btrim(regexp_replace(coalesce(p_inquiry_phone,''), '[^0-9+()\- ]', '', 'g')), '');
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
