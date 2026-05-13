-- ============================================================================
-- 커뮤니티 첫 액션 + 튜토리얼 진행도 적립
-- ----------------------------------------------------------------------------
-- 첫 게시물 작성: 500P (평생 1회)
-- 첫 좋아요:     100P (평생 1회)
-- 첫 댓글:      200P (평생 1회)
-- 페이지별 튜토리얼 완료: 100P (튜토리얼당 1회)
-- 5개 튜토리얼 모두 완료: 추가 500P (전체 완료 보너스)
--
-- 트리거가 적립 RPC 호출 중 예외를 던지면 INSERT 자체가 롤백되므로
-- 모든 적립은 EXCEPTION 블록으로 감싸 본문 INSERT 가 막히지 않도록 함.
-- ============================================================================

-- 1. tutorial_completions 테이블 (튜토리얼 완료 기록)
CREATE TABLE public.tutorial_completions (
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_id      text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tour_id)
);

ALTER TABLE public.tutorial_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_tutorial_completions" ON public.tutorial_completions
  FOR SELECT USING (auth.uid() = user_id);

-- 2. complete_tutorial RPC
-- 페이지 가이드 5개: feature_schedule, feature_budget, feature_ai,
--                  feature_community, feature_premium
CREATE OR REPLACE FUNCTION public.complete_tutorial(p_tour_id text)
RETURNS TABLE (
  awarded         boolean,
  base_amount     integer,
  bonus_amount    integer,
  total_completed integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid := auth.uid();
  v_inserted   boolean := false;
  v_row_count  integer;
  v_base       integer := 0;
  v_bonus      integer := 0;
  v_total      integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.tutorial_completions (user_id, tour_id)
  VALUES (v_user_id, p_tour_id)
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  v_inserted := v_row_count > 0;

  IF v_inserted THEN
    v_base := CASE WHEN p_tour_id LIKE 'feature_%' THEN 100 ELSE 0 END;
    IF v_base > 0 THEN
      PERFORM public.earn_points(v_user_id, v_base, p_tour_id, NULL);
    END IF;

    -- 5개 feature 튜토리얼 모두 완료 시 보너스 500P
    SELECT COUNT(*) INTO v_total
    FROM public.tutorial_completions
    WHERE user_id = v_user_id AND tour_id LIKE 'feature_%';

    IF v_total = 5 AND NOT EXISTS (
      SELECT 1 FROM public.point_transactions
      WHERE user_id = v_user_id AND reason = 'tutorial_master'
    ) THEN
      v_bonus := 500;
      PERFORM public.earn_points(v_user_id, v_bonus, 'tutorial_master', NULL);
    END IF;
  ELSE
    SELECT COUNT(*) INTO v_total
    FROM public.tutorial_completions
    WHERE user_id = v_user_id AND tour_id LIKE 'feature_%';
  END IF;

  RETURN QUERY SELECT v_inserted, v_base, v_bonus, v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_tutorial(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_tutorial(text) TO authenticated;

-- 3. 커뮤니티 첫 액션 보상 트리거 함수
CREATE OR REPLACE FUNCTION public.reward_first_community_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reason  text := TG_ARGV[0];
  v_amount  integer := TG_ARGV[1]::integer;
  v_exists  boolean;
BEGIN
  BEGIN
    SELECT EXISTS(
      SELECT 1 FROM public.point_transactions
      WHERE user_id = NEW.user_id AND reason = v_reason
    ) INTO v_exists;

    IF NOT v_exists THEN
      PERFORM public.earn_points(NEW.user_id, v_amount, v_reason, NEW.id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- 적립 실패가 본문 INSERT 를 막지 않도록 함
    RAISE WARNING 'reward_first_community_action failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- 4. community_posts INSERT 트리거 — 첫 게시물 500P
CREATE TRIGGER trg_reward_first_post
  AFTER INSERT ON public.community_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.reward_first_community_action('first_post', '500');

-- 5. community_likes INSERT 트리거 — 첫 좋아요 100P
CREATE TRIGGER trg_reward_first_like
  AFTER INSERT ON public.community_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.reward_first_community_action('first_like', '100');

-- 6. community_comments INSERT 트리거 — 첫 댓글 200P
CREATE TRIGGER trg_reward_first_comment
  AFTER INSERT ON public.community_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.reward_first_community_action('first_comment', '200');
