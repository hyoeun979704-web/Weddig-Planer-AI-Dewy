-- advisor 경고 fix: function_search_path_mutable
-- guest_list_items_set_updated_at 트리거 함수에 search_path 를 고정해
-- 검색 경로 변조에 의한 권한 상승 가능성을 차단.
--
-- 검증: supabase advisors 에서 동일 함수가 더 이상 listed 되지 않음.
-- 동일 패턴의 다른 기존 함수들(fn_update_updated_at, compute_place_completeness 등)에도
-- 동일 경고가 있지만 그건 별도 PR 범위.

CREATE OR REPLACE FUNCTION public.guest_list_items_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
