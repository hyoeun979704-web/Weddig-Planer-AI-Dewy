-- 보안 하드닝: 함수 search_path 고정 (Supabase advisor `function_search_path_mutable` WARN 해소)
--
-- 가변 search_path 는 public 스키마 객체 섀도잉을 통한 권한상승/주입 위험이 있다(0011 lint).
-- 아래 트리거·유틸 함수에 고정 search_path 를 설정한다. 동작은 불변이다 — 모두 public 테이블과
-- 표준 함수만 사용하며, 고정값에 public/extensions 를 포함해 기존 객체 해석이 그대로 유지된다.
-- (pg_catalog 는 항상 암묵적으로 우선 검색되므로 별도 명시 불필요.)
--
-- 시그니처는 라이브 DB(pg_proc identity arguments)에서 확인한 값과 일치한다.

ALTER FUNCTION public._biz_category_to_place(p_cat text) SET search_path = public, extensions;
ALTER FUNCTION public._jsonb_to_text_arr(p jsonb) SET search_path = public, extensions;
ALTER FUNCTION public._place_norm_name(p text) SET search_path = public, extensions;
ALTER FUNCTION public.compute_place_completeness(p_place_id uuid) SET search_path = public, extensions;
ALTER FUNCTION public.derive_wedding_persona(s user_wedding_settings) SET search_path = public, extensions;
ALTER FUNCTION public.fn_sync_exclusion_on_delete() SET search_path = public, extensions;
ALTER FUNCTION public.fn_update_lowest_price() SET search_path = public, extensions;
ALTER FUNCTION public.fn_update_updated_at() SET search_path = public, extensions;
ALTER FUNCTION public.force_pending_on_insert() SET search_path = public, extensions;
ALTER FUNCTION public.invitation_photo_paths(layout jsonb) SET search_path = public, extensions;
ALTER FUNCTION public.lock_place_inquiry_body() SET search_path = public, extensions;
ALTER FUNCTION public.lock_place_review_body() SET search_path = public, extensions;
ALTER FUNCTION public.places_normalize_region() SET search_path = public, extensions;
ALTER FUNCTION public.protect_moderation_fields() SET search_path = public, extensions;
ALTER FUNCTION public.refresh_completeness_self() SET search_path = public, extensions;
ALTER FUNCTION public.refresh_place_completeness() SET search_path = public, extensions;
ALTER FUNCTION public.set_updated_at() SET search_path = public, extensions;
ALTER FUNCTION public.tg_user_wedding_settings_derive_persona() SET search_path = public, extensions;
ALTER FUNCTION public.tg_user_wedding_settings_sync_venue_region() SET search_path = public, extensions;
