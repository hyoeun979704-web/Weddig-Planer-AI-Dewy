-- I8-D: 하객이 참석 응답(invitation_rsvp)을 보내면 호스트(+연결된 배우자)에게 알림.
--
-- 지금까지 RSVP 가 와도 호스트는 대시보드를 직접 열어보기 전엔 알 수 없었다(dead-end).
-- notify_on_inquiry_answered 패턴을 그대로 따라 app_notifications 를 발행한다 — 발행되면
-- trg_push_on_app_notification 이 자동으로 FCM 푸시까지 보낸다(기존 인프라 재사용).
--
-- 알림은 비핵심이므로 INSERT 를 best-effort 로 감싼다(알림이 실패해도 하객 제출은 절대
-- 깨지지 않게). 트리거는 AFTER INSERT 라 직접 INSERT·submit_invitation_rsvp RPC 양쪽에서
-- 동일하게 동작한다.

CREATE OR REPLACE FUNCTION public.notify_on_rsvp_submit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host uuid;
  v_partner uuid;
  v_title text := '참석 응답이 도착했어요 🎉';
  v_body text;
  v_link text;
BEGIN
  SELECT user_id INTO v_host FROM public.invitations WHERE id = NEW.invitation_id;
  IF v_host IS NULL THEN
    RETURN NEW;
  END IF;

  v_body := left(COALESCE(NULLIF(btrim(NEW.name), ''), '하객'), 20)
            || '님이 ' || CASE WHEN NEW.is_attending THEN '참석' ELSE '불참' END
            || '으로 응답했어요.';
  v_link := '/invitation/' || NEW.invitation_id::text || '/rsvp';

  BEGIN
    INSERT INTO public.app_notifications (recipient_id, type, title, body, link)
    VALUES (v_host, 'rsvp_submitted', v_title, v_body, v_link);

    -- 커플 공유(I8-A): 연결된 배우자도 같은 RSVP 대시보드를 보므로 함께 알린다.
    SELECT CASE WHEN cl.user_id = v_host THEN cl.partner_user_id ELSE cl.user_id END
      INTO v_partner
      FROM public.couple_links cl
      WHERE cl.status = 'linked'
        AND (cl.user_id = v_host OR cl.partner_user_id = v_host)
      LIMIT 1;
    IF v_partner IS NOT NULL AND v_partner <> v_host THEN
      INSERT INTO public.app_notifications (recipient_id, type, title, body, link)
      VALUES (v_partner, 'rsvp_submitted', v_title, v_body, v_link);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- 알림 실패는 무시(하객 제출 보호).
    NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_rsvp_submit ON public.invitation_rsvp;
CREATE TRIGGER trg_notify_on_rsvp_submit
  AFTER INSERT ON public.invitation_rsvp
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_rsvp_submit();
