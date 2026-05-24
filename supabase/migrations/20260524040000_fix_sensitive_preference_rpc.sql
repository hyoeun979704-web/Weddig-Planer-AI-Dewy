-- Round 3 자기 리뷰 critical 회귀 3건 일괄 fix.
-- 원본: 20260524020000_set_sensitive_preference_rpc.sql 의 atomic RPC.
-- 발견된 3건 모두 release-blocker — 어느 하나라도 실제 호출 경로를 막음.
--
-- #1 (k.k 컬럼): `jsonb_object_keys(p_extra_patch) k WHERE NOT (k.k = ANY(...))` —
--   k 는 table alias, single-column SETOF text 의 implicit column name 은 'jsonb_object_keys'.
--   k.k 는 존재하지 않는 column → extra_patch 가 non-null 인 모든 호출 SQL 에러.
--   PregnancyConfirmFlow.handleSaveDueDate 의 due-date 저장이 항상 실패.
--
-- #2 (INSERT NOT NULL): `INSERT ... SELECT * FROM jsonb_populate_record(NULL::row, v_patch)`
--   는 v_patch 미포함 컬럼을 NULL 로 채움. id/created_at/updated_at 같은 NOT NULL
--   DEFAULT 컬럼이 NULL 삽입돼 위반. 신규 사용자(행 없음)의 모든 sensitive 토글이 실패.
--
-- #3 (COALESCE null 무력화): `marital_history = COALESCE(v_patch->>'marital_history', OLD)` —
--   JSON null 보내면 v_patch->>'marital_history' 가 SQL NULL → COALESCE 가 OLD 로
--   폴백. SensitivePreferencesCard.toggleRemarriage 의 first→NULL 사이클이 silent no-op.
--   F#E4 회귀 재도입.
--
-- 수정 전략:
--   ① 화이트리스트 체크에 명시 column alias `AS k(key_name)` 사용.
--   ② INSERT 는 explicit 컬럼 리스트(user_id + 민감 필드들만) 사용 — 나머지 column 은
--      DEFAULT 적용. SELECT * FROM populate_record 패턴 제거.
--   ③ UPDATE 의 COALESCE 패턴을 `CASE WHEN v_patch ? 'field' THEN ... ELSE old END`
--      로 교체 — null 명시 전송 시 정상 NULL 화 가능. pregnancy_due_date 가 이미
--      쓰던 패턴과 동일.

CREATE OR REPLACE FUNCTION public.set_sensitive_preference(
  p_field TEXT,
  p_value JSONB,
  p_consent_type TEXT,
  p_agreed_for_consent BOOLEAN,
  p_record_consent BOOLEAN DEFAULT TRUE,
  p_extra_patch JSONB DEFAULT NULL
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
  v_invalid_key TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;

  -- 필드 화이트리스트.
  IF NOT (p_field = ANY(v_allowed_fields)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_field');
  END IF;

  -- F#1 fix — 명시 column alias `AS k(key_name)` 로 잘못된 k.k 참조 제거.
  IF p_extra_patch IS NOT NULL THEN
    SELECT k.key_name INTO v_invalid_key
    FROM jsonb_object_keys(p_extra_patch) AS k(key_name)
    WHERE NOT (k.key_name = ANY(v_allowed_fields))
    LIMIT 1;
    IF v_invalid_key IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_extra_patch_key', 'key', v_invalid_key);
    END IF;
  END IF;

  -- main field + extra_patch 머지.
  v_patch := jsonb_build_object(p_field, p_value);
  IF p_extra_patch IS NOT NULL THEN
    v_patch := v_patch || p_extra_patch;
  END IF;

  -- F#3 fix — UPDATE 먼저(없으면 0 rows). CASE WHEN v_patch ? 'field' 패턴 통일 —
  -- JSON null 명시 전송 시 정상 NULL 반영. pregnancy_due_date 와 같은 형태.
  UPDATE public.user_wedding_settings AS uws SET
    pregnant = CASE
      WHEN v_patch ? 'pregnant' THEN COALESCE((v_patch->>'pregnant')::boolean, FALSE)
      ELSE uws.pregnant
    END,
    marital_history = CASE
      WHEN v_patch ? 'marital_history' THEN v_patch->>'marital_history'
      ELSE uws.marital_history
    END,
    has_parents_bride = CASE
      WHEN v_patch ? 'has_parents_bride' THEN COALESCE((v_patch->>'has_parents_bride')::boolean, TRUE)
      ELSE uws.has_parents_bride
    END,
    has_parents_groom = CASE
      WHEN v_patch ? 'has_parents_groom' THEN COALESCE((v_patch->>'has_parents_groom')::boolean, TRUE)
      ELSE uws.has_parents_groom
    END,
    pregnancy_due_date = CASE
      WHEN v_patch ? 'pregnancy_due_date' THEN NULLIF(v_patch->>'pregnancy_due_date', '')::date
      ELSE uws.pregnancy_due_date
    END
  WHERE uws.user_id = v_uid;

  -- F#2 fix — UPDATE 가 0 rows 면 INSERT. explicit 컬럼 리스트로 id/created_at/
  -- updated_at 등 DEFAULT 컬럼이 자동 채워지도록(populate_record 패턴 폐기).
  -- 컬럼 누락 시 schema DEFAULT (pregnant=false, has_parents_*=true) 자연 적용.
  IF NOT FOUND THEN
    INSERT INTO public.user_wedding_settings (
      user_id,
      pregnant,
      marital_history,
      has_parents_bride,
      has_parents_groom,
      pregnancy_due_date
    ) VALUES (
      v_uid,
      COALESCE((v_patch->>'pregnant')::boolean, FALSE),
      v_patch->>'marital_history',  -- NULL 가능 — 3-state
      COALESCE((v_patch->>'has_parents_bride')::boolean, TRUE),
      COALESCE((v_patch->>'has_parents_groom')::boolean, TRUE),
      NULLIF(v_patch->>'pregnancy_due_date', '')::date
    );
  END IF;

  -- consent 기록 — 옵션. 같은 트랜잭션이므로 실패 시 위 INSERT/UPDATE 도 rollback.
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

COMMENT ON FUNCTION public.set_sensitive_preference IS
  '민감 정보 컬럼 + 동의 기록 atomic 처리. v2 자기 리뷰 #1·#2·#3 회귀 모두 수정 — extra_patch alias 정정, INSERT explicit 컬럼, UPDATE null-clearable.';
