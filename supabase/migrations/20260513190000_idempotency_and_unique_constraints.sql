-- ============================================================================
-- 결제·적립 견고화: 멱등성과 정합성 안전장치
-- ----------------------------------------------------------------------------
-- (P0-2) payments.payment_key UNIQUE — 같은 카카오 tid 로 두 번 INSERT 되어
--        하트가 중복 적립되는 경로를 DB 차원에서 차단.
-- (P1-6) starter 패키지(charge_starter)는 평생 1회만 허용되어야 함. 동시 2개
--        결제창에서 둘 다 승인되어도 두 번째 INSERT 가 실패하도록 partial
--        unique index 를 둠.
-- (P0-3) 가입 보너스 백필을 RAW INSERT 가 아닌 earn_points RPC 로 일관 적립
--        시키는 단발 마이그레이션. (이번 머지 시점에 실제 적용할 대상은 없음
--        — 이미 PR #48 백필 완료. 정합성 유지 목적의 멱등 마이그레이션.)
-- ============================================================================

-- 1) payments.payment_key UNIQUE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='payments_payment_key_uniq'
  ) THEN
    -- 기존 데이터에 동일 payment_key 가 있으면 unique index 가 실패하므로,
    -- 동일 payment_key 중 가장 오래된 한 행만 남기고 정리한다.
    DELETE FROM public.payments p
    WHERE p.id NOT IN (
      SELECT DISTINCT ON (payment_key) id
      FROM public.payments
      WHERE payment_key IS NOT NULL
      ORDER BY payment_key, created_at NULLS LAST
    )
    AND p.payment_key IN (
      SELECT payment_key FROM public.payments
      WHERE payment_key IS NOT NULL
      GROUP BY payment_key HAVING count(*) > 1
    );

    CREATE UNIQUE INDEX payments_payment_key_uniq
      ON public.payments (payment_key)
      WHERE payment_key IS NOT NULL;
  END IF;
END$$;

-- 2) 첫 충전 한정 (charge_starter) 평생 1회 보장 — partial unique
CREATE UNIQUE INDEX IF NOT EXISTS heart_transactions_charge_starter_once
  ON public.heart_transactions (user_id)
  WHERE reason = 'charge_starter';

-- 3) point_transactions 평생 1회 reason 들도 DB 차원으로 보호
CREATE UNIQUE INDEX IF NOT EXISTS point_transactions_one_shot_reasons
  ON public.point_transactions (user_id, reason)
  WHERE reason IN (
    'signup_bonus',
    'signup_bonus_backfill',
    'first_post',
    'first_like',
    'first_comment',
    'tutorial_master',
    'referral_redeemed'
  );
