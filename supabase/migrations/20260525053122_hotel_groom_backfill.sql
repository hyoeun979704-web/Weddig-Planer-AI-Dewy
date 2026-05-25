-- Round 15 P1 — Round 8 priority swap 영향받은 'hotel-groom' 행 backfill.
--
-- Round 8 이 derive_wedding_persona 우선순위 변경: hotel(ceremony_type) > role=groom.
-- 그 결과 신규 사용자는 hotel+groom → luxury_hotel 분류. 그러나 기존 사용자
-- (ceremony_type='hotel' AND role='groom') 는 persona_mode='standard_groom' 상태 stuck.
-- Round 9 self-review 가 backfill UPDATE 제거 (override 보존 우려) → '자가치유 의존'.
-- 사용자가 user_wedding_settings 의 어느 컬럼도 안 건드리면 persona_mode 영구 stale.
--
-- 171747 dual_ceremony 와 동일 패턴: DISABLE TRIGGER → 좁은 WHERE → ENABLE TRIGGER.
-- 좁은 WHERE 로 override 안전성 확보 (standard_groom 자동 derive 결과만 대상).
-- override 한 사용자는 다른 persona_mode 값일 테니 영향 X.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'b_derive_persona') THEN
    EXECUTE 'ALTER TABLE public.user_wedding_settings DISABLE TRIGGER b_derive_persona';
  ELSIF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'user_wedding_settings_derive_persona') THEN
    EXECUTE 'ALTER TABLE public.user_wedding_settings DISABLE TRIGGER user_wedding_settings_derive_persona';
  END IF;
END $$;

-- hotel + groom + 자동 derive 였던 standard_groom 행만 luxury_hotel 로 정정.
-- 다른 조건(임신/재혼/국제/스몰/공공 등)은 persona_mode 가 standard_groom 이 아닐 테니
-- 자연스럽게 제외됨.
UPDATE public.user_wedding_settings
SET persona_mode = 'luxury_hotel'
WHERE ceremony_type = 'hotel'
  AND role = 'groom'
  AND persona_mode = 'standard_groom';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'b_derive_persona') THEN
    EXECUTE 'ALTER TABLE public.user_wedding_settings ENABLE TRIGGER b_derive_persona';
  ELSIF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'user_wedding_settings_derive_persona') THEN
    EXECUTE 'ALTER TABLE public.user_wedding_settings ENABLE TRIGGER user_wedding_settings_derive_persona';
  END IF;
END $$;
