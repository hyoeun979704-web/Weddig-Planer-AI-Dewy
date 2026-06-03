# instagram-collect-reels

유튜브 `tip_channels` RSS 수집의 인스타 대응판. 큐레이션한 **비즈니스/크리에이터**
계정의 최근 릴스를 Graph API **Business Discovery** 로 수집 → 썸네일을 공개 버킷
`tip-thumbnails` 에 재호스팅 → `tip_instagrams` 에 적재(검토 대기).

## 왜 비즈니스 계정만?
- Instagram Basic Display API 는 2024-12-04 종료. 개인 계정은 어떤 공개 API 로도 접근 불가.
- Graph API `business_discovery.username(...)` 는 **비즈니스/크리에이터 계정**의 미디어만 조회 가능
  (영상/릴스에 한해 `thumbnail_url` 제공). 받은 썸네일 CDN URL 은 referrer-lock·만료라
  반드시 재호스팅한다(이 함수가 처리).

## 배포 전 Meta 셋업 (사장님 작업)
1. Facebook 앱 생성 + Instagram **비즈니스/크리에이터** 계정을 FB 페이지에 연결.
2. `instagram_basic` 권한 + (제3자 계정 조회는) **App Review/Advanced Access** 승인.
3. **장기(long-lived) 액세스 토큰** 발급 + 호출 주체 IG 비즈니스 계정 id 확보.

## 환경변수 (Supabase 함수 secrets)
- `IG_GRAPH_TOKEN` — 장기 비즈니스 토큰
- `IG_USER_ID` — Business Discovery 호출 주체 IG 비즈니스 계정 id
- `GRAPH_VERSION` — 선택, 기본 `v21.0`

## 배포
```
supabase functions deploy instagram-collect-reels
supabase secrets set IG_GRAPH_TOKEN=... IG_USER_ID=...
```

## 호출
- 어드민: Instagram 큐레이션 화면 → "릴스 자동 수집" 패널 → "지금 수집"
- 또는 cron(pg_cron)에서 service_role 로 POST. Body(선택): `{ limitPerAccount, autoApprove }`

수집된 릴스는 기본 `moderation_status='pending'` 으로 들어가 운영자 검토 후 노출.
`autoApprove:true` 면 바로 노출(승인). 중복(url)은 건너뜀(신규만 적재).
