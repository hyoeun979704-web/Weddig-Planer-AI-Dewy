-- 정렬에 "썸네일 있는 업체 먼저"를 반영하기 위한 생성컬럼.
-- data_completeness 가 main_image_url 유무를 반영하지 않아 사진 없는 업체가 상위로 오던 문제 해결
-- (260624 코드리뷰). 정렬: partner_rank → has_image → data_completeness → avg_rating.
alter table public.places
  add column if not exists has_image boolean
  generated always as (main_image_url is not null) stored;
