-- Round 4 review #E1·#E2·#E3·#E4·#E6·#E7 — set_sensitive_preference 재설계.
--
-- 직전 fix(20260524040000) 가 SQL syntax 회귀 3건은 잡았으나 design-level PIPA
-- 약점 다수 잔존. 이번 마이그레이션이 모두 해결:
--
-- #E1 — extra_patch 키가 v_allowed_fields(주 필드 5종) 와 동일 화이트리스트 사용
--   → 한 호출로 5 컬럼 변경 가능. p_field 별 sub-allowlist 로 좁힘.
-- #E2 — p_consent_type 가 raw TEXT, 매핑 안 됨 → 임의 consent_type 으로 audit 오염.
--   p_consent_type 파라미터 제거, server 가 p_field 에서 일관 도출.
-- #E3 — consent_version 하드코딩 1 → v2 정책 텍스트 도입 시 구분 불가.
--   p_consent_version INT 파라미터화.
-- #E4 — UPDATE then IF NOT FOUND INSERT 는 race 동시 호출에서 unique_violation.
--   INSERT … ON CONFLICT (user_id) DO UPDATE 단일 statement 로 원자.
-- #E6 — user_agent 하드코딩 NULL → forensic 가치 0. p_user_agent 파라미터화.
-- #E7 — p_agreed_for_consent 가 client 입력 → controlled orphan. server 가
--   OLD vs NEW active 상태 비교로 agreed 자체 도출, 실제 전환 시에만 consent INSERT.

CREATE OR REPLACE FUNCTION public.set_sensitive_preference(
  p_field TEXT,
  p_value JSONB,
  p_consent_version INT DEFAULT 1,
  p_user_agent TEXT DEFAULT NULL,
  p_extra_patch JSONB DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_expected_consent_type TEXT;
  v_allowed_extras TEXT[];
  v_invalid_key TEXT;
  -- JSONB → text 변환 (NULL 보존). '#>> {}' 가 scalar 의 quoted 표기를 벗김.
  v_value_text TEXT := p_value #>> '{}';
  v_value_bool BOOLEAN := NULLIF(v_value_text, '')::boolean;
  v_due_date DATE := NULLIF(p_extra_patch->>'pregnancy_due_date', '')::date;
  -- E7 — server-derived active state (변경 전/후) 로 agreed 도출.
  v_old_active BOOLEAN := NULL;
  v_new_active BOOLEAN := NULL;
  v_row_existed BOOLEAN := FALSE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;

  -- E1·E2 — p_field → consent_type + allowed_extras 매핑 (서버 강제, client 변조 불가).
  CASE p_field
    WHEN 'pregnant' THEN
      v_expected_consent_type := 'sensitive_health_pregnancy_v1';
      v_allowed_extras := ARRAY['pregnancy_due_date'];
    WHEN 'marital_history' THEN
      v_expected_consent_type := 'sensitive_family_remarriage_v1';
      v_allowed_extras := ARRAY[]::TEXT[];
    WHEN 'has_parents_bride' THEN
      v_expected_consent_type := 'sensitive_family_no_parents_bride_v1';
      v_allowed_extras := ARRAY[]::TEXT[];
    WHEN 'has_parents_groom' THEN
      v_expected_consent_type := 'sensitive_family_no_parents_groom_v1';
      v_allowed_extras := ARRAY[]::TEXT[];
    ELSE
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_field');
  END CASE;

  -- E1 — extra_patch 키가 p_field 의 sub-allowlist 안에만 있는지.
  IF p_extra_patch IS NOT NULL THEN
    SELECT k.key INTO v_invalid_key
    FROM jsonb_object_keys(p_extra_patch) AS k(key)
    WHERE NOT (k.key = ANY(v_allowed_extras))
    LIMIT 1;
    IF v_invalid_key IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_extra_patch_key', 'key', v_invalid_key);
    END IF;
  END IF;

  -- marital_history 값 사전 검증 (CHECK constraint 가 잡지만 RPC envelope 가 더 친절).
  IF p_field = 'marital_history' AND v_value_text IS NOT NULL
     AND NOT (v_value_text IN ('first', 'remarriage')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_marital_history_value');
  END IF;

  -- E7 — SELECT FOR UPDATE 로 row lock + OLD active 상태 도출.
  -- active 정의:
  --   pregnant            → 컬럼 값 TRUE 가 active
  --   marital_history     → 'remarriage' 가 active
  --   has_parents_bride/groom → FALSE(부재) 가 active (민감 신호)
  SELECT
    TRUE,
    CASE p_field
      WHEN 'pregnant'           THEN COALESCE(uws.pregnant, FALSE)
      WHEN 'marital_history'    THEN uws.marital_history = 'remarriage'
      WHEN 'has_parents_bride'  THEN NOT COALESCE(uws.has_parents_bride, TRUE)
      WHEN 'has_parents_groom'  THEN NOT COALESCE(uws.has_parents_groom, TRUE)
    END
  INTO v_row_existed, v_old_active
  FROM public.user_wedding_settings AS uws
  WHERE uws.user_id = v_uid
  FOR UPDATE;
  -- 행 없으면 schema DEFAULT 기준 active = false (pregnant=false, has_parents=true).
  IF NOT v_row_existed THEN
    v_old_active := FALSE;
  END IF;

  v_new_active := CASE p_field
    WHEN 'pregnant'           THEN COALESCE(v_value_bool, FALSE)
    WHEN 'marital_history'    THEN v_value_text = 'remarriage'
    WHEN 'has_parents_bride'  THEN NOT COALESCE(v_value_bool, TRUE)
    WHEN 'has_parents_groom'  THEN NOT COALESCE(v_value_bool, TRUE)
  END;

  -- E4 — race-safe UPSERT. 단일 statement, ON CONFLICT (user_id) DO UPDATE.
  -- DEFAULT 값들은 schema 정의 (id, created_at 등) 또는 explicit CASE 로 채움.
  INSERT INTO public.user_wedding_settings (
    user_id,
    pregnant,
    marital_history,
    has_parents_bride,
    has_parents_groom,
    pregnancy_due_date
  ) VALUES (
    v_uid,
    CASE WHEN p_field = 'pregnant' THEN COALESCE(v_value_bool, FALSE) ELSE FALSE END,
    CASE WHEN p_field = 'marital_history' THEN v_value_text ELSE NULL END,
    CASE WHEN p_field = 'has_parents_bride' THEN COALESCE(v_value_bool, TRUE) ELSE TRUE END,
    CASE WHEN p_field = 'has_parents_groom' THEN COALESCE(v_value_bool, TRUE) ELSE TRUE END,
    CASE WHEN p_field = 'pregnant' AND p_extra_patch ? 'pregnancy_due_date' THEN v_due_date ELSE NULL END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    pregnant = CASE
      WHEN p_field = 'pregnant' THEN COALESCE(v_value_bool, FALSE)
      ELSE user_wedding_settings.pregnant
    END,
    marital_history = CASE
      WHEN p_field = 'marital_history' THEN v_value_text
      ELSE user_wedding_settings.marital_history
    END,
    has_parents_bride = CASE
      WHEN p_field = 'has_parents_bride' THEN COALESCE(v_value_bool, TRUE)
      ELSE user_wedding_settings.has_parents_bride
    END,
    has_parents_groom = CASE
      WHEN p_field = 'has_parents_groom' THEN COALESCE(v_value_bool, TRUE)
      ELSE user_wedding_settings.has_parents_groom
    END,
    pregnancy_due_date = CASE
      WHEN p_field = 'pregnant' AND p_extra_patch ? 'pregnancy_due_date' THEN v_due_date
      ELSE user_wedding_settings.pregnancy_due_date
    END;

  -- E7 — active 상태가 실제 변할 때만 consent INSERT. 변하지 않으면 audit noise 0.
  -- E3 — p_consent_version 파라미터. E6 — p_user_agent.
  IF v_old_active IS DISTINCT FROM v_new_active THEN
    INSERT INTO public.user_consents (
      user_id, consent_type, consent_version, agreed, user_agent
    ) VALUES (
      v_uid, v_expected_consent_type, p_consent_version, v_new_active,
      LEFT(p_user_agent, 500)
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'consent_recorded', v_old_active IS DISTINCT FROM v_new_active,
    'old_active', v_old_active,
    'new_active', v_new_active
  );
END;
$$;

-- 함수 시그니처 변경 — 기존 시그니처와 다르므로 GRANT 재발급. Postgres 는 같은
-- 함수명에 다른 시그니처를 별도 함수로 취급 — 명시 DROP 후 신규 시그니처만 GRANT.
DROP FUNCTION IF EXISTS public.set_sensitive_preference(TEXT, JSONB, TEXT, BOOLEAN, BOOLEAN, JSONB);
REVOKE ALL ON FUNCTION public.set_sensitive_preference(TEXT, JSONB, INT, TEXT, JSONB) FROM public;
GRANT EXECUTE ON FUNCTION public.set_sensitive_preference(TEXT, JSONB, INT, TEXT, JSONB) TO authenticated;

COMMENT ON FUNCTION public.set_sensitive_preference(TEXT, JSONB, INT, TEXT, JSONB) IS
  '민감 정보 atomic 처리 v2. server-derived consent_type + agreed, p_field 별 sub-allowlist, ON CONFLICT UPSERT, p_consent_version/p_user_agent 파라미터.';
