-- 코드 리뷰 #1 — setSensitivePreference 비원자성 해결.
-- 단일 트랜잭션에서 user_wedding_settings upsert + user_consents INSERT 를 모두
-- 처리하는 SECURITY DEFINER RPC. 둘 중 하나라도 실패하면 transaction rollback —
-- DB 가 column 만 저장된 채 consent 없는 PIPA orphan 상태로 빠지지 않는다.
--
-- 또한 #6: p_record_consent=false 옵션으로 consent INSERT 를 건너뛸 수 있어
-- handleSaveDueDate 처럼 "이미 consent 받은 상태에서 column patch 만 갱신"
-- 케이스에서 중복 consent 행 방지.

CREATE OR REPLACE FUNCTION public.set_sensitive_preference(
  p_field TEXT,                             -- 'pregnant' | 'marital_history' | 'has_parents_bride' | 'has_parents_groom'
  p_value JSONB,                            -- bool 'true'/'false' / text '"remarriage"'/'"first"' / null
  p_consent_type TEXT,                      -- 'sensitive_health_pregnancy_v1' 등
  p_agreed_for_consent BOOLEAN,             -- ON 전환 시 true, OFF 시 false
  p_record_consent BOOLEAN DEFAULT TRUE,    -- false 시 consent INSERT 생략(중복 회피)
  p_extra_patch JSONB DEFAULT NULL          -- pregnancy_due_date 등 추가 필드 동시 patch
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_allowed_fields TEXT[] := ARRAY[
    'pregnant', 'marital_history', 'has_parents_bride', 'has_parents_groom',
    'pregnancy_due_date'
  ];
  v_patch JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;

  -- 필드 화이트리스트 — SECURITY DEFINER 라 임의 컬럼 UPDATE 차단.
  IF NOT (p_field = ANY(v_allowed_fields)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_field');
  END IF;

  -- p_extra_patch 키도 화이트리스트 검증.
  IF p_extra_patch IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM jsonb_object_keys(p_extra_patch) k
      WHERE NOT (k.k = ANY(v_allowed_fields))
    ) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_extra_patch_key');
    END IF;
  END IF;

  -- patch JSON 구성. main field + extra_patch 머지.
  v_patch := jsonb_build_object(p_field, p_value);
  IF p_extra_patch IS NOT NULL THEN
    v_patch := v_patch || p_extra_patch;
  END IF;
  v_patch := v_patch || jsonb_build_object('user_id', v_uid::text);

  -- upsert user_wedding_settings. PL/pgSQL 에서 jsonb → row 변환에 jsonb_populate_record 사용.
  -- ON CONFLICT 가 user_id unique 필요 — schema 보장됨.
  INSERT INTO public.user_wedding_settings
  SELECT * FROM jsonb_populate_record(NULL::public.user_wedding_settings, v_patch)
  ON CONFLICT (user_id) DO UPDATE
  SET pregnant = COALESCE((v_patch->>'pregnant')::boolean, public.user_wedding_settings.pregnant),
      marital_history = COALESCE(v_patch->>'marital_history', public.user_wedding_settings.marital_history),
      has_parents_bride = COALESCE((v_patch->>'has_parents_bride')::boolean, public.user_wedding_settings.has_parents_bride),
      has_parents_groom = COALESCE((v_patch->>'has_parents_groom')::boolean, public.user_wedding_settings.has_parents_groom),
      pregnancy_due_date = CASE
        WHEN v_patch ? 'pregnancy_due_date' THEN NULLIF(v_patch->>'pregnancy_due_date','')::date
        ELSE public.user_wedding_settings.pregnancy_due_date
      END;

  -- consent 기록 — 옵션. 같은 트랜잭션 안이므로 실패 시 upsert 도 rollback.
  IF p_record_consent THEN
    INSERT INTO public.user_consents (
      user_id, consent_type, consent_version, agreed, user_agent
    ) VALUES (
      v_uid, p_consent_type, 1, p_agreed_for_consent, NULL
    );
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.set_sensitive_preference(TEXT, JSONB, TEXT, BOOLEAN, BOOLEAN, JSONB) FROM public;
GRANT EXECUTE ON FUNCTION public.set_sensitive_preference(TEXT, JSONB, TEXT, BOOLEAN, BOOLEAN, JSONB) TO authenticated;

COMMENT ON FUNCTION public.set_sensitive_preference IS
  '민감 정보(pregnant/marital_history/has_parents_*) 컬럼 + 동의 기록을 단일 트랜잭션으로 원자 처리. PIPA orphan 회피.';
