# AI 업로드 사진 30일 자동 삭제 — 운영 가이드

## 왜 만들었나

개인정보처리방침 페이지 (`src/pages/Privacy.tsx`) 에 다음과 같이 약속해 둠:

> 사용자 업로드 사진 / 처리 후 30일 / 자동 삭제

이 약속은 코드로 보장되어야 법적 리스크가 없다. 이 가이드는 그 자동 삭제 시스템
(Edge Function + pg_cron + SECURITY DEFINER 함수) 의 배포·운영·점검 절차다.

## 구성 요소

| 파일 | 역할 |
|---|---|
| `supabase/functions/cleanup-ai-uploads/index.ts` | 실제 삭제 로직 (Storage API `.remove()`) |
| `supabase/migrations/20260520120000_ai_uploads_30day_cleanup.sql` | `list_expired_ai_uploads()` 헬퍼 함수 + pg_cron 매일 스케줄 |

## 1차 배포 절차

### 1. Edge Function 배포

```bash
supabase functions deploy cleanup-ai-uploads
```

### 2. Vault 시크릿 등록 (1회, 수동)

Supabase Dashboard → SQL Editor 에서 한 번만 실행:

```sql
SELECT vault.create_secret(
  'https://qabeywyzjsgyqpjqsvkd.supabase.co',
  'project_url'
);

SELECT vault.create_secret(
  'eyJhbGciOiJIUzI1NiIs...',  -- service_role key (Settings → API)
  'service_role_key'
);
```

⚠️ `service_role` key 는 절대 클라이언트 코드/repo에 두지 말고 Vault 또는
환경변수에만 둔다. 위 SQL 도 한 번 실행 후 히스토리에서 지우는 게 좋다.

### 3. 마이그레이션 적용

```bash
supabase db push
```

이걸로 `list_expired_ai_uploads()` 함수 생성 + `cleanup-ai-uploads-daily`
cron job 등록이 끝난다.

### 4. 즉시 1회 검증

```sql
-- cron 등록 확인
SELECT jobname, schedule, command FROM cron.job WHERE jobname = 'cleanup-ai-uploads-daily';

-- Edge Function 직접 호출 테스트 (PowerShell)
-- $env:SERVICE_ROLE_KEY = "..."
-- curl.exe -X POST https://qabeywyzjsgyqpjqsvkd.supabase.co/functions/v1/cleanup-ai-uploads `
--   -H "Authorization: Bearer $env:SERVICE_ROLE_KEY"

-- 또는 SQL 에서 cron 잡을 한 번 강제 실행
SELECT cron.schedule_in_database('cleanup-ai-uploads-daily-test', '* * * * *', $$ ... $$, 'postgres');
```

응답:

```json
{
  "started_at": "2026-05-20T18:00:00.000Z",
  "retention_days": 30,
  "deleted_total": 0,
  "by_bucket": { "dress-uploads": 0, "dress-results": 0 },
  "errors": []
}
```

`errors` 가 비어있으면 정상.

## 정기 점검

### 매주 1회 — cron 실행 이력 확인

```sql
SELECT
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details
WHERE jobname = 'cleanup-ai-uploads-daily'
ORDER BY start_time DESC
LIMIT 10;
```

`status = 'succeeded'` 가 매일 1회 떠야 한다.

### 매월 1회 — 30일 초과 파일이 정말 없는지 표본 검증

```sql
SELECT bucket_id, COUNT(*) AS oldfiles
FROM storage.objects
WHERE bucket_id IN ('dress-uploads', 'dress-results')
  AND created_at < now() - interval '30 days'
GROUP BY bucket_id;
```

각 버킷별 카운트가 **0** 이어야 한다. 0 이 아니면 cron 이 실패하고 있다는 뜻 —
`cron.job_run_details` 의 `return_message` 확인.

## 보존 기간 변경 시

정책을 30일에서 다른 값(예: 60일) 으로 바꾸려면:

1. `src/pages/Privacy.tsx` 의 문구 수정
2. `supabase/functions/cleanup-ai-uploads/index.ts` 의 `RETENTION_DAYS` 상수 수정
3. Function 재배포 (`supabase functions deploy cleanup-ai-uploads`)

cron 스케줄 자체는 그대로 둬도 됨 (호출만 매일 발생, 만료 기준은 함수가 결정).

## 흔한 문제 / FAQ

### Q. cron 은 도는데 deleted_total 이 항상 0
A. 정상일 수 있음 (30일 지난 파일이 없으면 0). 표본 검증으로 실제 30일 초과
   파일이 없는지 확인.

### Q. Edge Function 호출이 401 Unauthorized
A. Vault 에 등록한 `service_role_key` 가 잘못됐거나 만료됨. 다시 등록:
   ```sql
   UPDATE vault.secrets SET secret = '<new-key>' WHERE name = 'service_role_key';
   ```

### Q. `vault.decrypted_secrets` 에서 secret not found
A. 1차 배포 절차 2단계 (Vault 시크릿 등록) 가 누락. 재실행.

### Q. 사용자가 자기 사진을 30일 전에 미리 삭제하고 싶다고 요청
A. 마이페이지에서 본인 폴더(`dress-uploads/{userId}/`) 의 파일을 직접 삭제할 수
   있도록 RLS 정책이 이미 열려있음 (`20260501100000_dress_samples_catalog.sql`
   의 `dress_uploads_owner_delete`). 추가 UI 가 있으면 더 좋다.

### Q. 결과 파일(`dress-results`) 도 삭제되면 사용자가 결과물을 못 보지 않나
A. 의도된 동작. 사용자에게 "결과는 30일간 보관" 임을 UI 에서 명시하고,
   소중한 결과는 본인이 다운로드해서 갤러리에 저장하도록 안내한다.
