-- I7: 체크리스트 시작일·마감일 2축.
-- 기존 scheduled_date(마감일)에 더해 선택적 '시작일(준비 착수일)'을 추가한다.
-- nullable — 기존 행과 템플릿 자동 생성 항목은 시작일 없이 마감일만 가진다(백필 불필요).
-- 테이블의 기존 RLS(커플 공유 포함)를 그대로 상속하므로 정책 변경은 없다.
ALTER TABLE public.user_schedule_items
  ADD COLUMN IF NOT EXISTS start_date date;

COMMENT ON COLUMN public.user_schedule_items.start_date IS
  '선택적 시작일(준비 착수일). NULL이면 마감일(scheduled_date)만 사용. I7 2축.';
