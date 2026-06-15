-- 실시간 채팅: quote_messages 를 supabase_realtime publication 에 추가해 INSERT 를 즉시
-- 구독자에게 전달(RLS 가 참여자에게만 전달). 폴링 대체.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'quote_messages'
  ) then
    alter publication supabase_realtime add table public.quote_messages;
  end if;
end $$;
alter table public.quote_messages replica identity full;
