# 260614 AIO(AI/답변엔진 최적화) 강화

> AIO = AI Optimization(AEO/GEO) — ChatGPT·Perplexity·Gemini·검색의 **답변/인용**에 Dewy가
> 노출·인용되도록 하는 작업. 기존 기반(가이드 10개 SSR · FAQPage/MobileApplication/Breadcrumb
> JSON-LD · AI 크롤러 허용 robots · sitemap)은 양호했고, 이번에 **기술적 공백**을 메웠다.

## 현황 검토 (강화 전)

- ✅ 가이드 10개 SSR(`api/guide.ts` + `aeoGuides.ts` 단일 소스), 한글 슬러그 canonical.
- ✅ JSON-LD: BreadcrumbList · FAQPage · MobileApplication. 홈(index.html)에 Organization/WebSite/MobileApplication.
- ✅ robots.txt: GPTBot·Google-Extended·OAI-SearchBot 등 AI 크롤러 허용 + 민감경로 차단.
- ✅ 상세페이지 SSR(`api/ssr.ts`, 9 카테고리 + store), 전값 escape.
- ⚠️ 공백: `llms.txt` 없음 · 가이드에 Article/dateModified 없음 · robots 스니펫 메타 없음 ·
  sitemap에 lastmod·상세페이지 없음 · Organization `sameAs`(소셜) 없음.

## 이번 적용 (커밋)

| # | 항목 | 파일 | 효과 |
|---|---|---|---|
| 1 | **`llms.txt` 신설** | `public/llms.txt` | AI 엔진이 브랜드 정의·핵심기능·가이드·카테고리 URL을 한 파일로 파악(신흥 표준) |
| 2 | **Article 구조화데이터** | `api/guide.ts` | 가이드 JSON-LD에 Article(headline·description·datePublished·dateModified·author·publisher+logo) 추가 → 신선도·E-E-A-T 신호 |
| 3 | **robots 스니펫 메타** | `index.html` · `api/_lib/ssr.ts` | `max-image-preview:large, max-snippet:-1` → 검색·AI가 전체 스니펫·큰 이미지 노출 |
| 4 | **sitemap lastmod** | `public/sitemap.xml` | 전 URL에 `<lastmod>` → 크롤 신선도 판단 개선 |

검증: `esbuild api/guide.ts` 번들 OK · `npm run build` 후 `dist/llms.txt`·`dist/sitemap.xml`·
robots 메타 반영 확인. (실제 크롤러 노출은 배포 후 Search Console / 각 봇 확인 필요 — 정적 레벨까지 확인.)

## 2차 적용 (동적 sitemap — 완료)

| 항목 | 파일 | 내용 |
|---|---|---|
| **상세페이지 동적 sitemap** | `api/sitemap.ts`(신규) · `public/sitemap_index.xml`(신규) · `vercel.json` · `robots.txt` | DB에서 활성·라우트 카테고리 업체 **3,252곳** + 활성 상품 개별 URL을 `/sitemap-places.xml`·`/sitemap-products.xml`로 생성, `sitemap_index.xml`이 마케팅 sitemap과 묶음. robots는 인덱스를 가리킴. 색인 표면 32 → 3,300여 URL. |
| **Supabase 상수 단일화** | `api/_lib/ssr.ts` · `api/ssr.ts` | anon URL/키를 `_lib/ssr`로 모아 ssr·sitemap 공용(키 3중복→1, 드리프트 차단). |

검증: `esbuild` sitemap.ts/ssr.ts 번들 OK · `lint` 0 · Supabase MCP로 카테고리별 건수 확인
(invitation 732·예복 691·예물 585·스튜디오 387·웨딩홀 291·한복 242·가전 186·허니문 138).
dress_shop·makeup_shop은 전용 라우트 없어 제외(스튜디오 상세에 흡수). 동적 함수는 PostgREST Range
페이지네이션으로 1000행 한도를 넘겨 전부 수집. (실제 배포 후 `/sitemap-places.xml` 응답은 Vercel 환경에서 확인 권장.)

> **참고 — Product/LocalBusiness 스키마는 이미 구현돼 있었다**: `api/ssr.ts`가 업체에
> `LocalBusiness`(name·address·aggregateRating·review), 상품에 `Product`(offers) JSON-LD를 이미 emit.
> 추가 보강 여지: LocalBusiness `priceRange`·`geo`·`telephone`, Product `brand`·`aggregateRating`.

## 권장 다음 단계 (미적용 — 우선순위순)

1. **상세 스키마 보강** — `api/ssr.ts` LocalBusiness에 `geo`(lat/lng)·`priceRange`·`telephone`,
   Product에 `brand`·`aggregateRating` 추가(데이터 컬럼 존재: lat·lng·min_price 등).
2. **Organization `sameAs` + 스토어 링크** — 공식 인스타그램·유튜브·블로그 URL과 Play/App Store 링크를
   홈 JSON-LD `sameAs` + noscript/llms.txt에 추가(엔티티 지식그래프 고정). **실제 URL 필요**(추측 금지로 보류).
3. **고의도 신규 가이드** — 현재 10개는 "앱" 중심. 정보 질의 확장 여지: "결혼 준비 순서/비용",
   "스드메 가격대", "지방(지역)별 결혼 준비", "상견례/예단 예절" 등. `aeoGuides.ts`에 추가하면
   SSR·sitemap·llms 파이프라인이 자동 커버.
4. **llms.txt 자동 생성** — 지금은 정적(가이드 변경 시 수동 동기화). `aeoGuides.ts` 기반 빌드 생성 스크립트로
   드리프트 차단(DRY). + `/llms-full.txt`(가이드 본문 전체 포함) 추가 검토.
5. **HowTo 스키마** — 체크리스트·순서형 가이드에 HowTo(step) 추가 시 리치결과·AI 단계인용에 유리.
