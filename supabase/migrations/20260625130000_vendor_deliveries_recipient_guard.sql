-- vendor_deliveries 수신자 컬럼잠금 트리거 — 수신자는 status/received_at 만 변경 가능.
-- 출처: docs/260624_codereview.md(전체감사) P1 — 14차원 §1(원자성/권한) · §2(인가).
--
-- 회귀(실DB 확인): vendor_deliveries 의 UPDATE 정책 vendor_deliveries_update 는
--   USING/ WITH CHECK = (auth.uid()=owner_user_id OR auth.uid()=recipient_user_id)
-- 로 owner·recipient 둘 다 통과시키나, 컬럼 단위 제약이 없어 **수신자**가 자기에게 온 배송 행의
--   title/message/file_paths/place_id/owner_user_id/inquiry_id/created_at
-- 까지 임의 변경할 수 있었다(수신자는 본래 "받음 확인"=status/received_at 만 바꿔야 함).
-- BEFORE UPDATE 트리거로 수신자 self-update 시 위 컬럼을 이전 값으로 강제 동결한다.
-- owner(발신 업체)·서버(service_role, auth.uid() IS NULL)는 그대로 통과.
-- (관용구: 이 레포는 트리거에서 service_role 을 auth.uid() IS NULL 로 식별한다. — 260625120000 참조.)
create or replace function public.guard_vendor_delivery_recipient_cols()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 발신 업체(owner)·서버(service_role)는 모든 컬럼 변경 허용.
  if auth.uid() is null or auth.uid() = old.owner_user_id then
    return new;
  end if;
  -- 수신자 self-update: status/received_at 외 모든 컬럼을 이전 값으로 강제(내용 변조 차단).
  new.inquiry_id        := old.inquiry_id;
  new.place_id          := old.place_id;
  new.owner_user_id     := old.owner_user_id;
  new.recipient_user_id := old.recipient_user_id;
  new.title             := old.title;
  new.message           := old.message;
  new.file_paths        := old.file_paths;
  new.created_at        := old.created_at;
  return new;
end;
$$;

drop trigger if exists guard_vendor_delivery_recipient_cols on public.vendor_deliveries;
create trigger guard_vendor_delivery_recipient_cols
  before update on public.vendor_deliveries
  for each row execute function public.guard_vendor_delivery_recipient_cols();
