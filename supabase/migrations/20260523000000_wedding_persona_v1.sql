-- 페르소나 시트 v1 대응 — 단일 wedding_style/marital_history/pregnant 3컬럼으로는
-- 표현 못 하는 페르소나 신호(역할·시군구·해외거주·부모부재·노식·하객규모 버킷)를
-- 일관된 단일 소스(user_wedding_settings)에 추가한다.
--
-- 모두 옵셔널·기본값 안전 — 기존 사용자는 NULL/false 로 들어오고 사용자가 명시적으로
-- 입력할 때만 UI/큐레이션·AI 프롬프트 분기가 활성화된다.
--
-- 컬럼 의도:
--   role               신부/신랑/공동주도. 호칭·미션 큐레이션·AI 톤 분기.
--   country            거주국가(ISO-3166-1 alpha-2). 'KR' 이외면 원격 진행 모드.
--   wedding_country    예식 국가. 'KR' 이외 또는 country!=wedding_country면 국제결혼.
--   wedding_region_sigungu  시군구(천안시 등). wedding_region(시도) 안에서의 좁힘.
--   has_parents_bride / has_parents_groom
--                      양가 부모 존재 여부. 둘 다 false면 양가 분담 시뮬레이터
--                      대신 1인 진행 가이드. 한쪽만 false면 그쪽 분담을 0으로 시드.
--   ceremony_type      식 형태 enum. 결혼식 자체 안 함('none') / 스냅만('snap_only') /
--                      셀프('self_only') / 호텔('hotel') / 야외('outdoor') /
--                      레스토랑('restaurant') / 공공('public_facility') /
--                      이중식('dual_ceremony', 국제결혼). NULL = 일반 wedding_style 따름.
--   persona_mode       사용자 자동 분류 페르소나 enum. 시트 P1~P20 매핑.
--                      derive_wedding_persona() 트리거가 위 필드들로 자동 계산.

ALTER TABLE public.user_wedding_settings
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'KR',
  ADD COLUMN IF NOT EXISTS wedding_country TEXT DEFAULT 'KR',
  ADD COLUMN IF NOT EXISTS wedding_region_sigungu TEXT,
  ADD COLUMN IF NOT EXISTS has_parents_bride BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS has_parents_groom BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS ceremony_type TEXT,
  ADD COLUMN IF NOT EXISTS persona_mode TEXT;

ALTER TABLE public.user_wedding_settings
  DROP CONSTRAINT IF EXISTS user_wedding_settings_role_check;
ALTER TABLE public.user_wedding_settings
  ADD CONSTRAINT user_wedding_settings_role_check
  CHECK (role IS NULL OR role IN ('bride', 'groom', 'shared'));

ALTER TABLE public.user_wedding_settings
  DROP CONSTRAINT IF EXISTS user_wedding_settings_ceremony_type_check;
ALTER TABLE public.user_wedding_settings
  ADD CONSTRAINT user_wedding_settings_ceremony_type_check
  CHECK (ceremony_type IS NULL OR ceremony_type IN (
    'standard', 'hotel', 'small_real', 'outdoor', 'restaurant',
    'public_facility', 'self_only', 'none', 'snap_only', 'dual_ceremony'
  ));

ALTER TABLE public.user_wedding_settings
  DROP CONSTRAINT IF EXISTS user_wedding_settings_persona_mode_check;
ALTER TABLE public.user_wedding_settings
  ADD CONSTRAINT user_wedding_settings_persona_mode_check
  CHECK (persona_mode IS NULL OR persona_mode IN (
    'standard_bride',
    'standard_groom',
    'luxury_hotel',
    'budget_analytic',
    'designer_late',
    'first_timer',
    'regional',
    'remarriage',
    'remote_overseas',
    'single_household',
    'small_intimate',
    'small_outdoor',
    'small_luxury',
    'small_budget',
    'self_no_ceremony',
    'no_wedding_travel',
    'snap_only',
    'pregnancy',
    'international'
  ));

COMMENT ON COLUMN public.user_wedding_settings.role IS
  '사용자 역할: bride(신부)/groom(신랑)/shared(공동주도). NULL=미선택. 호칭·미션·AI 톤 분기.';
COMMENT ON COLUMN public.user_wedding_settings.country IS
  '거주 국가(ISO-3166-1 alpha-2). KR 이외면 원격 진행 모드/시차 안내가 활성화.';
COMMENT ON COLUMN public.user_wedding_settings.wedding_country IS
  '예식 국가. country!=wedding_country 또는 wedding_country!=KR이면 국제결혼 모드.';
COMMENT ON COLUMN public.user_wedding_settings.wedding_region_sigungu IS
  '예식 시군구(예: "천안시", "마포구"). wedding_region(시도) 안에서의 좁힘. 큐레이션·검색 매칭에 사용.';
COMMENT ON COLUMN public.user_wedding_settings.has_parents_bride IS
  '신부 측 부모 존재. false면 양가 분담 시뮬레이터·미션이 1인 진행으로 변형.';
COMMENT ON COLUMN public.user_wedding_settings.has_parents_groom IS
  '신랑 측 부모 존재. false면 양가 분담·진행이 신부 측 단독으로 시프트.';
COMMENT ON COLUMN public.user_wedding_settings.ceremony_type IS
  '식 형태 세분. 노식("none")·스냅("snap_only")·셀프("self_only")·호텔·야외·레스토랑·공공시설·이중식.';
COMMENT ON COLUMN public.user_wedding_settings.persona_mode IS
  '페르소나 시트 v1 P1~P20 자동 매핑. derive_wedding_persona() 트리거가 다른 필드로 계산.';

-- 페르소나 자동 분류 함수 — 입력 신호를 우선순위 기반으로 매칭.
-- 우선순위: 특수(국제·임신·재혼) > 식 형태(노식/스냅/스몰) > 1인진행 > 원격 > 지방 > 역할 > 기본.
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
  -- 특수 페르소나(상호배제 가능, 강한 신호 우선)
  IF is_international THEN RETURN 'international'; END IF;
  IF COALESCE(s.pregnant, FALSE) THEN RETURN 'pregnancy'; END IF;
  IF s.marital_history = 'remarriage' THEN RETURN 'remarriage'; END IF;

  -- 식 형태 세분
  IF s.ceremony_type = 'snap_only' THEN RETURN 'snap_only'; END IF;
  IF s.ceremony_type IN ('none', 'self_only') THEN
    IF s.ceremony_type = 'none' THEN RETURN 'no_wedding_travel'; END IF;
    RETURN 'self_no_ceremony';
  END IF;

  -- 스몰웨딩 분기
  IF s.wedding_style = 'small' THEN
    IF s.ceremony_type = 'hotel' THEN RETURN 'small_luxury'; END IF;
    IF s.ceremony_type = 'outdoor' THEN RETURN 'small_outdoor'; END IF;
    IF s.ceremony_type IN ('public_facility') THEN RETURN 'small_budget'; END IF;
    RETURN 'small_intimate';
  END IF;

  -- 1인 진행
  IF no_parents THEN RETURN 'single_household'; END IF;

  -- 원격
  IF is_overseas THEN RETURN 'remote_overseas'; END IF;

  -- 지방
  IF is_regional THEN RETURN 'regional'; END IF;

  -- 역할 기반
  IF s.role = 'groom' THEN RETURN 'standard_groom'; END IF;

  -- 호텔 식 형태 (표준 고급)
  IF s.ceremony_type = 'hotel' THEN RETURN 'luxury_hotel'; END IF;

  -- 기본 — 신부 표준
  RETURN 'standard_bride';
END;
$$;

COMMENT ON FUNCTION public.derive_wedding_persona IS
  '페르소나 시트 v1 자동 분류. 입력 필드들로 P1~P20 매핑 enum 계산.';

-- 트리거: insert/update 시 persona_mode 자동 계산. 사용자가 명시적으로 덮어쓰면
-- (예: 마이페이지에서 "이 페르소나로 보기" 선택) 그 값 유지하도록 NULL일 때만 채움.
-- 단순화: 일단 항상 계산해 덮어씀. 명시적 오버라이드는 별도 컬럼으로 분리하는 게
-- 깔끔하므로 그 시점에 분리.
CREATE OR REPLACE FUNCTION public.tg_user_wedding_settings_derive_persona()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.persona_mode := public.derive_wedding_persona(NEW);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_wedding_settings_derive_persona ON public.user_wedding_settings;
CREATE TRIGGER user_wedding_settings_derive_persona
  BEFORE INSERT OR UPDATE ON public.user_wedding_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_user_wedding_settings_derive_persona();

-- 기존 행 백필
UPDATE public.user_wedding_settings
SET persona_mode = public.derive_wedding_persona(user_wedding_settings)
WHERE persona_mode IS NULL;
