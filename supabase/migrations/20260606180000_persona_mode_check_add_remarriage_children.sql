-- persona_mode CHECK 제약에 신규 모드 remarriage_with_children 추가.
--
-- 20모드 활성화 시 코드/트리거엔 추가했으나 이 CHECK 에 누락 → 트리거가
-- persona_mode='remarriage_with_children' 로 세팅할 때 CHECK 위반으로 행 UPDATE 가
-- 통째 실패(재혼+자녀 사용자의 저장 플로우가 깨짐). DB 임퍼소네이트 e2e 로 발견.
-- (budget_analytic/designer_late/first_timer 는 기존 enum 에 이미 있어 CHECK 에 포함됨)
ALTER TABLE public.user_wedding_settings DROP CONSTRAINT IF EXISTS user_wedding_settings_persona_mode_check;
ALTER TABLE public.user_wedding_settings ADD CONSTRAINT user_wedding_settings_persona_mode_check
  CHECK (persona_mode IS NULL OR persona_mode = ANY (ARRAY[
    'standard_bride','standard_groom','luxury_hotel','budget_analytic','designer_late',
    'first_timer','regional','remarriage','remarriage_with_children','remote_overseas',
    'single_household','small_intimate','small_outdoor','small_luxury','small_budget',
    'self_no_ceremony','no_wedding_travel','snap_only','pregnancy','international'
  ]::text[]));
