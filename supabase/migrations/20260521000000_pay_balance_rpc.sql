-- 잔금 결제 원자화 — "잔금" 항목 INSERT 와 원본의 balance 해제를 한 트랜잭션에서 처리.
--
-- 기존 클라이언트는 2단계(INSERT 후 UPDATE)로 처리해 네트워크 단절 시
-- 잔금 항목만 남고 원본은 미정산 상태로 남는 고아 데이터가 가능했다.
-- 이 RPC 는 함수 본문이 하나의 트랜잭션이므로 둘 다 성공하거나 둘 다 롤백된다.

CREATE OR REPLACE FUNCTION public.pay_balance(
  p_item_id UUID,
  p_pay_date TEXT,
  p_payment_method TEXT,
  p_memo TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item public.budget_items%ROWTYPE;
  v_new_id UUID;
BEGIN
  -- 본인 소유 + 미정산 잔금이 있는 항목만 대상으로 잠금 후 처리.
  SELECT * INTO v_item
  FROM public.budget_items
  WHERE id = p_item_id
    AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'item_not_found_or_forbidden';
  END IF;

  IF COALESCE(v_item.has_balance, false) IS NOT TRUE
     OR v_item.balance_amount IS NULL THEN
    RAISE EXCEPTION 'no_outstanding_balance';
  END IF;

  INSERT INTO public.budget_items (
    user_id, category, title, amount, paid_by,
    payment_stage, payment_method, item_date, memo,
    has_balance, balance_amount, balance_due_date
  ) VALUES (
    v_item.user_id,
    v_item.category,
    v_item.title || ' 잔금',
    v_item.balance_amount,
    v_item.paid_by,
    'balance',
    p_payment_method,
    p_pay_date,
    p_memo,
    false,
    NULL,
    NULL
  )
  RETURNING id INTO v_new_id;

  UPDATE public.budget_items
  SET has_balance = false,
      balance_amount = NULL,
      balance_due_date = NULL
  WHERE id = v_item.id;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.pay_balance(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pay_balance(UUID, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.pay_balance(UUID, TEXT, TEXT, TEXT) IS
  '잔금 결제: 잔금 항목 INSERT + 원본 balance 해제를 원자적으로 처리. 새 항목 id 반환.';
