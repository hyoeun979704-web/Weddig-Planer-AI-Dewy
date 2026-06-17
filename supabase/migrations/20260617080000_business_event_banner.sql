-- 이벤트 배너(카드) + 상세 이미지 — #326 기획 기능2(이벤트만 배너+상세).
--
-- 기존 business_events 는 제목·설명·기간만 보유(이미지 없음) → 소비자 상세에서 텍스트만 노출.
-- 레퍼런스 조사(WeddingPro·NN/g): 이벤트는 내용이 풍부해 "배너(카드) → 상세" 동선이 정당.
-- (쿠폰은 inline 권장이라 배너+상세 미적용 — 기획 문서 참조.)
--
-- banner_image_url: 카드/목록에 노출되는 대표 배너(앱에서 등록 필수 검증).
-- detail_images: 이벤트 상세 본문에 추가로 보여줄 이미지들(선택, 다중).
-- 둘 다 nullable·idempotent → 기존 이벤트 행은 그대로 동작(호환).

alter table public.business_events add column if not exists banner_image_url text;
alter table public.business_events add column if not exists detail_images text[] not null default '{}';

comment on column public.business_events.banner_image_url is '이벤트 대표 배너(카드/목록 노출, 앱에서 등록 필수 검증).';
comment on column public.business_events.detail_images is '이벤트 상세 본문 추가 이미지(선택, 다중).';
