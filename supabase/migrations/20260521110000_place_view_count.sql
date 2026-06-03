-- 업체 상세페이지 조회수 — 마케팅 대시보드 지표용.
-- places.view_count 추가(additive). 소비자가 상세페이지를 열면 증가(RLS 우회 RPC).
-- 업체 소유자는 get_my_listing 으로 본인 place 의 view_count 를 읽는다.

ALTER TABLE public.places ADD COLUMN IF NOT EXISTS view_count INT NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_place_views(p_place_id TEXT)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.places SET view_count = COALESCE(view_count, 0) + 1 WHERE place_id = p_place_id::uuid;
$$;

REVOKE ALL ON FUNCTION public.increment_place_views(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_place_views(TEXT) TO authenticated, anon;

COMMENT ON FUNCTION public.increment_place_views(TEXT) IS '업체 상세 조회수 +1 (view_count 만 갱신).';
