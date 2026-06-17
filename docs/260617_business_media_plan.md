# 260617 기획 — 포트폴리오 앨범 + 상품/이벤트/쿠폰 이미지 (분석 선행)

> 분석 선행 규칙(AGENTS.md)에 따라 ① 현재 스키마 분석 ② 타 서비스/UX 패턴 조사를 거쳐 기획.
> 코드 전 단계. 구현은 단계별 PR + 마이그레이션(라이브 적용 전제).

## 레퍼런스 조사 요약(경쟁사·UX)
- **포트폴리오**: 실혼(real-wedding) 갤러리를 **식장(venue)별로 묶어** 스타일 태그로 필터하는 것이
  스타일드컷보다 전환에 가장 효과적(WeddingPro·Carats&Cake·TheKnot). → "같은 장소 다량 포폴"을
  앨범으로 묶는 방향이 정석.
- **프로모/쿠폰**: **inline > click-through**. 배너 클릭→상세 이동은 탭 추가로 전환 저하·혼선
  (NN/g·Contentsquare). 쿠폰은 카드에서 바로 받기/코드. 이벤트는 내용이 풍부해 상세가 정당.

## 현재 스키마(분석)
- `place_media`: 사진 1장=1행 + `venue_place_id`·`venue_name`·`style_tags[]`·`description`(260616).
  **앨범/폴더 그룹 개념 없음** → 같은 장소 다량 업로드 시 매 사진에 장소·태그 반복 입력.
- `business_products`: `image_url`(단일) 보유. `business_events`·`business_coupons`: **이미지 컬럼 없음**.
- 재사용: `ImageUploader`, place_media RLS(public read·owner write), moderation 워크플로(상품·이벤트=검토필수, 쿠폰·포폴=면제).

---

## 기능 1 — 폴더(앨범) 단위 포트폴리오 등록

**목표**: `[260402_경복궁]`처럼 **앨범 1개 만들고 공통(장소·스타일·날짜) 1회 설정 → 사진 여러 장
일괄 업로드 → 소비자 상세페이지에 앨범 단위 노출 + 같은 식장 필터 연동.**

### 데이터 모델 (권장안 A — DRY)
- 신규 `place_media_albums`: `id, place_id, owner_user_id, title('260402_경복궁'), shoot_date,
  venue_place_id(FK·nullable), venue_name(폴백), style_tags text[], description, cover_media_id,
  product_id(FK business_products·nullable, on delete set null — 이 앨범의 상품/패키지), created_at`.
- `place_media.album_id uuid null references place_media_albums(id) on delete set null` 추가.
  - 공통 메타(장소·태그)는 **앨범에 1회** → 사진은 상속(중복 입력 제거). 기존 사진은 album_id=null(단독, 호환).
- RLS: 앨범 public read / owner write(place_media와 동일 패턴).
- 매칭: "같은 식장 우선"은 `album.venue_place_id`(기존 per-photo venue_place_id 대체/병행).

### 업로드 UX (BusinessGallery 확장)
1. "앨범 만들기" → 제목·촬영일·식장(검색 선택 or 자유입력)·스타일 태그(통제어휘 칩) 1회 입력.
2. 사진 다중 선택 업로드(앨범에 귀속). 커버 지정.
3. 앨범 목록/편집(이름·태그 수정, 사진 추가/삭제/순서).

### 소비자 노출 (PlaceBusinessSections)
- 포트폴리오를 **앨범 카드**(커버+제목+매수+📍식장+스타일칩)로 그룹 표시 → 탭 시 앨범 사진 뷰.
- 앨범 없는 단독 사진(legacy)은 "기타" 묶음.

### 포트폴리오 필터에 상품(패키지) 태그 연동 — 포폴→상품 전환 동선
- 앨범에 **`product_id uuid null references business_products(id) on delete set null`** 추가
  (이 앨범이 어떤 상품/패키지로 작업한 결과인지). 스타일·식장 태그와 함께 필터 축이 됨.
- **필터 바**: [전체] · 스타일 · 식장 · **상품/패키지**. "이 패키지로 찍은 포폴"로 좁히기.
- **앨범 → 상품 CTA**: 앨범 상세에 "이 패키지 보기 →"(해당 상품으로). **역방향**: 상품 상세에
  "이 패키지로 작업한 포트폴리오" 앨범 노출 → **포폴(증거) ↔ 상품(구매) 양방향 연결 = 전환 강화.**
- 가드: **검토(approved) 상품만** 필터/CTA 노출, 상품 삭제 시 set null. product_id 미지정 앨범은
  상품 필터에서 제외(스타일·식장 필터엔 정상 포함).
- 근거: 실작업 갤러리가 구매 결정의 핵심 증거(레퍼런스 조사) → 그 갤러리에서 바로 패키지로
  연결하면 "마음에 든 결과물 = 살 수 있는 상품" 경로가 끊김 없이 이어짐.

### 단계
- P1: 앨범 테이블(+album_id), 업로드(앨범 생성+다중), 상세 앨범 그룹 렌더.
- P2: 필터 바(스타일·식장·**상품/패키지**), 앨범↔상품 양방향 CTA, 같은-식장 우선노출 일원화, 커버/순서 편집.

---

## 기능 2 — 상품/이벤트/쿠폰 이미지 (콘텐츠 성격별 차등)

> 핵심 결정: **균일하게 "배너+상세" 강제하지 않는다.** UX 근거상 쿠폰은 inline이 우월.

### 이벤트 — 배너(카드) + 상세페이지 ✅ (요청대로)
- `business_events`에 `banner_image_url`(카드 필수) + `detail_images text[]`(상세 본문 이미지) 추가.
- 카드: 업체 상세페이지 섹션 + (선택)이벤트 모음 페이지에 배너 노출 → **탭 시 이벤트 상세**
  (배너·기간·내용·detail_images). 라우트 `/event/:id` 또는 모달.
- 등록 필수: 배너 1장. 검토(approved) 후 노출(기존 워크플로 유지).

### 쿠폰 — inline 유지(배너+상세 **비권장**)
- 근거: 탭 추가가 쿠폰 전환을 떨어뜨림(NN/g). 쿠폰은 카드에서 **바로 받기/코드 노출**.
- `business_coupons`에 `image_url`(선택, 단일 썸네일/브랜드컷)만 추가 — 상세페이지 불필요.
- → 사용자 질문("쿠폰도 같은 방식?")에 대한 답: **아니오, inline 권장.** 썸네일만 선택 지원.

### 상품 — 대표+다중 이미지, 상품 상세는 자연스러움
- 이미 `image_url`(대표) 보유. `business_products`에 `images text[]`(추가 이미지, 선택) 추가.
- 카드(대표 이미지+가격) → (선택)상품 상세(이미지 캐러셀+설명). 이벤트만큼 필수는 아님.

### 데이터 모델 요약(마이그레이션)
| 테이블 | 추가 컬럼 |
|---|---|
| business_events | `banner_image_url text`(필수 검증은 앱), `detail_images text[] default '{}'` |
| business_coupons | `image_url text`(선택) |
| business_products | `images text[] default '{}'`(대표 image_url 보강, 선택) |

### 단계
- P1: 이벤트 배너+상세(가장 요청 명확) → 등록 폼(배너 필수)·상세 라우트·카드 클릭 연동.
- P2: 상품 다중 이미지·상품 상세, 쿠폰 썸네일(선택).

---

## 공통 원칙·검증
- 이미지 업로드는 기존 `ImageUploader`+Storage(소유자 폴더) 재사용. 검토 워크플로 유지.
- iOS/사파리: 업로드 HEIC/대용량 가드, draft(폼) 적용(AGENTS.md 7차원).
- DB 변경은 마이그레이션 작성 → **라이브 적용은 확인 후**(sandbox SQL 미실행). 순수 로직은 유닛 테스트.

## 다음
승인 시 **기능1 P1(앨범)** 또는 **기능2 P1(이벤트 배너+상세)** 중 택1로 구현 착수. 쿠폰은 inline
권장안으로 확정(이견 시 알려주세요).
