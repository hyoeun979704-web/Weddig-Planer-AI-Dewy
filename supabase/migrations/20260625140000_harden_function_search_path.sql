-- search_path 하드닝 — function_search_path_mutable 보안 권고(21개 함수) 해소.
-- 역할(role)의 가변 search_path 를 통한 객체 해석 하이재킹을 막기 위해 각 함수의
-- search_path 를 public, pg_temp 로 고정한다. (pg_catalog 는 항상 암묵 우선이라 내장
-- 함수 해석은 그대로, public 객체 비정규 참조도 그대로 동작 — 행동 보존.)
-- 참고: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

alter function public._biz_category_to_place(text) set search_path = public, pg_temp;
alter function public._jsonb_to_text_arr(jsonb) set search_path = public, pg_temp;
alter function public._place_norm_name(text) set search_path = public, pg_temp;
alter function public.compute_place_completeness(uuid) set search_path = public, pg_temp;
alter function public.derive_wedding_persona(user_wedding_settings) set search_path = public, pg_temp;
alter function public.fn_sync_exclusion_on_delete() set search_path = public, pg_temp;
alter function public.fn_update_lowest_price() set search_path = public, pg_temp;
alter function public.fn_update_updated_at() set search_path = public, pg_temp;
alter function public.force_pending_on_insert() set search_path = public, pg_temp;
alter function public.invitation_photo_paths(jsonb) set search_path = public, pg_temp;
alter function public.lock_place_inquiry_body() set search_path = public, pg_temp;
alter function public.lock_place_review_body() set search_path = public, pg_temp;
alter function public.places_normalize_region() set search_path = public, pg_temp;
alter function public.protect_moderation_fields() set search_path = public, pg_temp;
alter function public.refresh_completeness_self() set search_path = public, pg_temp;
alter function public.refresh_place_completeness() set search_path = public, pg_temp;
alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.tg_user_wedding_settings_derive_persona() set search_path = public, pg_temp;
alter function public.tg_user_wedding_settings_sync_venue_region() set search_path = public, pg_temp;
alter function public.touch_ai_prompts_updated_at() set search_path = public, pg_temp;
alter function public.touch_device_tokens_updated_at() set search_path = public, pg_temp;
