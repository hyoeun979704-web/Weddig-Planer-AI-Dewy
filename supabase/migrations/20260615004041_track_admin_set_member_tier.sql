-- audit P2: admin_set_member_tier 가 DB 엔 있으나 repo 마이그레이션이 없었다(schema-in-DB ≠
-- repo). 현재 정의를 idempotent 하게 캡처해 추적성 복구. (동작 변경 없음.)
create or replace function public.admin_set_member_tier(p_user_id uuid, p_tier text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_tier NOT IN ('basic','gold','vip') THEN
    RAISE EXCEPTION 'invalid tier';
  END IF;
  UPDATE public.profiles SET member_tier = p_tier WHERE user_id = p_user_id;
END;
$function$;
