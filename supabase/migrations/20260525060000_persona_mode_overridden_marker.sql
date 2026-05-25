-- persona_mode override 영구 보존 — 별도 marker 컬럼 + trigger 수정.
--
-- 배경 (Round 16):
--   기존 trigger 의 override 가드 `IF NEW.persona_mode IS DISTINCT FROM OLD.persona_mode`
--   는 단 1회 UPDATE 에만 유효. 사용자가 "view-as luxury_hotel" 같은 override 저장 후
--   다른 컬럼(예: guest_count) 만 UPDATE 하면 client patch 에 persona_mode 없어
--   NEW.persona_mode = OLD.persona_mode → trigger fall-through → v_auto 가 override 덮어씀.
--   override 단명.
--
-- 해결: persona_mode_overridden_at TIMESTAMPTZ marker 컬럼 도입.
--   - NOT NULL 이면 override 영구 보존 (v_auto 무시).
--   - NULL 이면 기존 derive 로직 적용 (자동 분류).
--   - 명시적 reset 은 client 가 persona_mode_overridden_at 를 NULL 로 set 하면 됨.

-- ───────────────────────────────────────────────────────────────────────────
-- 1) 컬럼 추가
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE public.user_wedding_settings
  ADD COLUMN IF NOT EXISTS persona_mode_overridden_at TIMESTAMPTZ;

COMMENT ON COLUMN public.user_wedding_settings.persona_mode_overridden_at IS
  '사용자가 명시적으로 persona_mode 를 override 한 시각. NOT NULL 이면 trigger 가 자동 derive 를 스킵하고 override 영구 보존. NULL 로 reset 하면 다음 UPDATE 부터 자동 derive 복귀.';

-- ───────────────────────────────────────────────────────────────────────────
-- 2) trigger function 수정 — marker 컬럼 인지
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.tg_user_wedding_settings_derive_persona()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_auto TEXT := public.derive_wedding_persona(NEW);
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- INSERT: persona_mode 명시 → override 의도. marker 가 비어 있으면 자동으로 NOW() 마킹.
    IF NEW.persona_mode IS NOT NULL AND NEW.persona_mode_overridden_at IS NULL THEN
      NEW.persona_mode_overridden_at := NOW();
    END IF;
    -- persona_mode 미지정 → 자동 derive (marker 도 NULL 유지).
    IF NEW.persona_mode IS NULL THEN
      NEW.persona_mode := v_auto;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE branch.

  -- 명시적 reset: client 가 marker 를 NULL 로 set (이전엔 NOT NULL) → override 해제 + 자동 derive 복귀.
  IF NEW.persona_mode_overridden_at IS NULL AND OLD.persona_mode_overridden_at IS NOT NULL THEN
    NEW.persona_mode := v_auto;
    RETURN NEW;
  END IF;

  -- marker NOT NULL → override 영구 보존. v_auto 무시.
  -- 단 client 가 동시에 persona_mode 도 새 값으로 바꿨으면 그 값 그대로 (override 갱신).
  IF NEW.persona_mode_overridden_at IS NOT NULL THEN
    -- override 가 NULL 로 들어오면 자동 derive 폴백 (방어).
    IF NEW.persona_mode IS NULL THEN
      NEW.persona_mode := v_auto;
    END IF;
    -- persona_mode 자체가 바뀌었는데 marker 가 OLD 와 같으면 → client 가 새 override 의도. NOW() 갱신.
    IF NEW.persona_mode IS DISTINCT FROM OLD.persona_mode
       AND NEW.persona_mode_overridden_at IS NOT DISTINCT FROM OLD.persona_mode_overridden_at THEN
      NEW.persona_mode_overridden_at := NOW();
    END IF;
    RETURN NEW;
  END IF;

  -- marker NULL (override 아님) + client 가 persona_mode 를 새 값으로 바꿨음 → 새 override 의도. NOW() 마킹.
  IF NEW.persona_mode IS DISTINCT FROM OLD.persona_mode THEN
    IF NEW.persona_mode IS NULL THEN
      NEW.persona_mode := v_auto;
    ELSE
      NEW.persona_mode_overridden_at := NOW();
    END IF;
    RETURN NEW;
  END IF;

  -- 그 외 (marker NULL + persona_mode 그대로) → 자동 derive.
  NEW.persona_mode := v_auto;
  RETURN NEW;
END;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 3) backfill 정책
-- ───────────────────────────────────────────────────────────────────────────
-- 기존 행은 persona_mode_overridden_at IS NULL 로 들어옴 → 기존 동작(자동 derive) 유지.
-- 이미 사용자가 명시 override 한 행은 식별 불가 → backfill 안 함.
-- 다음 UPDATE 에서 client 가 persona_mode 를 명시 set 하면 자동 마킹됨.
