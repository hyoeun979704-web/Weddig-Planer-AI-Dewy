-- hall_type CHECK 를 수집 프롬프트(category-prompts.ts)의 enum 과 일치시킴.
-- 기존: 채플/가든/컨벤션/웨딩홀/스몰웨딩 → 호텔·하우스·야외·한옥 추가(실제 홀 타입).
alter table public.place_halls drop constraint if exists place_halls_hall_type_check;
alter table public.place_halls add constraint place_halls_hall_type_check
  check (hall_type = any (array[
    '채플','가든','컨벤션','웨딩홀','스몰웨딩','호텔','하우스','야외','한옥'
  ]));
