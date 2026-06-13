-- places 어드민 쓰기 정책 누락 복구.
-- 증상: AdminPlaceEdit 가 client(anon JWT)로 `places` 를 직접 update 하는데
-- places 에는 public read(using true) 2개뿐 쓰기 정책이 0개 → RLS 가 모든
-- insert/update/delete 를 거부. PostgREST update 는 매칭 0행이어도 에러를 안
-- 내므로 어드민은 "저장됨"을 보지만 실제로는 반영 안 됨(조용한 실패).
-- 운영자(admin 역할)에게 전체 쓰기 권한 부여. 멱등 작성.

DROP POLICY IF EXISTS "places admin write" ON public.places;
CREATE POLICY "places admin write" ON public.places
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
