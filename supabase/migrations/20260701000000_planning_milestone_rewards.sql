-- 2-B 진행연동 리워드 — 스펜드가 아니라 "준비 진행"(DB 검증 가능 마일스톤)에 하트 보상.
-- 일일 클릭 미션(claim_mission_bonus)과 달리, 실제 준비 행동을 1회씩 durable 보상해
-- 신규 사용자 유인·리텐션을 만든다. 친구추천(check_referral_milestones) 패턴 그대로:
-- SECURITY DEFINER + earn_hearts 재사용 + 멱등(EXISTS 가드 + partial unique index).
--
-- 마일스톤(각 30하트, 사용자당 1회):
--   planning_budget    : 예산 설정(total_budget>0)
--   planning_venue     : 예식장 등록(wedding_venue_place_id)
--   planning_quote     : 첫 견적 요청
--   planning_checklist : 체크리스트 5개 이상 완료

-- 보상 1회 보장(안전망) — 같은 사유+사용자(ref_id=user) 중복 적립 차단.
CREATE UNIQUE INDEX IF NOT EXISTS heart_tx_planning_once
  ON public.heart_transactions (reason, ref_id)
  WHERE reason IN ('planning_budget', 'planning_venue', 'planning_quote', 'planning_checklist');

CREATE OR REPLACE FUNCTION public.check_planning_milestones()
RETURNS TABLE (
  budget_done        boolean,
  venue_done         boolean,
  quote_done         boolean,
  checklist_done     boolean,
  budget_rewarded    boolean,
  venue_rewarded     boolean,
  quote_rewarded     boolean,
  checklist_rewarded boolean,
  granted            integer
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_user   UUID := auth.uid();
  v_amt    CONSTANT INTEGER := 30;
  v_bd boolean; v_vd boolean; v_qd boolean; v_cd boolean;
  v_br boolean; v_vr boolean; v_qr boolean; v_cr boolean;
  v_granted integer := 0;
BEGIN
  IF v_user IS NULL THEN
    RETURN QUERY SELECT false,false,false,false,false,false,false,false,0; RETURN;
  END IF;

  -- 진행 여부(DB 검증 — 클라 주장 아님).
  SELECT EXISTS(SELECT 1 FROM public.budget_settings
    WHERE user_id = v_user AND COALESCE(total_budget,0) > 0) INTO v_bd;
  SELECT EXISTS(SELECT 1 FROM public.user_wedding_settings
    WHERE user_id = v_user AND wedding_venue_place_id IS NOT NULL) INTO v_vd;
  SELECT EXISTS(SELECT 1 FROM public.quote_requests
    WHERE user_id = v_user) INTO v_qd;
  SELECT (SELECT count(*) FROM public.user_schedule_items
    WHERE user_id = v_user AND completed) >= 5 INTO v_cd;

  -- 이미 지급 여부(ref_id = user).
  SELECT EXISTS(SELECT 1 FROM public.heart_transactions
    WHERE reason='planning_budget' AND ref_id=v_user) INTO v_br;
  SELECT EXISTS(SELECT 1 FROM public.heart_transactions
    WHERE reason='planning_venue' AND ref_id=v_user) INTO v_vr;
  SELECT EXISTS(SELECT 1 FROM public.heart_transactions
    WHERE reason='planning_quote' AND ref_id=v_user) INTO v_qr;
  SELECT EXISTS(SELECT 1 FROM public.heart_transactions
    WHERE reason='planning_checklist' AND ref_id=v_user) INTO v_cr;

  -- 완료 & 미지급이면 지급(1회). EXISTS 가드로 unique index 예외 회피.
  IF v_bd AND NOT v_br THEN
    PERFORM public.earn_hearts(v_user, v_amt, 'planning_budget', v_user);
    v_br := true; v_granted := v_granted + v_amt;
  END IF;
  IF v_vd AND NOT v_vr THEN
    PERFORM public.earn_hearts(v_user, v_amt, 'planning_venue', v_user);
    v_vr := true; v_granted := v_granted + v_amt;
  END IF;
  IF v_qd AND NOT v_qr THEN
    PERFORM public.earn_hearts(v_user, v_amt, 'planning_quote', v_user);
    v_qr := true; v_granted := v_granted + v_amt;
  END IF;
  IF v_cd AND NOT v_cr THEN
    PERFORM public.earn_hearts(v_user, v_amt, 'planning_checklist', v_user);
    v_cr := true; v_granted := v_granted + v_amt;
  END IF;

  RETURN QUERY SELECT v_bd,v_vd,v_qd,v_cd, v_br,v_vr,v_qr,v_cr, v_granted;
END;
$$;

REVOKE ALL ON FUNCTION public.check_planning_milestones() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_planning_milestones() TO authenticated;

-- 적립 사유 라벨(usePoints REASON_LABELS 와 동기화 — 클라도 함께 갱신).
COMMENT ON FUNCTION public.check_planning_milestones() IS
  '준비 진행 마일스톤(예산·식장·첫견적·체크리스트5) 1회 하트 보상. 멱등·서버검증.';
