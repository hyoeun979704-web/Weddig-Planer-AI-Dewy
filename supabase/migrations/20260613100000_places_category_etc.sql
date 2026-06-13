-- '기타(etc)' 카테고리 기업회원이 업체 리스팅을 저장하면 places.category='etc' 가 되는데,
-- places_category_check 가 etc 를 허용하지 않아 upsert_my_listing 이 CHECK 위반으로 실패했다
-- ("저장에 실패했어요"). etc(스냅·DVD·네일 등 catch-all)를 허용 목록에 추가한다.
ALTER TABLE public.places DROP CONSTRAINT places_category_check;
ALTER TABLE public.places ADD CONSTRAINT places_category_check
  CHECK (category = ANY (ARRAY[
    'wedding_hall'::text,'studio'::text,'dress_shop'::text,'makeup_shop'::text,
    'hanbok'::text,'tailor_shop'::text,'honeymoon'::text,'appliance'::text,
    'jewelry'::text,'invitation_venue'::text,'planner'::text,'etc'::text
  ]));
