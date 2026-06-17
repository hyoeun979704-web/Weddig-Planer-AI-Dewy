-- 업체가 인앱 문의(place_inquiries)에 답변하면 문의한 소비자에게 알림 — 단방향 dead-end 해소.
--
-- e2e 감사(260617): 업체가 answer 를 저장해도 소비자에게 알림이 없어, 소비자가 업체 상세
-- 페이지의 문의 시트를 다시 열어보기 전엔 답변을 모름. notify_on_business_review 패턴을 그대로
-- 따라 답변 시 app_notifications 를 발행한다. 링크는 문의를 남긴 업체 상세(/vendor/:place_id).

CREATE OR REPLACE FUNCTION public.notify_on_inquiry_answered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- answer 가 새로 채워질 때만(빈→내용). 본문 수정/재답변도 알림.
  IF NEW.answer IS DISTINCT FROM OLD.answer
     AND NEW.answer IS NOT NULL
     AND btrim(NEW.answer) <> ''
     AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.app_notifications (recipient_id, type, title, body, link)
    VALUES (
      NEW.user_id,
      'inquiry_answered',
      '업체 답변이 도착했어요 💬',
      '문의하신 "' || left(COALESCE(NEW.title, '업체 문의'), 30) || '" 에 답변이 등록됐어요.',
      '/vendor/' || NEW.place_id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_inquiry_answered ON public.place_inquiries;
CREATE TRIGGER trg_notify_on_inquiry_answered
  AFTER UPDATE OF answer ON public.place_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_inquiry_answered();
