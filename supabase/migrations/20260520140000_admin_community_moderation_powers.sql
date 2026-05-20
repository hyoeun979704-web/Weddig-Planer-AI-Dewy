-- 어드민 강제 삭제 권한
--
-- 신고 처리 결과 부적절한 콘텐츠를 어드민이 직접 삭제할 수 있어야 한다.
-- 기존 RLS 는 "본인 글만 본인이 삭제" 만 허용하므로, 어드민에게 추가 정책을 부여.
-- 기존 사용자 자기 삭제 정책은 그대로 두고 OR 로 확장하는 게 아니라,
-- RLS 는 정책끼리 OR 로 합쳐지므로 새 정책만 추가하면 된다.

-- ============================================================================
-- 게시글
-- ============================================================================

CREATE POLICY "admin_delete_any_post"
ON public.community_posts
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 어드민이 부적절 콘텐츠를 잠그기 위해 UPDATE 도 가능하게 (제목·본문 마스킹 등).
-- 사용자 본인 수정은 별도 정책이 이미 있고, 충돌 없이 OR 합쳐진다.
CREATE POLICY "admin_update_any_post"
ON public.community_posts
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- 댓글
-- ============================================================================

CREATE POLICY "admin_delete_any_comment"
ON public.community_comments
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin_update_any_comment"
ON public.community_comments
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

COMMENT ON POLICY "admin_delete_any_post" ON public.community_posts IS
  '신고 처리 결과 운영진이 부적절 콘텐츠를 강제 삭제할 수 있도록.';
