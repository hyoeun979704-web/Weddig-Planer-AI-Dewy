# 사업자 정보등록 고도화 기획서

> 목적: 기업회원(사업자)이 자기 업체를 **큐레이션이 제대로 작동할 만큼** 풍부하게 등록·관리하게
> 해서 추천/매칭 품질과 상세페이지 완성도를 끌어올린다. 코딩 전 **기획 단계** 문서다(현황 분석 →
> 병목 → 고도화 아이디어 → 단계별 실행). 근거는 코드/스키마/RPC 직접 분석(아래 파일명 명시).

## 1차 원리

큐레이션 품질 = **데이터 완성도 × 매칭 신호**. 둘 다 결국 "사업자가 채운 정식 데이터"에서 나온다.
지금은 사업자가 채울 수 있는 입력면이 좁고(기본 8필드), 큐레이션이 필요로 하는 신호
(좌표·포트폴리오 식장태그·상세속성·가치태그)는 **사업자 손이 닿지 않아 비어 있다**. 그래서
추천 정렬(`partner_rank → data_completeness → avg_rating`)·지도·"같은 식장" 매칭이 헛돈다.

→ 고도화의 두 축: **(A) 사업자 입력면 확장** + **(B) 입력 없이도 채우는 자동 보강**.

---

## 1. 현재 아키텍처 (등록 라이프사이클)

```
1. 가입   BusinessOnboard → verify-business(NTS 국세청 검증) → business_profiles(pending)
2. 승인   AdminBusinessReview → admin_review_business() → approval_status=approved
3. 등록   BusinessVendorEdit → upsert_my_listing() → places(is_active=false, pending)
4. 검수   AdminBusinessReview → admin_review_listing() → places(is_active=true, approved)
5. 공개   useVendors/useRecommendedVendors (is_active && !deleted_at,
          정렬 partner_rank→data_completeness→avg_rating)
   ├ 6a. 포트폴리오  BusinessGallery → place_media (검수 면제, 즉시 노출)
   └ 6b. 상세속성    BusinessListingDetailForm → place_*_detail (Phase 2b, 미구현)
```

**사업자가 현재 편집 가능**(`upsert_my_listing`): name·description·city·district·main_image·
min_price·tags·문의채널(chat/url/phone). **고정/불가**: category(서비스카테고리에 종속)·
owner·moderation·is_active·**lat/lng**·통계.

**관련 테이블**: `business_profiles`(승인상태)·`places`(공개 상세)·`place_media`(포트폴리오:
`venue_place_id`·`venue_name`·`style_tags`·`description` 컬럼은 260616 마이그레이션에 **이미 존재**)·
카테고리별 `place_*_detail`.

**지오코딩**: `place-geocode-backfill` edge function 존재(네이버 Local API). **단, 관리자 수동/배치만** —
사업자 저장 시 자동 연결 안 됨.

---

## 2. 병목 (큐레이션 품질을 깎는 지점)

| # | 지점 | 증상 | 큐레이션 영향 | 비고 |
|---|---|---|---|---|
| B1 | `places.lat/lng` 공란 | 저장 시 자동 지오코딩 없음 | **지도·거리 필터 무력** | backfill 함수는 이미 있음 |
| B2 | 포트폴리오 식장 태깅 부재 | `venue_place_id`를 사업자가 못 고름(자유 입력 `venue_name`만) | **"같은 식장 추천"(venueMatch 최강 신호) 거의 0** | 컬럼은 존재, UI만 없음 |
| B3 | `style_tags` 통제어휘 없음 | 자유 입력 → 표기 흔들림 | 스타일 필터 매칭 불안정 | label vs value 분리 필요 |
| B4 | 카테고리별 상세(Phase 2b) 미구현 | 보증인원·식음료·드레스스타일 등 미수집 | 상세 필터 데이터 공백 | 폼 스켈톤만 존재 |
| B5 | `data_completeness` 비가시 | 사업자가 "뭘 더 채워야 노출 오르는지" 모름 | 자발적 완성도 정체 | 정렬엔 쓰이는데 동기부여 없음 |
| B6 | 수정 시마다 전체 재검수(pending) | 경미 변경도 비노출 전환 | 사업자 이탈·갱신 회피 | UX/운영 마찰 |
| B7 | `moderation_note` 취급 | upsert 에 note 인자 없음 → 사업자 저장이 반려사유 덮을 여지 | 운영 혼선(소) | 정합성 확인 필요 |

---

## 3. 고도화 아이디어

### A. 자동 지오코딩 연결 (B1) — 입력 0, 효과 즉시
`upsert_my_listing` 성공 후 주소(city+district[+name])가 있으면 `place-geocode-backfill` 로직을
**해당 1건에 대해 비동기 트리거**(저장 응답은 막지 않음). 실패해도 best-effort(다음 배치가 보강).
→ 지도/거리 필터·위치 기반 추천 복구. 사업자 추가 입력 없음.

### B. 포트폴리오 식장 태깅 UI + 통제어휘 (B2·B3) — 큐레이션 핵심
`BusinessGallery`에 ① **식장 검색 드롭다운**으로 `venue_place_id` 선택(미등록 식장은 `venue_name`
자유입력 폴백) ② `style_tags`를 **통제어휘 칩 선택**(기존 스타일 레지스트리 재사용 — label/value 분리).
→ `venueMatch`의 "같은 식장" 신호 복구 = 가장 강한 추천 레버.

### C. 카테고리별 상세폼 완성 (B4) — Phase 2b 마감
`BusinessListingDetailForm`의 detail 저장(`upsert_my_listing_detail`)을 카테고리별 `place_*_detail`
테이블에 실연결. 입력 유실 방지는 이미 적용된 `formDraft` 패턴 사용(머지됨).
→ 상세 필터(보증인원·식음료·드레스스타일·허니문 지역 등) 수집.

### D. 등록 완성도 미터 + 넛지 (B5) — 자발적 품질 향상
사업자 대시보드/편집 화면에 `data_completeness` 진척바 + "이 항목 채우면 노출 우선순위↑" 가이드.
정렬이 실제 `data_completeness`를 쓰므로 **직접 인센티브**가 됨(게임화).

### E. 가치태그·가격 구조화 (확장)
신부 선호 매칭용 value tags(예: 가성비·프라이빗·반려동물 등)와 가격 구간/패키지 구조 입력.
홈 `placeValueTags`/큐레이션과 연결.

### F. 검수 효율화 (B6) — 사업자 이탈 방지
경미 변경(설명·태그·이미지 교체 등)은 자동 통과 또는 부분 검수, 핵심 변경(상호·카테고리·가격)만
재검수. 수정할 때마다 비노출되는 마찰 제거. (운영 정책 + RPC 분기)

---

## 4. 단계별 실행 기획 (우선순위)

> 모든 DB/RPC 변경은 **마이그레이션 작성 → esbuild/타입검증 → 실환경 적용은 사용자 확인 후**
> (sandbox e2e 불가 원칙). 클라이언트 로직은 유닛테스트로 고정.

| Phase | 범위 | 효과 | 위험 | 검증 |
|---|---|---|---|---|
| **P1** | **A 자동 지오코딩** + **D 완성도 미터** | 큐레이션 신호 즉시 확보 + 자발적 완성도↑ | 낮음(기존 함수 재사용, 읽기/넛지) | 미터 로직 유닛, 지오코딩 트리거는 라이브 확인 |
| **P2** | **B 포트폴리오 식장 태깅 + 통제어휘** | "같은 식장" 매칭 복구(최강 레버) | 중(UI + place_media 쓰기) | 식장검색·태그 매핑 유닛, RLS 라이브 확인 |
| **P3** | **C 카테고리별 상세폼** | 상세 필터 데이터 수집 | 중(detail 테이블 다수) | 스키마↔폼 매핑 유닛 |
| **P4** | **E 가치태그/가격** + **F 검수 효율화** | 매칭 정밀도 + 운영 마찰↓ | 중(정책·RPC 분기) | 분기 로직 유닛 |

**권장 시작점: P1.** 가장 낮은 위험으로 큐레이션 신호(좌표)와 자발적 완성도라는 두 레버를
동시에 켠다. 특히 자동 지오코딩은 "사업자 입력 0 추가"로 지도/거리 추천을 살리는 최고 ROI.

### P1 상세 설계(초안)
- **A**: `upsert_my_listing` 반환 후 클라에서 `place-geocode-backfill`를 단건 모드로 호출하거나,
  서버측에서 저장 트리거. 우선 **단건 호출 엔드포인트**(owner 본인 place 한정, admin 토큰 없이
  RLS+owner 검증) 신설이 안전. 실패는 무시(배치가 보강).
- **D**: `data_completeness` 계산식(채워진 핵심필드 수/가중치)을 클라 순수함수로 두고 유닛테스트,
  편집화면 상단 진척바 + 미충족 항목 체크리스트(각 항목이 해당 입력으로 딥링크).

---

## 5. 함께 처리할 정합성 점검 (소규모)
- **B7**: `upsert_my_listing`가 `moderation_note`를 건드리지 않는지(반려사유 보존) 확인.
- **B2 전제**: `place_media.venue_place_id/style_tags` 컬럼·RLS가 실제 DB에 적용됐는지
  `information_schema`로 먼저 확인(마이그레이션 파일 존재 ≠ 적용).
- 공개 노출은 `is_active`만 보고 `moderation_status`는 안 봄 → 검수 승인 시 `is_active=true`
  동시 보장되는지 재확인(누락 시 승인했는데 비노출).

---

## 다음 액션
P1(자동 지오코딩 + 완성도 미터)부터 구현 착수. 착수 전 위 §5 전제(컬럼/RLS 적용 여부)를
`list_tables`/`information_schema`로 확인하고, 막히면 사용자에게 실환경 점검 요청.
