-- 신선도 지표 정합성: '수집 시각' 전용 컬럼. last_source_date 는 소스(블로그) 발행일이라
-- scoring 의 source-recency 신호로 유지하고, 신선도(재수집 필요 판단)는 last_collected_at
-- (우리가 마지막으로 수집/검증한 시각)으로 잰다. updated_at 은 트리거·마이그레이션에 오염돼 부적합.
alter table public.places add column if not exists last_collected_at timestamptz;

-- 기존 행 백필: 알려진 소스일 → 없으면 최초 수집 시각(created_at). updated_at 은 오염원이라 제외.
update public.places
  set last_collected_at = coalesce(last_source_date, created_at)
  where last_collected_at is null;
