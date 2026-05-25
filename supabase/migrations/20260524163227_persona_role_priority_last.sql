-- Round 8 A — derive_wedding_persona 의 role='groom' 우선순위를 마지막으로 이동.
--
-- 이전: noParents → overseas → regional → role=groom → hotel → default
-- 문제: 호텔 신랑이 role 분기에 먼저 잡혀 standard_groom 으로 분류 → luxury_hotel
--      큐레이션·미션을 못 받음. 페르소나 시트 v1 의 호텔 신랑(P3 변종) 미반영.
--
-- 새 순서: noParents → overseas → regional → hotel → role=groom → default
-- 원칙: "더 구체적·고유한 경험" 이 우선. role 은 수식자라 다른 페르소나가 있으면
--       그쪽이 이기고, 없을 때만 standard_groom 으로 fallback.
-- 신랑 voice 가 필요한 곳(미션·헤더 자막·AI 호칭)은 페르소나와 직교한 role 필드를
-- 별도 확인하는 layering 으로 처리(client 의 isGroomMode + 미션 role layering).

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
  -- Round 11 self-review fix — pregnancy 를 international 위로 (health-safety 우선).
  IF COALESCE(s.pregnant, FALSE) THEN RETURN 'pregnancy'; END IF;
  -- Round 10 — dual_ceremony 도 international 매핑. client 와 일관.
  IF is_international OR s.ceremony_type = 'dual_ceremony' THEN RETURN 'international'; END IF;
  IF s.marital_history = 'remarriage' THEN RETURN 'remarriage'; END IF;

  IF s.ceremony_type = 'snap_only' THEN RETURN 'snap_only'; END IF;
  IF s.ceremony_type = 'none' THEN RETURN 'no_wedding_travel'; END IF;
  IF s.ceremony_type = 'self_only' THEN RETURN 'self_no_ceremony'; END IF;

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
  IF s.ceremony_type = 'hotel' THEN RETURN 'luxury_hotel'; END IF;

  -- role 은 마지막에 — 다른 페르소나가 잡지 않은 경우에만 standard_groom 으로 fallback.
  IF s.role = 'groom' THEN RETURN 'standard_groom'; END IF;

  RETURN 'standard_bride';
END;
$$;

-- Round 9 self-review P0 — 백필 제거.
-- 사유: trigger override 가드는 client 가 NEW.persona_mode 를 OLD 와 다른 값으로
-- 직접 set 했을 때만 보존. 마이그레이션 UPDATE 가 NEW = derive_result 를 set 하면
-- 트리거 입장에서 "client 가 명시 override 한 값" 으로 해석되어 그대로 보존 →
-- 사용자가 view-as 등으로 명시 override 했던 행도 derive_result 로 덮어쓰는 결과.
-- 즉 "override 보존" 의도와 정반대.
--
-- 대신 자연 자가치유에 의존 — 사용자가 user_wedding_settings 에 다음 UPDATE 를
-- 발생시키는 순간 트리거의 NEW.persona_mode := v_auto 경로가 fire 해 새 로직으로
-- 재계산. 그 사이 기간엔 client derivePersonaMode(weddingSettings) 와 DB persona_mode
-- 가 일시적으로 불일치할 수 있으나, UI 분기는 weddingSettings 입력값을 직접 보는
-- 코드가 대부분(role/ceremony_type 등) 이라 실제 사용자 경험에 영향 최소.
--
-- 명시 백필이 필요한 경우엔 별도 마이그레이션에서 ALTER TABLE … DISABLE TRIGGER →
-- 좁은 WHERE 로 row 식별 → UPDATE → ENABLE TRIGGER 패턴 사용.
