-- Round 11 self-review fix — dual_ceremony 백필.
--
-- Round 10 에서 derivePersonaMode + DB derive_wedding_persona 에 ceremony_type
-- ='dual_ceremony' → international 매핑 추가했지만 기존 행 자동 갱신 안 됨.
-- ceremony_type='dual_ceremony' 이고 persona_mode != 'international' 인 행만
-- 좁게 정정 (사용자가 명시 override 한 행은 제외 — view-as 등으로 다른 페르소나로
-- 본 사람을 덮어쓰지 않음. 단, 'standard_bride' 같은 단순 자동계산 결과는 갱신 대상).
--
-- Round 9 정립한 안전 패턴: DISABLE TRIGGER → 좁은 WHERE 로 정확 row 식별 →
-- UPDATE → ENABLE TRIGGER. 트리거 안 거치면 override 가드 우회 없이 직접 set 가능.
--
-- WHERE 절 의도:
--   - ceremony_type='dual_ceremony': 영향받는 row 만 (인덱스로 빠름)
--   - persona_mode='standard_bride': "자동계산 default" 인 행만 (override 안전).
--     'international' 이면 이미 정정됨, 다른 값(remarriage/pregnancy 등) 이면 derive
--     우선순위로 정당화 가능한 결과라 손대지 않음.

-- Round 15 P0 fix — trigger 이름이 20260524010000_venue_trigger_guards.sql 에서
-- 'user_wedding_settings_derive_persona' → 'b_derive_persona' 로 rename 됨. 이전
-- 코드는 존재하지 않는 trigger 이름 참조 → 새 환경 deploy 시 마이그레이션 abort.
-- DO 블록으로 둘 다 시도 (어느 환경에서도 동작 보장).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'b_derive_persona') THEN
    EXECUTE 'ALTER TABLE public.user_wedding_settings DISABLE TRIGGER b_derive_persona';
  ELSIF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'user_wedding_settings_derive_persona') THEN
    EXECUTE 'ALTER TABLE public.user_wedding_settings DISABLE TRIGGER user_wedding_settings_derive_persona';
  END IF;
END $$;

-- (1) dual_ceremony 매핑 누락분 정정.
UPDATE public.user_wedding_settings
SET persona_mode = 'international'
WHERE ceremony_type = 'dual_ceremony'
  AND persona_mode = 'standard_bride';

-- (2) pregnancy &gt; international 우선순위 swap 으로 영향받는 행 정정.
-- wedding_country!=KR (또는 KR 거주자가 해외식) + pregnant=true 인 사용자가 기존엔
-- 'international' 받았지만 이제 'pregnancy' 받아야 함.
UPDATE public.user_wedding_settings
SET persona_mode = 'pregnancy'
WHERE COALESCE(pregnant, FALSE) = TRUE
  AND persona_mode = 'international';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'b_derive_persona') THEN
    EXECUTE 'ALTER TABLE public.user_wedding_settings ENABLE TRIGGER b_derive_persona';
  ELSIF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'user_wedding_settings_derive_persona') THEN
    EXECUTE 'ALTER TABLE public.user_wedding_settings ENABLE TRIGGER user_wedding_settings_derive_persona';
  END IF;
END $$;
