# Places Data Collection

블로그 / 카페 / 공식 홈페이지에서 웨딩 업체 정보를 수집해 Supabase `places` 테이블에 저장합니다.

## 데이터 소스 (합법·안전)

- **네이버 검색 API** (공식): blog.json, cafearticle.json, local.json 엔드포인트
  - 풀 콘텐츠 스크래핑 X. API 응답의 title + description(스니펫) + postdate만 사용.
- **공식 홈페이지**: 공개 HTML, robots.txt 준수.

블로그/카페의 본문 전체를 가져오는 건 ToS 위반이라 하지 않습니다.

## 환경 변수 (`.env.collection`)

```env
# Naver Cloud Platform → Application → 검색 API
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...

# Gemini (이미 프로젝트에 있음)
GEMINI_API_KEY=...

# Supabase service role (서버사이드 upsert, RLS 우회)
SUPABASE_URL=https://qabeywyzjsgyqpjqsvkd.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

## 사용 예

```bash
# 카테고리별 수집 (기본 10개)
npm run collect -- --category=한복 --limit=10
npm run collect -- --category=스드메 --region=서울 --limit=20

# 모든 카테고리 한 번에
npm run collect -- --all --limit=10

# 시드 쿼리만 (DB write 없이)
npm run collect -- --category=웨딩홀 --dry-run
```

## 신뢰도 (`places.confidence` 0-100)

```
+30  공식 홈페이지에서 직접 확인됨
+20  네이버 지역검색(local.json)에 등록 (주소·좌표 정확)
+10  블로그/카페 글이 2개 이상에서 언급
+10  최근 12개월 내 글 존재
+10  필수 필드 모두 채워짐 (name, region, category)
-30  단일 블로그 글에서만 확인됨
```

`confidence < 60` → UI에서 "정보 미확인" 배지.

## 데이터 흐름

```
1. seedQueries(category)      → ["서울 한복 대여", "부산 한복 신부", ...]
2. naver.searchAll(query)     → blog/cafe/local 결과 합산 (24개월 필터)
3. extractPlace(snippet)      → Gemini → {name, region, official_url?, ...}
4. fetchOfficialSite(url)     → HTML parse → 검증·보강
5. dedupe(items)              → 이름+주소 fuzzy 매칭으로 통합
6. scoreConfidence(item)      → 0-100
7. upsertPlaces(items)        → Supabase batch insert
```
