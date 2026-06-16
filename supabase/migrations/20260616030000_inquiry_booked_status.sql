-- 계약 상태(S7) — 문의(상담)를 '예약 확정'으로 표시 가능하게 status 에 'booked' 추가.
-- 사설보정 등 etc 상세업체는 구조화 견적(quote) 경로가 없어 '예약완료' 표시가 불가했다.
-- 문의→예약 확정으로 인앱에 계약 상태를 남긴다. 설계: docs/260616_retouch_vendor_flow_simulation.md §4.
alter table public.place_inquiries drop constraint if exists place_inquiries_status_check;
alter table public.place_inquiries add constraint place_inquiries_status_check
  check (status in ('open', 'answered', 'closed', 'booked'));
