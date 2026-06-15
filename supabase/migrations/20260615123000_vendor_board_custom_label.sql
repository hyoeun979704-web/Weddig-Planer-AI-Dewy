-- 사용자 커스텀 슬롯 지원 — 쓰레드처럼 사람마다 필요한 업체 항목이 달라, 코드 택소노미(19종)에
-- 없는 슬롯을 사용자가 직접 추가할 수 있게 한다. 커스텀 슬롯은 slot_key='custom:<uuid>' 이고
-- 표시 라벨을 custom_label 에 저장한다(코드 슬롯은 custom_label = null).
alter table public.vendor_board_items
  add column if not exists custom_label text;
