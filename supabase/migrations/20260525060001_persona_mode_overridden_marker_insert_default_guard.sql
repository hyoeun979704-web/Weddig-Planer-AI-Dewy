-- 보정: persona_mode column DEFAULT('standard_bride') 와 명시 override 구분.
--
-- 이전 마이그레이션(20260525060000) 의 INSERT 분기는 NEW.persona_mode IS NOT NULL 만
-- 체크해서, INSERT 에 persona_mode 미지정 시 column DEFAULT 가 채워주는 'standard_bride'
-- 를 명시 override 로 오인 → 모든 새 행이 자동 marker 마킹됨. derive 영구 차단 회귀.
--
-- 해결: v_auto 와 다른 명시 값일 때만 override 로 간주. v_auto 와 같은 값이면 DEFAULT
-- 거나 우연히 일치하는 케이스이므로 marker 안 찍음 (어차피 결과는 동일).

CREATE OR REPLACE FUNCTION public.tg_user_wedding_settings_derive_persona()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_auto TEXT := public.derive_wedding_persona(NEW);
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.persona_mode IS NULL THEN
      NEW.persona_mode := v_auto;
    ELSIF NEW.persona_mode IS DISTINCT FROM v_auto AND NEW.persona_mode_overridden_at IS NULL THEN
      NEW.persona_mode_overridden_at := NOW();
    END IF;
    RETURN NEW;
  END IF;

  -- 명시적 reset: client 가 marker 를 NULL 로 set → override 해제 + 자동 derive 복귀.
  IF NEW.persona_mode_overridden_at IS NULL AND OLD.persona_mode_overridden_at IS NOT NULL THEN
    NEW.persona_mode := v_auto;
    RETURN NEW;
  END IF;

  -- marker NOT NULL → override 영구 보존. 단 persona_mode 가 같이 바뀌면 그 값으로 갱신 + marker NOW().
  IF NEW.persona_mode_overridden_at IS NOT NULL THEN
    IF NEW.persona_mode IS NULL THEN
      NEW.persona_mode := v_auto;
    END IF;
    IF NEW.persona_mode IS DISTINCT FROM OLD.persona_mode
       AND NEW.persona_mode_overridden_at IS NOT DISTINCT FROM OLD.persona_mode_overridden_at THEN
      NEW.persona_mode_overridden_at := NOW();
    END IF;
    RETURN NEW;
  END IF;

  -- marker NULL + persona_mode 가 새 값으로 바뀜 → 새 override 의도. marker NOW() 자동 마킹.
  IF NEW.persona_mode IS DISTINCT FROM OLD.persona_mode THEN
    IF NEW.persona_mode IS NULL THEN
      NEW.persona_mode := v_auto;
    ELSE
      NEW.persona_mode_overridden_at := NOW();
    END IF;
    RETURN NEW;
  END IF;

  -- 그 외 → 자동 derive.
  NEW.persona_mode := v_auto;
  RETURN NEW;
END;
$$;
