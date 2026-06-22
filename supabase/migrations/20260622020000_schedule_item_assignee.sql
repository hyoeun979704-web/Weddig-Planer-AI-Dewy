-- I5b: 커플 태스크 분배 — user_schedule_items 에 담당자(assigned_to) 추가.
-- 행=사용자별 구조라, 담당자는 '나/배우자' 상대값이 아니라 절대 UUID 로 저장한다
-- (양쪽이 같은 담당자를 보도록). 커플 병합(mergeCoupleSchedule)이 두 행 중 설정된
-- 값을 OR 결합한다. nullable — 기존 태스크/미지정은 NULL.
-- ON DELETE SET NULL: 담당자 계정이 삭제돼도 태스크는 남고 담당만 비운다.
ALTER TABLE public.user_schedule_items
  ADD COLUMN IF NOT EXISTS assigned_to uuid
  REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.user_schedule_items.assigned_to IS
  '이 태스크 담당자(커플 중 한 명의 user_id). NULL=미지정. 커플 병합 시 OR 결합.';
