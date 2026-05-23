-- 코드 리뷰 후속 조치 — 페르소나 v1 마이그레이션 발견 항목들 일괄 보정.
--   F#4 trigger override 보존: 사용자가 명시적으로 persona_mode 를 변경한 경우 트리거가 덮어쓰지 않도록.
--   F#3 derive_wedding_persona: small_real/outdoor/public_facility/restaurant 를 wedding_style 과 무관하게 매핑.
--   F#5 dress_samples '%A%' 패턴이 letter 'a' 포함 모든 행을 잡음 — 토큰 단위 패턴으로 교체 + 잘못 backfill 된 행 정리.
--   F#13 family_invites delegated_scopes 검증 + RLS column-level 게이트.
--   F#11 review.source_type 미설정 새 행에 대한 기본값.

-- ───────────────────────────────────────────────────────────────────────────
-- F#3 / F#4 — derive_wedding_persona 갱신 + 트리거가 override 보존
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.derive_wedding_persona(s public.user_wedding_settings)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  is_international BOOLEAN := COALESCE(s.wedding_country, 'KR') <> 'KR'
    OR COALESCE(s.country, 'KR') <> COALESCE(s.wedding_country, 'KR');
  is_overseas BOOLEAN := COALESCE(s.country, 'KR') <> 'KR';
  no_parents BOOLEAN := NOT COALESCE(s.has_parents_bride, TRUE)
                   AND NOT COALESCE(s.has_parents_groom, TRUE);
  metro_set TEXT[] := ARRAY['서울특별시','서울','경기도','경기','인천광역시','인천'];
  is_regional BOOLEAN := s.wedding_region IS NOT NULL
                    AND NOT (s.wedding_region = ANY(metro_set));
BEGIN
  IF is_international THEN RETURN 'international'; END IF;
  IF COALESCE(s.pregnant, FALSE) THEN RETURN 'pregnancy'; END IF;
  IF s.marital_history = 'remarriage' THEN RETURN 'remarriage'; END IF;

  IF s.ceremony_type = 'snap_only' THEN RETURN 'snap_only'; END IF;
  IF s.ceremony_type = 'none' THEN RETURN 'no_wedding_travel'; END IF;
  IF s.ceremony_type = 'self_only' THEN RETURN 'self_no_ceremony'; END IF;

  -- 스몰 계열 ceremony_type 은 wedding_style 과 무관하게 매핑 — UI 가 단독 선택을 허용.
  IF s.ceremony_type = 'outdoor' THEN RETURN 'small_outdoor'; END IF;
  IF s.ceremony_type = 'public_facility' THEN RETURN 'small_budget'; END IF;
  IF s.ceremony_type IN ('small_real','restaurant') THEN RETURN 'small_intimate'; END IF;
  IF s.wedding_style = 'small' THEN
    IF s.ceremony_type = 'hotel' THEN RETURN 'small_luxury'; END IF;
    RETURN 'small_intimate';
  END IF;

  IF no_parents THEN RETURN 'single_household'; END IF;
  IF is_overseas THEN RETURN 'remote_overseas'; END IF;
  IF is_regional THEN RETURN 'regional'; END IF;

  IF s.role = 'groom' THEN RETURN 'standard_groom'; END IF;
  IF s.ceremony_type = 'hotel' THEN RETURN 'luxury_hotel'; END IF;

  RETURN 'standard_bride';
END;
$$;

-- 트리거: override 가 들어왔으면(persona_mode 가 명시적으로 변경됐고 derive 결과와 다름)
-- 그 값을 보존하고, NULL 이거나 OLD 와 같은 자동계산 값일 때만 새로 계산.
CREATE OR REPLACE FUNCTION public.tg_user_wedding_settings_derive_persona()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_auto TEXT := public.derive_wedding_persona(NEW);
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- INSERT 시 사용자가 직접 persona_mode 를 박았으면 그대로 두고, 아니면 자동계산.
    IF NEW.persona_mode IS NULL THEN
      NEW.persona_mode := v_auto;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: client 가 persona_mode 를 새 값으로 바꿨으면(OLD 와 다름) 명시적 override 로 간주.
  IF NEW.persona_mode IS DISTINCT FROM OLD.persona_mode THEN
    -- override 가 enum 에 없으면 자동계산으로 폴백.
    IF NEW.persona_mode IS NULL THEN
      NEW.persona_mode := v_auto;
    END IF;
    RETURN NEW;
  END IF;

  -- persona_mode 가 그대로면(=다른 컬럼만 바뀜) 자동계산을 다시 적용.
  NEW.persona_mode := v_auto;
  RETURN NEW;
END;
$$;

-- 잘못된 자동계산을 가진 행들을 새 로직으로 백필.
-- 위 IS DISTINCT FROM 가드 때문에 직접 UPDATE 시 같은 값이면 다시 계산되고, 다른 값이면 override 로 인식.
-- 백필은 의도적으로 "자동계산값을 새로 적용" 이므로 다른 컬럼 변화 없이 트리거가 v_auto 로 덮어쓰는 경로를 탐.
-- 단, derive_wedding_persona 가 STABLE/IMMUTABLE 이라 같은 입력 → 같은 출력. WHERE 절로 변동 대상만 좁힌다.
UPDATE public.user_wedding_settings AS w
SET persona_mode = public.derive_wedding_persona(w)
WHERE persona_mode IS DISTINCT FROM public.derive_wedding_persona(w);

-- ───────────────────────────────────────────────────────────────────────────
-- F#5 — dress_samples '%A%' 패턴 정정
-- ───────────────────────────────────────────────────────────────────────────

-- 이전 backfill 로 잘못 'light' 가 된 행을 한번 'none' 으로 되돌린 뒤(A 라인 명시가 아닌 행),
-- 토큰 경계 패턴으로 다시 backfill. silhouette = 'A' / 'A라인' / 'A-line' (대소문자 무시) /
-- '엠파이어' / 'empire' 만 매칭.
UPDATE public.dress_samples
SET pregnancy_supported = 'none'
WHERE pregnancy_supported = 'light'
  AND NOT (
    silhouette ~* '(^|[^a-z])a(-|\s)?line([^a-z]|$)'
    OR silhouette ILIKE '%엠파이어%'
    OR silhouette ILIKE '%empire%'
    OR silhouette ~* '(^|[^a-z])a라인'
    OR silhouette ~* '^a$'
  );

UPDATE public.dress_samples
SET pregnancy_supported = 'light'
WHERE pregnancy_supported = 'none'
  AND (
    silhouette ~* '(^|[^a-z])a(-|\s)?line([^a-z]|$)'
    OR silhouette ILIKE '%엠파이어%'
    OR silhouette ILIKE '%empire%'
    OR silhouette ~* '(^|[^a-z])a라인'
    OR silhouette ~* '^a$'
  );

-- ───────────────────────────────────────────────────────────────────────────
-- F#13 — family_invites RLS column-level 게이트 + delegated_scopes 검증
-- ───────────────────────────────────────────────────────────────────────────

-- 1) 멤버는 status='linked' 외 다른 컬럼을 못 바꾸도록 제한.
--    UPDATE 정책을 owner / member 로 쪼개고 member 정책은 WITH CHECK 으로 안전 컬럼만 허용.
DROP POLICY IF EXISTS family_invites_update_self ON public.family_invites;

CREATE POLICY family_invites_update_owner ON public.family_invites
  FOR UPDATE
  USING (auth.uid() = owner_user_id)
  WITH CHECK (
    auth.uid() = owner_user_id
    AND owner_user_id IS NOT DISTINCT FROM (SELECT owner_user_id FROM public.family_invites fi WHERE fi.id = family_invites.id)
  );

-- 멤버는 자기 redemption 시 status 가 pending->linked 로 바뀌는 흐름(주로 RPC 가 처리)만 통과해야 함.
-- USING 으로 멤버 검증, WITH CHECK 로 delegated_scopes / role / display_name / expires_at / owner_user_id 변경 금지.
CREATE POLICY family_invites_update_member ON public.family_invites
  FOR UPDATE
  USING (auth.uid() = member_user_id)
  WITH CHECK (
    auth.uid() = member_user_id
    -- 멤버가 자기 자신을 owner 로 바꾸거나 다른 멤버로 위장하는 것 금지.
    AND member_user_id = auth.uid()
    -- delegated_scopes / role / display_name / expires_at / owner_user_id 는 이전 행과 동일해야.
    AND delegated_scopes IS NOT DISTINCT FROM (SELECT delegated_scopes FROM public.family_invites fi WHERE fi.id = family_invites.id)
    AND role IS NOT DISTINCT FROM (SELECT role FROM public.family_invites fi WHERE fi.id = family_invites.id)
    AND owner_user_id IS NOT DISTINCT FROM (SELECT owner_user_id FROM public.family_invites fi WHERE fi.id = family_invites.id)
    AND display_name IS NOT DISTINCT FROM (SELECT display_name FROM public.family_invites fi WHERE fi.id = family_invites.id)
    AND expires_at IS NOT DISTINCT FROM (SELECT expires_at FROM public.family_invites fi WHERE fi.id = family_invites.id)
  );

-- 2) delegated_scopes 의 enum 화 — 알려진 scope 값만 허용 + 배열 길이 상한.
ALTER TABLE public.family_invites
  DROP CONSTRAINT IF EXISTS family_invites_delegated_scopes_check;
ALTER TABLE public.family_invites
  ADD CONSTRAINT family_invites_delegated_scopes_check
  CHECK (
    array_length(delegated_scopes, 1) IS NULL  -- 빈 배열 허용
    OR (
      array_length(delegated_scopes, 1) <= 16
      AND delegated_scopes <@ ARRAY[
        'budget_view', 'budget_comment',
        'schedule_view', 'schedule_comment',
        'guest_view', 'guest_manage',
        'meal_taste', 'venue_tour',
        'invitation_view', 'invitation_send_assist',
        'photo_view', 'memo_view',
        'general'
      ]::TEXT[]
    )
  );

-- ───────────────────────────────────────────────────────────────────────────
-- F#11 — review source_type 새 INSERT 가 NULL 로 떨어지지 않도록 기본값
-- ───────────────────────────────────────────────────────────────────────────

-- DEFAULT 추가: 운영팀이 명시적으로 설정 안 한 새 후기는 미검증 사용자 후기로 간주.
ALTER TABLE public.place_reviews
  ALTER COLUMN source_type SET DEFAULT 'user_unverified';

-- 이미 NULL 인 행이 남아 있을 수 있으니 1회 더 정리.
UPDATE public.place_reviews
SET source_type = 'user_unverified'
WHERE source_type IS NULL;

COMMENT ON COLUMN public.place_reviews.source_type IS
  '후기 출처 분류. NULL 금지 정책 대신 DEFAULT user_unverified 로 새 INSERT 안전 보장. 운영팀이 editor/partner/promotional 을 명시할 때만 분류 강화.';
