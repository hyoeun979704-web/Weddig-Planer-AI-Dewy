-- Round 16 P0 회귀 fix — persona_mode INSERT 분기에서 column DEFAULT('standard_bride')
-- 가 v_auto 와 다른 경우 marker 가 잘못 스탬프되어 persona_mode 가 영구 stuck.
--
-- 회귀 시나리오 (DB 실측 확인):
--   INSERT (user_id, wedding_style='small', ceremony_type='small_real')
--   → v_auto = 'small_intimate'
--   → NEW.persona_mode = DEFAULT 'standard_bride'
--   → NEW.persona_mode IS DISTINCT FROM v_auto = TRUE
--   → marker 마킹 + NEW.persona_mode 그대로 'standard_bride' 유지
--   → 사용자가 small_intimate 페르소나 못 받음 + 후속 UPDATE 도 marker 때문에 derive 안 됨
--
-- 동일 회귀: pregnant=true / wedding_region 명시 등 첫 INSERT 모든 비표준 케이스.
-- WeddingInfoSetupModal.saveWeddingSettings INSERT 분기 + SetAsWeddingVenueButton 영향.
--
-- Fix (옵션 C): INSERT 분기에서 항상 NEW.persona_mode := v_auto, marker 안 만짐.
-- view-as override 는 사용자가 이미 user_wedding_settings 행이 있는 상태에서 (UPDATE
-- 경로) 만 발생하므로 INSERT 에서 marker 안 만들어도 view-as 기능 영향 X.

CREATE OR REPLACE FUNCTION public.tg_user_wedding_settings_derive_persona()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_auto TEXT := public.derive_wedding_persona(NEW);
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- INSERT 는 항상 자동 derive (column DEFAULT 와 명시 override 구분 불가능).
    -- marker 도 안 만짐 (view-as override 는 후속 UPDATE 에서 set).
    NEW.persona_mode := v_auto;
    NEW.persona_mode_overridden_at := NULL;
    RETURN NEW;
  END IF;

  -- UPDATE: persona_mode_overridden_at 가 NOT NULL 이면 override 영구 보존.
  -- client 가 명시적으로 NULL 로 reset 하면 override 해제 + v_auto 적용.
  IF OLD.persona_mode_overridden_at IS NOT NULL
     AND NEW.persona_mode_overridden_at IS NOT NULL THEN
    -- override 활성 + 유지 → persona_mode 도 client patch 따름 (또는 OLD 유지).
    -- client 가 다른 컬럼만 update 한 경우 NEW.persona_mode = OLD.persona_mode → 보존.
    RETURN NEW;
  END IF;

  IF OLD.persona_mode_overridden_at IS NOT NULL
     AND NEW.persona_mode_overridden_at IS NULL THEN
    -- override 해제 → 자동 derive 복귀.
    NEW.persona_mode := v_auto;
    RETURN NEW;
  END IF;

  -- override 비활성 (marker NULL). client 가 명시 override 시도하면 marker 자동 마킹.
  IF NEW.persona_mode IS DISTINCT FROM v_auto
     AND NEW.persona_mode IS DISTINCT FROM OLD.persona_mode THEN
    -- client 가 자동 derive 와 다른 값으로 명시 변경 → override 시작.
    NEW.persona_mode_overridden_at := NOW();
    RETURN NEW;
  END IF;

  -- 평범한 UPDATE — 자동 derive 적용.
  NEW.persona_mode := v_auto;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tg_user_wedding_settings_derive_persona() IS
  'v3 (Round 16 P0 fix): INSERT 항상 v_auto, marker NULL. UPDATE 만 marker 기반 override 보존.';
