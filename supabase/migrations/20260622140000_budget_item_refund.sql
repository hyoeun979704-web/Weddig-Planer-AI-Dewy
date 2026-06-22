-- 예산 항목 환불 내역 — 계약 취소·보증금 반환·100원 인증 환불 등 "받은 돈"을 기록.
-- is_refund=true 인 항목은 지출 합계에서 **차감**(순지출)된다. 기본 false 라 기존 행·기존
-- 입력 흐름(컬럼 미지정 insert)에 영향 0. 설계: docs/260622_personalization_plan.md(P2 예산).
alter table public.budget_items
  add column if not exists is_refund boolean not null default false;

comment on column public.budget_items.is_refund is
  '환불 내역 여부 — true 면 지출 합계에서 차감(순지출).';
