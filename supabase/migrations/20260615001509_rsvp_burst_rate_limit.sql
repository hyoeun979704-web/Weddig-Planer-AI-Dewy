-- audit A4(부분): 익명 RSVP 도배 완화. 기존 cap(총 500건)에 더해, 같은 청첩장에 10분 내
-- 30건 초과 INSERT 를 차단하는 burst 제한을 추가한다(정상 하객 흐름엔 충분히 여유,
-- 봇의 급속 도배는 차단). 완전한 anti-spam(IP/캡차)은 엣지 레이어 필요 — 별도 트랙.
create or replace function public.check_invitation_rsvp_cap()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
BEGIN
  IF (
    SELECT count(*) FROM public.invitation_rsvp
    WHERE invitation_id = NEW.invitation_id
  ) >= 500 THEN
    RAISE EXCEPTION 'rsvp_limit_reached';
  END IF;
  IF (
    SELECT count(*) FROM public.invitation_rsvp
    WHERE invitation_id = NEW.invitation_id
      AND created_at > now() - interval '10 minutes'
  ) >= 30 THEN
    RAISE EXCEPTION 'rsvp_rate_limited';
  END IF;
  RETURN NEW;
END;
$function$;
