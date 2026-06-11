-- 사용자 노출 정렬: 큐레이션(필터) 결과 안에서 이달의 베프(2) > 프렌즈(1) > 일반(0),
-- 같은 순위에선 기존 data_completeness(데이터 많은 순) 정렬 유지.
-- partner_rank 는 business_profiles.partner_tier 변경 트리거가 동기화한다.

ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS partner_rank smallint NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.sync_place_partner_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.places
  SET is_partner = (NEW.partner_tier IN ('friends', 'bff')),
      partner_rank = CASE NEW.partner_tier
        WHEN 'bff' THEN 2
        WHEN 'friends' THEN 1
        ELSE 0
      END
  WHERE owner_user_id = NEW.user_id;
  RETURN NEW;
END;
$$;
