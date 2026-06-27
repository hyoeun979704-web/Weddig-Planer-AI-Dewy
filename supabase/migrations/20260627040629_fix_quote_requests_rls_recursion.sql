-- 버그: quote_requests ↔ quote_request_targets RLS 상호참조로 무한재귀
-- (client_error_logs: "infinite recursion detected in policy for relation quote_requests",
--  useQuoteResponses load failed — 업체(타깃)측 견적 조회가 깨짐).
--   quote_requests_select        USING ... EXISTS(SELECT FROM quote_request_targets ...)
--   quote_request_targets_select USING ... EXISTS(SELECT FROM quote_requests ...)
-- → 두 정책이 서로의 RLS 를 재호출 → 사이클. 한쪽의 교차검사를 SECURITY DEFINER 헬퍼로
-- 빼서(=그 테이블 RLS 우회) 사이클을 끊는다. 인가 의미는 동일(타깃 본인만 매칭).
-- auth.uid() 는 SECURITY DEFINER 안에서도 호출자 JWT 기준이라 권한 상승 없음.

CREATE OR REPLACE FUNCTION public.is_quote_target(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.quote_request_targets t
    WHERE t.request_id = p_request_id
      AND t.owner_user_id = auth.uid()
  );
$function$;

DROP POLICY IF EXISTS quote_requests_select ON public.quote_requests;
CREATE POLICY quote_requests_select ON public.quote_requests
  FOR SELECT
  USING (user_id = auth.uid() OR public.is_quote_target(id));
