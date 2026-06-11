-- B3 수익화 1차: 파트너 이벤트 상단 고정(프로모션 노출) 기간.
-- 운영자가 제휴 계약 후 설정 (초기엔 SQL/어드민 수동 — 셀프서브 결제는 2차).
ALTER TABLE public.business_events ADD COLUMN IF NOT EXISTS featured_until timestamptz;
