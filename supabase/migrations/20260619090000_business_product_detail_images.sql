-- 상품 상세 이미지(다중) — 이벤트와 동일 정책(상세는 이미지로 구성 가능, 내용 선택).
--
-- 기존 business_products 는 단일 image_url(썸네일)만 보유 → 상세에서 이미지 1장뿐.
-- detail_images: 상품 상세페이지 본문에 추가로 보여줄 이미지들(선택, 다중).
-- nullable·default '{}'·idempotent → 기존 상품 행 그대로 동작(호환).

alter table public.business_products add column if not exists detail_images text[] not null default '{}';

comment on column public.business_products.detail_images is '상품 상세 본문 추가 이미지(선택, 다중). 첨부 시 설명 없이 이미지로 상세 구성 가능.';
