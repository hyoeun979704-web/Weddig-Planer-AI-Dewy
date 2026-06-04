-- places.city/district 를 NOT NULL DEFAULT '' 로 만든 마이그레이션
-- (20260604010456_places_identity_plain_unique_index) 이후, null 을 명시적으로
-- 보내던 기존 쓰기 경로가 NOT NULL 위반으로 깨지는 회귀를 수정한다.
--
-- 영향받던 경로:
--   · src/pages/admin/AdminPlaceEdit.tsx  — update({ city: form.city?.trim() || null, ... })
--   · public.upsert_my_listing RPC (벤더 자가 등록) — INSERT/UPDATE places ... city = p_city
-- 둘 다 시/도·구 입력을 비우면 null 을 전달 → NOT NULL 위반.
--
-- 개별 writer 를 고치는 대신 BEFORE 트리거로 null→'' 정규화해 현재/미래의 모든
-- writer 를 한 번에 안전하게 만든다. (DEFAULT '' 는 컬럼을 '생략'할 때만 적용되고
-- null 을 '명시적으로' 넣으면 적용되지 않으므로 트리거가 필요.)
create or replace function public.places_normalize_region()
returns trigger language plpgsql as $$
begin
  new.city := coalesce(new.city, '');
  new.district := coalesce(new.district, '');
  return new;
end;
$$;

drop trigger if exists trg_places_normalize_region on public.places;
create trigger trg_places_normalize_region
  before insert or update on public.places
  for each row execute function public.places_normalize_region();
