-- 친구추천 이벤트: 초대로 가입한 회원(referee)이 3미션 완료 시 referee·referrer
-- 양쪽에 하트 100개 (각 referral 당 1회). 미션: ① 결혼정보 입력 ② 커뮤니티 글 1
-- ③ 업체 후기 1. earn_hearts(기존 RPC) 재사용. 멱등 작성.

-- 보상 1회 보장(안전망): 같은 referral 에 같은 사유로 중복 적립 차단.
CREATE UNIQUE INDEX IF NOT EXISTS heart_tx_referral_event_once
  ON public.heart_transactions (reason, ref_id)
  WHERE reason IN ('referral_event_invitee', 'referral_event_inviter');

-- 현재 사용자(referee) 기준으로 미션 진행도를 계산하고, 모두 완료면 양쪽에 100하트
-- 지급(1회). 진행도를 반환해 클라가 이벤트 카드에 표시한다.
CREATE OR REPLACE FUNCTION public.check_referral_milestones()
RETURNS TABLE (
  has_referral     boolean,
  wedding_info_done boolean,
  community_done    boolean,
  review_done       boolean,
  rewarded          boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_referee   UUID := auth.uid();
  v_referral  RECORD;
  v_wi BOOLEAN := false;
  v_cp BOOLEAN := false;
  v_rv BOOLEAN := false;
  v_already BOOLEAN := false;
BEGIN
  IF v_referee IS NULL THEN
    RETURN QUERY SELECT false, false, false, false, false; RETURN;
  END IF;

  SELECT id, referrer_user_id INTO v_referral
  FROM public.referrals WHERE referee_user_id = v_referee LIMIT 1;

  IF v_referral.id IS NULL THEN
    RETURN QUERY SELECT false, false, false, false, false; RETURN;
  END IF;

  -- 이미 지급됐는지(referee 기준).
  SELECT EXISTS(
    SELECT 1 FROM public.heart_transactions
    WHERE reason = 'referral_event_invitee' AND ref_id = v_referral.id
  ) INTO v_already;

  -- ① 결혼정보: 날짜 또는 지역을 실제로 입력(미정 플래그 제외).
  SELECT EXISTS(
    SELECT 1 FROM public.user_wedding_settings
    WHERE user_id = v_referee
      AND ((wedding_date IS NOT NULL AND COALESCE(wedding_date_tbd,false) = false)
        OR (wedding_region IS NOT NULL AND COALESCE(wedding_region_tbd,false) = false))
  ) INTO v_wi;

  -- ② 커뮤니티 글 1개 이상.
  SELECT EXISTS(SELECT 1 FROM public.community_posts WHERE user_id = v_referee) INTO v_cp;

  -- ③ 업체 후기 1개 이상.
  SELECT EXISTS(SELECT 1 FROM public.place_reviews WHERE user_id = v_referee) INTO v_rv;

  IF NOT v_already AND v_wi AND v_cp AND v_rv THEN
    PERFORM public.earn_hearts(v_referee, 100, 'referral_event_invitee', v_referral.id);
    PERFORM public.earn_hearts(v_referral.referrer_user_id, 100, 'referral_event_inviter', v_referral.id);
    v_already := true;
  END IF;

  RETURN QUERY SELECT true, v_wi, v_cp, v_rv, v_already;
END;
$$;
REVOKE ALL ON FUNCTION public.check_referral_milestones() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_referral_milestones() TO authenticated;
