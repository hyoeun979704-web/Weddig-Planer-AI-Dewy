-- ② 신뢰 신호: 업체 응답 통계(집계만, PII 없음)를 공개 노출해 "문의하면 답 온다"는 신뢰를
-- 높인다. place_inquiries 는 PII(내용·연락처)가 있어 직접 SELECT 는 막혀 있으므로, 정의자
-- 권한 함수로 '수치'만 반환한다.
create or replace function public.get_place_inquiry_stats(p_place_id uuid)
 returns jsonb
 language sql
 security definer
 set search_path to 'public'
 stable
as $function$
  select jsonb_build_object(
    'total', count(*),
    'answered', count(*) filter (where answered_at is not null),
    'recent_30d', count(*) filter (where created_at > now() - interval '30 days'),
    'avg_response_hours',
      round(avg(extract(epoch from (answered_at - created_at)) / 3600.0)
            filter (where answered_at is not null))::int
  )
  from public.place_inquiries
  where place_id = p_place_id;
$function$;

revoke all on function public.get_place_inquiry_stats(uuid) from public;
grant execute on function public.get_place_inquiry_stats(uuid) to anon, authenticated;
