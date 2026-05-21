-- 게시글 조회수 증가 RPC.
--
-- community_posts UPDATE 는 작성자(owner)만 가능하도록 RLS 가 걸려 있어, 다른
-- 사용자가 글을 열어도 views 가 증가하지 않았다(트렌딩/인기 지표가 0에 고정).
-- SECURITY DEFINER 로 RLS 를 우회해 views 만 1 증가시킨다. 다른 컬럼은 건드리지
-- 않으므로 권한 상승 위험 없음.

CREATE OR REPLACE FUNCTION public.increment_post_views(p_post_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.community_posts
  SET views = COALESCE(views, 0) + 1
  WHERE id = p_post_id;
$$;

REVOKE ALL ON FUNCTION public.increment_post_views(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_post_views(UUID) TO authenticated, anon;

COMMENT ON FUNCTION public.increment_post_views(UUID) IS
  '게시글 조회수 +1 (RLS 우회, views 컬럼만 갱신).';
