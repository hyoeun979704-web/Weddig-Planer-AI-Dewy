-- 포인트/하트 경제 보호: 내부 헬퍼 함수의 직접 호출 권한 차단.
--
-- 문제: earn_points / earn_hearts / spend_points / spend_hearts 가 anon +
-- authenticated 에게 EXECUTE 가 부여돼 있고, 함수 안에 소유권(인가) 검사가 없었다.
-- 즉 누구나(로그아웃 상태 포함) 임의 계정에 무제한 포인트·하트를 발급하거나
-- 타인의 잔액을 차감할 수 있었다. 하트는 카카오페이로 충전하는 유료 재화라 치명적.
--
-- 해결:
--   * earn_points / earn_hearts / spend_points 는 클라이언트가 직접 호출하지 않음
--     (내부 SECURITY DEFINER 함수 또는 edge service_role 만 사용) → anon/authenticated
--     /public 회수. 내부 정의자(postgres) 호출과 service_role(edge) 호출은 영향 없음.
--   * spend_hearts 는 클라이언트(authenticated, 청첩장 발행)도 호출 → 회수 불가.
--     대신 '본인 하트만 사용' 소유권 가드 추가 + anon 차단. service_role 대행은 허용.

REVOKE EXECUTE ON FUNCTION public.earn_points(uuid, integer, text, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.earn_hearts(uuid, integer, text, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.spend_points(uuid, integer, text, uuid) FROM anon, authenticated, public;

REVOKE EXECUTE ON FUNCTION public.spend_hearts(uuid, integer, text, uuid) FROM anon, public;

CREATE OR REPLACE FUNCTION public.spend_hearts(p_user_id uuid, p_amount integer, p_reason text, p_ref_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(success boolean, balance_after integer, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_new_balance INTEGER;
  v_current INTEGER;
BEGIN
  -- 인증 사용자는 본인 하트만 사용 가능. service_role(서버, auth.uid() IS NULL)은 대행 허용.
  IF auth.uid() IS NOT NULL AND p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'cannot spend hearts for other users';
  END IF;

  IF p_amount <= 0 THEN
    RETURN QUERY SELECT FALSE, 0, 'invalid_amount'::TEXT;
    RETURN;
  END IF;

  -- 한 번의 UPDATE로 잔액 충분 검사 + 차감 (atomic)
  UPDATE public.user_hearts
    SET balance = balance - p_amount,
        total_spent = total_spent + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id
      AND balance >= p_amount
    RETURNING balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    SELECT balance INTO v_current FROM public.user_hearts WHERE user_id = p_user_id;
    RETURN QUERY SELECT FALSE, COALESCE(v_current, 0), 'insufficient_balance'::TEXT;
    RETURN;
  END IF;

  INSERT INTO public.heart_transactions (user_id, amount, reason, ref_id, balance_after)
    VALUES (p_user_id, -p_amount, p_reason, p_ref_id, v_new_balance);

  RETURN QUERY SELECT TRUE, v_new_balance, 'ok'::TEXT;
END;
$function$;
