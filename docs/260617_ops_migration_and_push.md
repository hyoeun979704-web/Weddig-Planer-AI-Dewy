# 260617 운영 점검 — 마이그레이션 적용 & 푸시 자동화 (코드 아님/인프라)

> e2e 감사에서 드러난 **코드가 아닌 운영(ops) 갭** 2건 + 코드로 해소한 1건(기존 업체 인수 유도).
> sandbox 에서 라이브 DB/FCM 접근 불가 → 절차·근거만 정리(직접 적용은 운영자).

## 🔴 1. 마이그레이션 라이브 적용 — 자동화 없음(umbrella 원인)

**근거**: `.github/workflows/deploy-functions.yml` 은 **`supabase functions deploy` 만** 수행하고
**`supabase db push` 가 없다.** 즉 `supabase/migrations/*.sql` 은 **자동 적용되지 않는다.**
레포엔 있는데 라이브 DB엔 미적용 → 오늘 증상들("직접전환 미반영"·"포트폴리오 미노출"·
"이름만 기업회원")의 **공통 뿌리**.

**지금 적용 필요한(오늘 추가) 마이그레이션**:
- `20260616050000_place_media_portfolio.sql` — place_media venue/style/description 컬럼(없으면 포폴 저장 실패)
- `20260617010000_admin_review_business_grants_role.sql` — 승인 시 business 역할 부여 + 백필
- `20260617020000_admin_member_affiliation.sql` — 회원유형 원자적 전환 RPC
- `20260617030000_notify_on_inquiry_answered.sql` — 문의 답변 알림 트리거
- (그 외 미적용분이 있을 수 있음 — `schema_migrations` 히스토리와 repo 대조 필요)

**적용 방법 (택1)**:
1. **수동(즉시)**: 로컬에서 `supabase link --project-ref qabeywyzjsgyqpjqsvkd && supabase db push`
   (DB 비밀번호 필요). 또는 Supabase 대시보드 SQL 에디터에 해당 .sql 붙여넣기.
2. **CI 자동화(권장, 재발 방지)**: 배포 워크플로에 db push 추가 — 단 `SUPABASE_DB_PASSWORD`
   (또는 access token) 시크릿 + 마이그레이션 리뷰 전제가 필요(자동 적용은 파괴적 변경 위험이
   있어 팀 결정 필요). 예시 step:
   ```yaml
   # deploy-functions.yml(또는 신규 deploy-db.yml) 에 추가
   - run: supabase db push --linked
     env:
       SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
   ```
   paths 필터를 `supabase/migrations/**` 로 두어 마이그레이션 변경 시에만 실행 권장.

> ⚠️ 본 저장소엔 시크릿을 설정할 수 없어 워크플로를 자동 커밋하지 않음(없는 시크릿 참조 시
> 배포 실패). 운영자가 시크릿 추가 후 위 step 을 켜는 것을 권장.

## ⚠️ 2. FCM 푸시 자동화 — 미연결

**근거**: `supabase/functions/send-push/index.ts` 는 FCM 전송 **HTTP 엔드포인트**(수동 POST)다.
`app_notifications` INSERT 가 자동으로 send-push 를 호출하지 않는다 → 인앱 알림(DB row)은 쌓이나
**푸시는 안 간다**(사용자가 앱을 열어야 확인).

**연결 방안(택1, 라이브 검증 필요)**:
1. **DB 트리거 + pg_net**: `app_notifications` AFTER INSERT 트리거가 `pg_net.http_post` 로
   send-push 호출. pg_net 확장 + service 키/함수 URL 을 DB 설정에 보관 필요. (서버측 완결, 권장)
2. **엣지/서버 경유**: 알림 생성 RPC 들이 직접 send-push 를 호출(현재 RPC 다수라 분산).
3. **전제 점검**: 사용자 FCM 토큰 등록 경로(네이티브)와 `send-push` 의 토큰 조회 로직이 실제
   동작하는지 먼저 확인(토큰 없으면 트리거해도 무의미).

→ 인프라·시크릿·실기기 검증 동반이라 코드만으로 안전히 못 끝냄. 별도 작업으로 분리.

## ✅ 3. 기존(수집) 업체 인수 유도 — 코드로 해소

미입점 업체(`places.owner_user_id = null`)는 쌍방 기능에서 제외되는데, 전환 경로(`request_place_claim`/
BusinessClaim)가 검색에 묻혀 발견성이 낮았다. → 업체 상세페이지에서 **기업회원**이 미입점 업체를
보면 **"이 업체가 내 업체인가요? 인수 신청"** CTA 노출 → `/business/claim?q=업체명` 자동검색.
(`usePlaceDetail` 에 owner_user_id 노출, VendorDetailPage CTA, BusinessClaim ?q= prefill.)

## 검증
- `npm run build` 0 error · 변경 파일 lint 0 error(기존 any 경고만). 클라 경로(인수 CTA)는 빌드 검증,
  실제 노출은 owner_user_id 데이터 기준 — 라이브 확인 권장.
