# 카드뉴스·마케팅 자동화 — 세션 핸드오프 (2026-06-27)

> 이 세션에서 한 일 + 다음 세션이 이어받을 것을 **빠짐없이** 정리. 다음 세션은 이 문서만 읽으면
> 바로 이어서 작업 가능. (작성: card-news-notion-setup 세션)

---

## 0. TL;DR — 지금 상태

- ✅ **인스타 카드뉴스 파이프라인** 거의 완성 (생성·렌더·어드민 편집/미리보기/다운로드/캡션분석). **PR #493 머지됨.**
- ✅ **블로그 원고 품질 + 워드프레스 포맷** 강화. **PR #494 머지됨.**
- ⏭️ **다음 = ② 워드프레스 REST 자동 발행 구축** (미구현). 준비물: WP 사이트 URL + Application Password.
- ⚠️ 미연결/검증 필요: 큐→초안 자동생성, draft-generator 재배포 검증, Meta 발행토큰, 임시함수/파일 정리.

**환경**: Supabase project_id `qabeywyzjsgyqpjqsvkd` (dewy_wedding_planer_AI) · 브랜치 `claude/card-news-notion-setup-1subq6`
(#493·#494로 main 머지 완료) · 스택 Vite+React18+TS+Supabase.

---

## 1. 인스타 카드뉴스 — 완료된 것

### 1-1. 주제 큐 (`instagram_topics`)
- 마이그레이션 `supabase/migrations/20260627090000_instagram_topics_queue.sql` (적용·머지 완료).
- 노션 "콘텐츠 캘린더" DB **`389c032cda8080548976cbfd7df72faa`**(원본) / `3c7c032cda80833b8d12014520b1d172`(복사본, 내용 동일)
  에서 **카드뉴스 주제 7건** 시드 완료. `notion_page_id` UNIQUE 로 idempotent.
- 컬럼: title·subtitle·brief(카드별 풀스크립트=grounding)·hashtags·notion_page_id·asset_folder_url·
  scheduled_publish_date·priority·status(queued→drafting→drafted→skipped→done)·draft_id.
- **노션 읽기 주의**: 표준 SQL 쿼리(`notion-query-data-sources`)는 **Business 플랜 전용**이라 막힘 →
  `notion-search`(data_source_url) + `notion-fetch`(페이지) 조합으로 읽음. **NOTION_TOKEN 은 셸에 안 잡힘**
  (Supabase 시크릿이나 다른 곳에 있을 수 있음). Notion MCP 커넥션으로 충분.

### 1-2. 렌더러 (`supabase/functions/instagram-card-renderer/index.ts`) — **배포됨**(#493 머지로 자동 재배포 확인)
Figma 227-2 **사진 합성 템플릿** 1:1 재현. 핵심 수정 3가지(다음 세션이 꼭 기억):
1. **폰트 woff2 → OTF**: satori 는 woff2 를 **못 읽음** → 그동안 SUITE 가 조용히 Pretendard 로 폴백되던 버그.
   OTF 사용으로 해결. URL: `https://cdn.jsdelivr.net/gh/sun-typeface/SUITE@2.0.0/fonts/static/otf/SUITE-{ExtraBold,SemiBold,Medium,Regular}.otf`.
   Pretendard 도 OTF: `.../orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-*.otf`.
   **검증**: Supabase egress 가 jsdelivr 에 닿음(pg_net http_get → 200 확인). 로컬 샌드박스는 jsdelivr 차단됨.
2. **resvg-wasm**: `import { Resvg, initWasm }` (named) 사용. **default import 는 BOOT_ERROR(503)** 유발.
3. **사진 framing**: `bgImg()` 헬퍼 — `image_fit`(cover/contain)·`image_zoom`(50~300%)·`image_pos_x/y`(0~100%).
   부모 overflow hidden 으로 확대 시 크롭.

자동 도출(운영자는 카드별 `image_url`·`handle` 만 입력하면 됨):
- 표지 우상단 **썸네일 3장** = 본문 카드 image_url 들 (없으면 카드 자체 thumb_urls).
- CTA **2×2 그리드** = 본문 카드 image_url 들 (최대 4).
- 표지 **핸들 3줄** = 본문 카드 handle 모음(중복 제거).

Figma 정확 스펙(재현 시 참고): 표지 제목 **80px** ExtraBold · 본문 제목 **64px** · 부제/설명 **48px** · CTA 카피 50px
· 그라데이션 스톱 표지/CTA `71.635%→83.654%→100%`, 본문 `75.481%→87.019%` (색 `rgba(252,215,219,.62)`→`rgba(249,182,189,.8)`)
· 썸네일 250×250 (left 770, top 60/360/660, 핑크 #f6909b 5px) · 그리드 415×415 gap40 · 폰트 **SUITE Variable**.
Figma 파일 `I2PhTkgPVOAebr0k3cLKp6`, 노드 `227-2`(전체)·`248-14`(표지)·`248-52`(CTA)·`248-25`(본문1).

### 1-3. 카피 생성기 (`supabase/functions/instagram-draft-generator/index.ts`) — ⚠️ **재배포 검증 필요**
- 캡션 IG-로직 강화(톤·페르소나 불변): 첫 줄 검색 키워드(SEO), 훅+가치 첫 2줄(폴드), CTA 3종(저장·DM공유·댓글질문).
- **분석 레이어**: 출력 전 자가 점검 → `analysis` 출력 → `caption_analysis` 컬럼 저장
  (`{score, checks{hook·seo·fold·save/share/comment_cta·tone}, keywords[], notes}`).
- 컬럼 추가 마이그: `supabase/migrations/20260627100000_instagram_caption_analysis.sql` (적용 완료).
- **⚠️ 확인할 것**: #493/#494 머지 후 `list_edge_functions` 에서 instagram-draft-generator 의 `updated_at` 이
  렌더러보다 **이전 타임스탬프**였음 → **재배포 안 됐을 수 있음**. 어드민에서 캡션 분석 패널이 안 채워지면
  `mcp__Supabase__deploy_edge_function` 으로 이 함수만 재배포할 것(파일 그대로).

### 1-4. 어드민 (`src/features/console/pages/AdminInstagramPostEdit.tsx`, `/admin/instagram-posts/:id`)
운영자 수동 발행 플로우 전부 구현:
- 카드별 **배경 사진 업로드**(ImageUploader → `instagram-cards` 버킷) + **출처 핸들** + **framing 슬라이더**(채움·확대·좌우·상하).
- **"카드 렌더"** 버튼 → `instagram-card-renderer` 호출 → card_image_urls 갱신.
- **라이브 미리보기** (`src/features/console/components/InstagramCardPreview.tsx`) — 브라우저 CSS 로 Figma 템플릿
  미러(앱 전역 SUITE Variable 웹폰트 `index.css:1` 사용). 편집 즉시 반영, 배포 불필요.
- **캡션 전체복사**(캡션+해시태그) · **이미지 다운로드**(카드 PNG 전체) · **"업로드 완료"**(상태→published).
- **캡션 분석 패널**(점수·체크칩·검색어·메모) — generator 가 채운 caption_analysis 표시.
- 캡션 텍스트 편집은 기존 유지(`edit-caption`).

### 1-5. 최종 플로우 (의도)
`초안 자동화 → 어드민 적재(카드 6장+캡션) → 운영자 편집·다운로드+캡션복사 → "업로드 완료"`
(Meta 토큰 미준비라 **수동 발행**. 토큰 준비되면 instagram-publisher 로 자동 발행 전환 가능.)

### 1-6. 사진 소스 (운영자 담당)
- 운영자가 **어드민에서 카드별 사진 직접 업로드**(현재 동작 방식). Drive 자동 연동은 미구현.
- 사용자가 Drive `카드뉴스자료`(`1bCHzWYQbXAKvbB2lgVlHZqHqqbZTbLe2`)에 계정명 폴더+사진 세팅 중
  (협업자 numlock4849 가 번호 PNG 업로드 중). **SUITE-Variable.ttf**(1.8MB)도 거기 업로드됨
  (단, satori 는 변수폰트보다 static OTF 가 안전 — 렌더러는 jsdelivr static OTF 사용).
- ※ 현재 Drive 연동 스코프(`_shared/googleDrive.ts`)는 `drive.file`(앱 생성 파일만) → 그 폴더 못 읽음.
  자동화하려면 readonly Drive 또는 Drive→Storage 동기화 필요(미구현, 후순위).

---

## 2. 블로그 — 완료된 것 (#494)

### 2-1. ① 원고 품질 (프롬프트 강화)
- `agent-office/marketing_office.py`: 한 줄짜리 블로그 프롬프트 → 스펙 강화
  (상투적 도입 금지·FAQ(AIO) 블록·SEO 키워드 배치·구조·자가점검).
- `.claude/skills/marketing-draft/reference/draft-formats.md`:
  - 네이버 블로그: 상투적 인사 금지·훅 로테이션·**FAQ(질문-답) AIO 블록**·SEO 규칙 추가.
  - **신설 `5. 워드프레스(wp_aio)` 포맷**(그동안 부재): TL;DR 요약답·질문형 소제목·FAQ 스키마·역피라미드·
    내부링크·**canonical**(중복 게시 SEO)·AIO 5원칙.
  - 공통 체크리스트에 상투적도입·FAQ·TL;DR/canonical 추가.

### 2-2. 블로그/마케팅 구조 (참고)
- **공식 파이프라인** = `marketing-draft` 스킬(`.claude/skills/marketing-draft/SKILL.md`):
  blog_core(SSOT, `docs/blog-core/`) → 6채널 변환(threads/naver/ig_carousel/**wp_aio**/cafe/clip) → **노션 적재까지만**.
  스펙 = `docs/content-distribution.md`. 채널 자동발행은 **전부 HITL(사람)**.
- `agent-office/marketing_office.py` = 별도 CrewAI 실험용(drafts/ 에 초안 저장). 무거움(파일 주석에도 명시).
- DB `agent_outputs`(types.ts) = 산출물 승인 큐(kind·status·deslop_score). **채널별 발행상태 컬럼은 없음**.

---

## 3. ⏭️ 다음 세션 — ② 워드프레스 자동 발행 (메인 작업)

**목표**: wp_aio 산출물을 노션 복붙 없이 **워드프레스에 자동 발행**(검수 후).

**필요 준비물(사용자에게 요청)**:
1. 워드프레스 **사이트 URL** (예: `https://blog.dewy-wedding.com`)
2. 발행 계정 **Application Password** (WP 관리자 > 사용자 > 프로필 > 애플리케이션 비밀번호)
   → Supabase 시크릿 `WP_BASE_URL`·`WP_USER`·`WP_APP_PASSWORD` 로 저장.

**구현 스펙(제안)**:
- 새 edge function `wordpress-publisher` (instagram-publisher 패턴 미러):
  - WP REST `POST {WP_BASE_URL}/wp-json/wp/v2/posts` (Basic auth: `WP_USER:WP_APP_PASSWORD`).
  - **Markdown → HTML 변환**(esm.sh `marked` 등), `status: "draft"|"publish"`, `title`·`content`·`excerpt`(TL;DR)·`slug`.
  - 대표 이미지: `POST /wp-json/wp/v2/media` 업로드 → `featured_media`.
  - 카테고리/태그 매핑, **canonical**(Yoast/RankMath 메타 또는 본문 링크).
  - 발행 결과(post URL·id) 기록.
- **상태 추적**: 블로그 원고용 테이블 또는 `agent_outputs` 에 채널별 발행상태 컬럼 추가
  (예: `wp_post_id`·`wp_status`·`wp_url`). "노션엔 올렸는데 WP엔 아직" 같은 부분상태 기록.
- **검수→발행**: 어드민에 블로그 검수 화면(또는 노션 상태 연동) → "워드프레스 발행" 버튼 → 함수 호출.
- **canonical 주의**: blog_core 가 네이버 등에 먼저 게시되면 WP 글에 원본 canonical 명시(중복 SEO 패널티 회피).

---

## 4. ⏭️ 그 외 남은 것 (deferred, 우선순위 순)

1. **draft-generator 재배포 검증** (§1-3) — 캡션 분석 패널 안 차면 재배포.
2. **큐 → 초안 자동 생성 연결**: 현재 draft-generator 는 topic/draftId 직접 입력만. `instagram_topics`(queued)
   에서 자동 픽업 → instagram_post_drafts 생성 → 카피 생성하는 로직 + pg_cron 필요.
   - pg_cron 파일: `supabase/migrations/MANUAL_20260601_instagram_pg_cron.sql.DO_NOT_AUTO_APPLY` (수동 적용 대기).
   - **생성 cadence 권장**: 주 1회 배치(7개) 생성 + **매일 1개 발행**(2개/일은 도달↓·소재 고갈). 노션 주제 큐 주간 보충.
3. **Meta 발행 토큰** (instagram-publisher 자동 발행용): IG 계정 `@dewy_ai_weddig_planer` →
   프로페셔널 전환 → FB 페이지 연결 → Instagram Graph API 앱 + App Review(`instagram_content_publish`) →
   장기 페이지 토큰 → 시크릿 `IG_PAGE_ACCESS_TOKEN`·`IG_BUSINESS_ACCOUNT_ID`. 그 전엔 수동 발행 유지.
4. **임시 잔여물 정리**(MCP 삭제 도구 없음 → Supabase 대시보드에서):
   - edge function `render-test-suite` (410 스텁으로 무력화됨, verify_jwt=true) **삭제**.
   - Storage `instagram-cards/test/suite-preview.svg`·`suite-preview-2.svg` **삭제**(SQL 삭제는 storage 보호정책상 불가).
5. **Drive 사진 자동 연동**(후순위): 계정명 폴더+파일명 규칙 → 렌더러 자동 매칭(readonly Drive or Drive→Storage 동기화).

---

## 5. 핵심 함정·교훈 (다음 세션 시간 절약용)

- **satori 폰트**: woff2 ❌, **OTF/TTF ✅**. 한글 폰트는 jsdelivr static OTF 사용. 로컬 샌드박스는 jsdelivr·figma·supabase
  egress **차단**(프록시 정책) → 로컬에선 SUITE 렌더 불가. **Supabase egress 는 jsdelivr 닿음**(pg_net로 검증).
- **resvg-wasm**: `import { Resvg, initWasm }` named. default import = BOOT_ERROR.
- **Edge function 렌더 확인법**(샌드박스에서 결과 회수): 함수가 결과를 **public Storage 업로드** → URL 반환,
  또는 satori SVG 를 반환받아 **로컬 resvg 로 PNG 변환**(SVG 는 글리프가 경로라 폰트 불필요). pg_net `net.http_post`
  → `net._http_response` 에서 응답 회수. base64 대용량은 컨텍스트 폭증 주의.
- **앱 웹폰트**: `src/index.css:1` 이 SUITE Variable 로드 → 브라우저 미리보기는 자동 SUITE.
- **도메인 경계**(eslint 강제): console feature 는 shared(`@/components`·`@/lib`·`@/types`) 만 import. 지켰음.
- **유니코드 이스케이프 함정**: edge function deploy 시 한글을 `\uXXXX` 로 박지 말 것(컴/컬 오타남). **직접 한글** 사용.
- **PR 흐름**: 머지 후 같은 브랜치에 새 커밋 push → 새 PR. main push 시 edge function 자동 배포(paths 필터).

---

## 6. 다음 세션 시작 프롬프트 (복붙용)

```
카드뉴스·마케팅 자동화 이어서 하자. 핸드오프는 docs/260627_cardnews_marketing_handoff.md 참고.

이번 세션 목표 = ② 워드프레스 REST 자동 발행 구축.
- 준비물: 워드프레스 사이트 URL = <여기>, Application Password = <여기> (또는 이미 Supabase 시크릿에 넣었으면 알려줘).
- 핸드오프 §3 스펙대로: wordpress-publisher edge function(WP REST /wp-json/wp/v2/posts, Application Password Basic auth,
  Markdown→HTML, 대표이미지, draft/publish, canonical) + 검수→발행 상태 추적.
- 시작 전: 핸드오프 §1-3 대로 instagram-draft-generator 재배포됐는지 먼저 확인(캡션 분석 패널 채워지는지).

그리고 시간 되면 deferred(핸드오프 §4)도: 큐→초안 자동생성 연결, 임시함수/SVG 정리.
```

---

## 7. 세션 2 (2026-06-27) — ② 워드프레스 REST 자동 발행 구축 완료

> 브랜치 `claude/wordpress-rest-publisher-pswbpe`. §3 스펙대로 구현·배포·검증.

### 7-1. draft-generator 재배포 — ✅ 확인됨 (§1-3 우려 해소)
- `list_edge_functions` 결과 `instagram-draft-generator.updated_at` 이 `instagram-card-renderer` 와
  **동일**(1782546403739) → #494/#495 머지 시 재배포됨. **캡션 분석 패널 정상 동작**. 추가 조치 불필요.

### 7-2. 추적 테이블 `blog_post_drafts` (신규) — 적용 완료
- 마이그: `supabase/migrations/20260627110000_blog_post_drafts.sql` (MCP `apply_migration` 으로 **원격 적용**,
  27컬럼·RLS admin 1정책·updated_at 트리거 검증). `types.ts` 에도 테이블 타입 수기 추가.
- 컬럼: 콘텐츠(title·slug·content_markdown·excerpt·canonical_url·featured_image_url·categories[]·tags[]) +
  저자(author_persona me/brand·source_type·source_id·notion_page_id) + status(draft→review→publishing→published/failed) +
  **WP 부분상태**(wp_post_id·wp_url·wp_status draft/publish·wp_featured_media_id·wp_published_at) + 추적(last_error·retry_count).
- "노션엔 올렸는데 WP엔 아직" 같은 부분상태를 `wp_*` 로 분리 추적. instagram_post_drafts 와 동일 패턴.

### 7-3. edge function `wordpress-publisher` — 배포 완료 (version 1, verify_jwt=false)
- WP REST `POST {WP_BASE_URL}/wp-json/wp/v2/posts` (Application Password **Basic auth**). 재발행은 `/posts/{id}` PUT 갱신.
- **Markdown→HTML**(esm.sh `marked@12`, GFM), `status` draft/publish, title·content·excerpt·slug.
- **대표 이미지**: `POST /wp/v2/media` 업로드 → `featured_media`(wp_featured_media_id 저장, 재업로드 방지).
- **카테고리/태그**: 이름→term id 해석(없으면 생성, **best-effort** — 실패해도 글은 그 term 없이 발행).
- **canonical**: Yoast(`_yoast_wpseo_canonical`)·RankMath(`rank_math_canonical_url`) meta 둘 다 전달
  (SEO 플러그인 설치 시 채택. 미설치면 무시 — WP 가 미등록 meta 를 조용히 버림).
- 권한: instagram-publisher 미러(service role cron 또는 admin JWT). 낙관적 락(status='publishing').
- 입력: `{ draftId, wpStatus?: 'draft'|'publish' }`. 시크릿 미설정 시 **503 wordpress_not_configured**(graceful).
- esbuild 검증 통과. **로컬 샌드박스는 supabase egress 차단**(§5)이라 함수 e2e 호출은 미확인 — MCP 배포는 ACTIVE.

### 7-4. 어드민 검수→발행 UI
- 목록 `/admin/blog-posts`(`AdminBlogPosts.tsx`) — 상태 필터·원고 추가(제목+wp_aio 본문 붙여넣기).
- 편집 `/admin/blog-posts/:id`(`AdminBlogPostEdit.tsx`) — 제목·슬러그·요약·canonical·화자·카테고리/태그·
  **대표이미지 업로드**(`instagram-cards` 버킷 `blog-featured/`)·본문 Markdown 편집 + **저장** + **WP 임시저장**
  (wpStatus=draft) / **워드프레스 발행**(wpStatus=publish) 버튼 + 발행결과(wp_url 링크·실패 에러) 표시.
- 데이터 `data/blogPostDraft.ts`, 타입 `types/blogPostDraft.ts`. 라우트·nav(마케팅 그룹) 등록.
- build/lint/check-integrity(error 0) 통과.

### 7-5. ⚠️ 사용자가 할 일 — WP 시크릿 3종 설정(미설정 시 발행 버튼이 503)
Supabase 대시보드 > Project Settings > Edge Functions > Secrets (또는 `supabase secrets set`):
- `WP_BASE_URL` (예: `https://blog.dewy-wedding.com` — 끝 슬래시 무관)
- `WP_USER` (발행 계정 로그인 아이디)
- `WP_APP_PASSWORD` (WP 관리자 > 사용자 > 프로필 > **애플리케이션 비밀번호**, 공백 포함 그대로)
- (선택) `SLACK_WEBHOOK_URL` — 발행 실패 알림.
설정 후 `/admin/blog-posts` 에서 원고 1건 만들어 "WP 임시저장"으로 실제 발행 e2e 확인 권장(canonical 은
Yoast/RankMath 설치 여부에 따라 적용).

### 7-6. 남은 것(이 세션 미완 — deferred 유지)
- **큐→초안 자동생성 연결**(§4-2): 아직 미구현. blog_core/노션 → blog_post_drafts 자동 적재도 후속.
- **임시 잔여물 정리**(§4-4): MCP 삭제 도구 없음 → 대시보드에서 `render-test-suite` 삭제·SVG 삭제 필요(미처리).

---

*문서 끝. 갱신 시 날짜·항목 추가.*
