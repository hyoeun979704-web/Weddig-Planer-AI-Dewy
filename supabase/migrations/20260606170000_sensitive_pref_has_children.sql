-- set_sensitive_preference RPC 에 has_children(민감) 지원 추가.
-- 재혼 시 자녀 동반 여부 토글 → remarriage_with_children 활성화. 동의 로깅 포함
-- (consent_type='sensitive_family_children_v1'). 기존 필드 동작은 동일.
CREATE OR REPLACE FUNCTION public.set_sensitive_preference(p_field text, p_value jsonb DEFAULT 'null'::jsonb, p_consent_version integer DEFAULT 1, p_user_agent text DEFAULT NULL::text, p_extra_patch jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_expected_consent_type TEXT;
  v_allowed_extras TEXT[];
  v_invalid_key TEXT;
  v_value_text TEXT := p_value #>> '{}';
  v_value_bool BOOLEAN := NULL;
  v_due_date DATE := NULL;
  v_old_active BOOLEAN := NULL;
  v_new_active BOOLEAN := NULL;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;

  CASE p_field
    WHEN 'pregnant' THEN
      v_expected_consent_type := 'sensitive_health_pregnancy_v1';
      v_allowed_extras := ARRAY['pregnancy_due_date'];
    WHEN 'marital_history' THEN
      v_expected_consent_type := 'sensitive_family_remarriage_v1';
      v_allowed_extras := ARRAY[]::TEXT[];
    WHEN 'has_children' THEN
      v_expected_consent_type := 'sensitive_family_children_v1';
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

  IF p_extra_patch IS NOT NULL THEN
    SELECT k.key INTO v_invalid_key
    FROM jsonb_object_keys(p_extra_patch) AS k(key)
    WHERE NOT (k.key = ANY(v_allowed_extras))
    LIMIT 1;
    IF v_invalid_key IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_extra_patch_key', 'key', v_invalid_key);
    END IF;
  END IF;

  IF p_field IN ('pregnant', 'has_parents_bride', 'has_parents_groom', 'has_children') THEN
    BEGIN
      v_value_bool := NULLIF(v_value_text, '')::boolean;
    EXCEPTION WHEN invalid_text_representation THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_boolean_value', 'value', v_value_text);
    END;
  END IF;

  IF p_field = 'marital_history' AND v_value_text IS NOT NULL
     AND NOT (v_value_text IN ('first', 'remarriage')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_marital_history_value');
  END IF;

  IF p_extra_patch ? 'pregnancy_due_date' THEN
    BEGIN
      v_due_date := NULLIF(p_extra_patch->>'pregnancy_due_date', '')::date;
    EXCEPTION WHEN invalid_text_representation OR invalid_datetime_format OR datetime_field_overflow THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_due_date');
    END;
  END IF;

  INSERT INTO public.user_wedding_settings (user_id)
  VALUES (v_uid)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT
    CASE p_field
      WHEN 'pregnant'           THEN COALESCE(uws.pregnant, FALSE)
      WHEN 'marital_history'    THEN COALESCE(uws.marital_history = 'remarriage', FALSE)
      WHEN 'has_children'       THEN COALESCE(uws.has_children, FALSE)
      WHEN 'has_parents_bride'  THEN NOT COALESCE(uws.has_parents_bride, TRUE)
      WHEN 'has_parents_groom'  THEN NOT COALESCE(uws.has_parents_groom, TRUE)
    END
  INTO v_old_active
  FROM public.user_wedding_settings AS uws
  WHERE uws.user_id = v_uid
  FOR UPDATE;

  v_new_active := CASE p_field
    WHEN 'pregnant'           THEN COALESCE(v_value_bool, FALSE)
    WHEN 'marital_history'    THEN COALESCE(v_value_text = 'remarriage', FALSE)
    WHEN 'has_children'       THEN COALESCE(v_value_bool, FALSE)
    WHEN 'has_parents_bride'  THEN NOT COALESCE(v_value_bool, TRUE)
    WHEN 'has_parents_groom'  THEN NOT COALESCE(v_value_bool, TRUE)
  END;

  UPDATE public.user_wedding_settings AS uws SET
    pregnant = CASE
      WHEN p_field = 'pregnant' THEN COALESCE(v_value_bool, FALSE) ELSE uws.pregnant END,
    marital_history = CASE
      WHEN p_field = 'marital_history' THEN v_value_text ELSE uws.marital_history END,
    has_children = CASE
      WHEN p_field = 'has_children' THEN COALESCE(v_value_bool, FALSE) ELSE uws.has_children END,
    has_parents_bride = CASE
      WHEN p_field = 'has_parents_bride' THEN COALESCE(v_value_bool, TRUE) ELSE uws.has_parents_bride END,
    has_parents_groom = CASE
      WHEN p_field = 'has_parents_groom' THEN COALESCE(v_value_bool, TRUE) ELSE uws.has_parents_groom END,
    pregnancy_due_date = CASE
      WHEN p_field = 'pregnant' AND p_extra_patch ? 'pregnancy_due_date' THEN v_due_date
      ELSE uws.pregnancy_due_date END
  WHERE uws.user_id = v_uid;

  IF v_old_active IS DISTINCT FROM v_new_active THEN
    INSERT INTO public.user_consents (user_id, consent_type, consent_version, agreed, user_agent)
    VALUES (v_uid, v_expected_consent_type, p_consent_version, v_new_active, LEFT(p_user_agent, 500));
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'consent_recorded', v_old_active IS DISTINCT FROM v_new_active,
    'old_active', v_old_active,
    'new_active', v_new_active
  );
END;
$function$;
