-- Round 5 review #1·#2·#4·#5·#8·#11 — set_sensitive_preference RPC v3.
--
-- v2 가 회귀 도입:
-- #1 — DECLARE 의 `NULLIF(v_value_text,'')::boolean` 이 marital_history='first'/'remarriage' 호출 시
--   block 진입 즉시 throw → 모든 marital_history 토글이 깨짐.
-- #4 — 같은 패턴으로 v_due_date cast 도 잘못된 date 입력에 eager throw.
-- #2 — v_new_active 의 marital_history 분기 `v_value_text = 'remarriage'` 가 value=null 일 때
--   NULL 반환 → INSERT user_consents.agreed=NULL → NOT NULL 위반 → 전체 rollback.
-- #5 — v_old_active 도 같은 NULL 전파 (column NULL 인 사용자가 'first' 토글 시 spurious INSERT).
-- #11 — SELECT FOR UPDATE 가 행 없는 사용자에겐 락 못 잡음 → concurrent first-time 토글
--   serialize 안 됨 → 중복 consent 행.
-- #8 — p_value 가 client undefined 면 PostgREST 가 'function not found' 응답.
--
-- v3 디자인:
-- (a) DECLARE 에는 raw text 만. 모든 type cast 는 BEGIN 안에서 lazy + EXCEPTION 감싸 안전 에러 반환.
-- (b) v_old_active / v_new_active 양쪽 모두 COALESCE 로 NULL → FALSE 강제 (boolean 영역 유지).
-- (c) FOR UPDATE 전 placeholder INSERT (user_id 만) ON CONFLICT DO NOTHING → 항상 행 존재 보장.
-- (d) p_value 에 DEFAULT 'null'::jsonb — 누락 호출도 graceful.

CREATE OR REPLACE FUNCTION public.set_sensitive_preference(
  p_field TEXT,
  p_value JSONB DEFAULT 'null'::jsonb,
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
  -- v3 (a) — text 만 declare 에서 추출. cast 는 lazy.
  v_value_text TEXT := p_value #>> '{}';
  v_value_bool BOOLEAN := NULL;
  v_due_date DATE := NULL;
  v_old_active BOOLEAN := NULL;
  v_new_active BOOLEAN := NULL;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;

  -- p_field → consent_type / 허용 extras 매핑.
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

  -- extra_patch 키 검증.
  IF p_extra_patch IS NOT NULL THEN
    SELECT k.key INTO v_invalid_key
    FROM jsonb_object_keys(p_extra_patch) AS k(key)
    WHERE NOT (k.key = ANY(v_allowed_extras))
    LIMIT 1;
    IF v_invalid_key IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_extra_patch_key', 'key', v_invalid_key);
    END IF;
  END IF;

  -- v3 (a) — F#1 fix: lazy boolean cast inside BEGIN, EXCEPTION 감쌈.
  IF p_field IN ('pregnant', 'has_parents_bride', 'has_parents_groom') THEN
    BEGIN
      v_value_bool := NULLIF(v_value_text, '')::boolean;
    EXCEPTION WHEN invalid_text_representation THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_boolean_value', 'value', v_value_text);
    END;
  END IF;

  -- marital_history value 검증.
  IF p_field = 'marital_history' AND v_value_text IS NOT NULL
     AND NOT (v_value_text IN ('first', 'remarriage')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_marital_history_value');
  END IF;

  -- v3 (a) — F#4 fix: lazy date cast.
  -- R6-6 — EXCEPTION 범위를 cast 류로 좁힘. WHEN OTHERS 는 out_of_memory,
  -- deadlock_detected 같은 infra 에러까지 'invalid_due_date' 로 가려 운영 가시성 손실.
  IF p_extra_patch ? 'pregnancy_due_date' THEN
    BEGIN
      v_due_date := NULLIF(p_extra_patch->>'pregnancy_due_date', '')::date;
    EXCEPTION WHEN invalid_text_representation
                OR invalid_datetime_format
                OR datetime_field_overflow THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_due_date');
    END;
  END IF;

  -- v3 (c) — F#11 fix: placeholder INSERT 으로 행 존재 보장 → 이후 FOR UPDATE 가 항상 락 획득.
  -- 이미 행 있으면 NOTHING. 신규 사용자만 새 행. schema DEFAULT 가 모든 NOT NULL 컬럼 채움.
  INSERT INTO public.user_wedding_settings (user_id)
  VALUES (v_uid)
  ON CONFLICT (user_id) DO NOTHING;

  -- v3 (b) — F#5 fix: v_old_active 의 marital_history 분기 COALESCE.
  -- 이제 placeholder 가 보장돼 항상 lock 획득 + 행 존재.
  SELECT
    CASE p_field
      WHEN 'pregnant'           THEN COALESCE(uws.pregnant, FALSE)
      WHEN 'marital_history'    THEN COALESCE(uws.marital_history = 'remarriage', FALSE)
      WHEN 'has_parents_bride'  THEN NOT COALESCE(uws.has_parents_bride, TRUE)
      WHEN 'has_parents_groom'  THEN NOT COALESCE(uws.has_parents_groom, TRUE)
    END
  INTO v_old_active
  FROM public.user_wedding_settings AS uws
  WHERE uws.user_id = v_uid
  FOR UPDATE;

  -- v3 (b) — F#2 fix: v_new_active 도 COALESCE 로 NULL→FALSE.
  v_new_active := CASE p_field
    WHEN 'pregnant'           THEN COALESCE(v_value_bool, FALSE)
    WHEN 'marital_history'    THEN COALESCE(v_value_text = 'remarriage', FALSE)
    WHEN 'has_parents_bride'  THEN NOT COALESCE(v_value_bool, TRUE)
    WHEN 'has_parents_groom'  THEN NOT COALESCE(v_value_bool, TRUE)
  END;

  -- 컬럼 업데이트 (placeholder 가 보장돼 항상 UPDATE 만, INSERT 분기 불필요).
  UPDATE public.user_wedding_settings AS uws SET
    pregnant = CASE
      WHEN p_field = 'pregnant' THEN COALESCE(v_value_bool, FALSE)
      ELSE uws.pregnant
    END,
    marital_history = CASE
      WHEN p_field = 'marital_history' THEN v_value_text
      ELSE uws.marital_history
    END,
    has_parents_bride = CASE
      WHEN p_field = 'has_parents_bride' THEN COALESCE(v_value_bool, TRUE)
      ELSE uws.has_parents_bride
    END,
    has_parents_groom = CASE
      WHEN p_field = 'has_parents_groom' THEN COALESCE(v_value_bool, TRUE)
      ELSE uws.has_parents_groom
    END,
    pregnancy_due_date = CASE
      WHEN p_field = 'pregnant' AND p_extra_patch ? 'pregnancy_due_date' THEN v_due_date
      ELSE uws.pregnancy_due_date
    END
  WHERE uws.user_id = v_uid;

  -- consent INSERT — 실제 active 전환 시에만 (이제 v_new_active 가 NULL 안 됨).
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

-- v3 시그니처는 v2 와 동일하므로 별도 DROP/GRANT 불필요 (CREATE OR REPLACE 가 in-place).
-- 단 명시적으로 권한 재확인.
REVOKE ALL ON FUNCTION public.set_sensitive_preference(TEXT, JSONB, INT, TEXT, JSONB) FROM public;
GRANT EXECUTE ON FUNCTION public.set_sensitive_preference(TEXT, JSONB, INT, TEXT, JSONB) TO authenticated;

COMMENT ON FUNCTION public.set_sensitive_preference(TEXT, JSONB, INT, TEXT, JSONB) IS
  'v3: lazy type cast(F#1/#4), COALESCE active state(F#2/#5), placeholder INSERT race-safe(F#11), p_value DEFAULT(F#8).';
