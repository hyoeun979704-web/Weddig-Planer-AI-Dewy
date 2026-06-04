-- product-resync 오탐 비활성화 방지용 grace 카운터.
-- Naver productId 는 재등록 시 바뀌므로, 한 번 못 찾았다고 즉시 is_active=false 하지 않고
-- 연속 N회 못 찾을 때만 비활성화한다. (product-resync 의 다단계 매칭과 함께 동작)
alter table public.products
  add column if not exists stale_count integer not null default 0;
