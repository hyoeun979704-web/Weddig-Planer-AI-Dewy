-- 1) 대표자 계정에 admin 역할 부여
-- hyoeun979704@gmail.com (Google OAuth 가입된 본인 계정)
-- 이미 가입되어 있어야 함. 가입 전 실행 시 INSERT 결과 0건.

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'hyoeun979704@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 2) dress_samples: 어드민이 INSERT/UPDATE/DELETE 가능하도록 RLS 추가
-- (기존 SELECT 정책은 유지: 누구나 활성 샘플 조회 가능)

CREATE POLICY "Admins can insert dress_samples"
ON public.dress_samples FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update dress_samples"
ON public.dress_samples FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete dress_samples"
ON public.dress_samples FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) Storage dress-samples 버킷: 어드민 업로드/삭제 허용

CREATE POLICY "Admins can insert dress-samples objects"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'dress-samples'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update dress-samples objects"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'dress-samples'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete dress-samples objects"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'dress-samples'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);
