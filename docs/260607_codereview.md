# 260607 전체 코드리뷰 — "조용히 깨진" 데이터/배포/파이프라인 감사

> 사용자 신고("약도 생성 안 됨 · 업체 전화번호 안 뜸 · 토스트 다 안 됨")를 기점으로 전 surface
> e2e/코드/실DB/엣지로그 대조 감사. **이 문서는 감사(진단) 단계 — 수정 미적용.** 수정은
> 항목별 분리 커밋/PR로 진행하며, 적용 시 각 행에 커밋 해시를 덧붙인다.
>
> 방법: 병렬 서브에이전트 4축(상세매핑·엣지계약·비즈니스파이프라인·조용한실패) + 실DB
> (`information_schema`/행 카운트, project `qabeywyzjsgyqpjqsvkd`) + 엣지함수 로그/배포목록 대조.
> **한계**: 샌드박스 네트워크 정책이 함수 호스트·외부망을 막아(403 "Host not in allowlist")
> 실기기 클릭 e2e 일부는 미실행 — 아래는 코드+스키마+로그로 확정한 정적 사실이며, 결제·계정·
> 업체 경로는 실환경 e2e 재확인이 필요하다(표기함).

## TL;DR — 사용자 3증상의 진짜 원인

| 신고 증상 | 진짜 근본원인 | 영역 |
|---|---|---|
| 약도(정적지도) 생성 안 됨 | `place-static-map` 엣지함수는 **정상**(로그 `GET 200`, 네이버키 설정됨). 좌표가 없어 `PlaceMap`이 렌더 안 됨 — ① 업체 리스팅은 좌표를 **아예 기록 안 함**(D-P0) ② 수집 place 중 좌표 없는 행 | D, B |
| 업체 전화번호 안 뜸 | 상세 hook(`usePlaceDetail`)은 `place_details.tel`을 **정상 매핑**. 그러나 업체 입력 `phone`은 `business_profiles`에만 저장되고 `place_details.tel`로 **흘러가지 않음**(생성·동기화 경로 부재) | D |
| 토스트 다 안 됨 | ⚠️ **오진 정정**: `<Toaster/>` 미마운트 아님. `use-toast`는 sonner 어댑터이고 `<Sonner/>` 마운트됨 → 코드상 동작. 유력 원인은 **sonner `position="top-center"` + 안드로이드 safe-area 깨짐**으로 토스트가 상태바 뒤에 가림(A, 실기기 확인 필요) | A |

**신규로 드러난 결제·계정 P0**: `delete-account`·`cancel-subscription` 엣지함수 **미배포** → 계정삭제·구독해지 **항상 실패**.

---

## A. 토스트 / 안드로이드 네이티브 셸

| 증상 | 근본원인 | 파일:line | 심각도 | 수정안 |
|---|---|---|---|---|
| (정정) 토스트 "전멸" — 사실 아님 | `use-toast.ts`가 `toast()`→`sonnerToast()` 어댑터, `<Sonner/>` 마운트됨. shadcn `<Toaster/>`/큐는 미사용 dead code | `src/hooks/use-toast.ts:6,34,36`, `src/App.tsx:175` | 정정(무결함) | 조치 불필요. `components/ui/toaster.tsx` + 큐 잔재는 P3 정리 후보 |
| 실기기에서 토스트가 안 보임(추정) | sonner `position="top-center"` + 안드로이드 edge-to-edge/safe-area 미적용 → 토스트가 상태바 뒤/화면 밖. `@capacitor/status-bar` 미설치로 `initAndroidSafeArea()`가 항상 catch | `src/components/ui/sonner.tsx:12`, `src/lib/native/safeArea.ts`(status-bar 미설치) | **P1** | (1) `@capacitor/status-bar` 설치→overlay 활성 (2) sonner에 safe-area top offset 또는 `position="bottom-center"`. 실기기 e2e로 확인 |
| 전 페이지 상/하단 흰 여백·콘텐츠 눌림(앞선 신고) | 동일 — edge-to-edge 전제 CSS인데 `@capacitor/status-bar` 미설치로 safe-area 인셋 미적용 | `src/lib/native/safeArea.ts`, `src/index.css`(`--safe-top`) | **P1** | `@capacitor/status-bar@^6` 설치 + `cap sync` 후 실기기 확인 |

## B. 장소/업체 상세 데이터 매핑 (`usePlaceDetail` → `PlaceDetailLayout`)

> 상세 경로의 `lat→latitude`, `lng→longitude`, `tel←place_details.tel` 매핑은 **정상**(회귀 아님).
> 아래는 DB엔 값이 있는데 화면 단계에서 누락되는 "마지막 1cm" 드롭.

| 증상 | 근본원인 | 파일:line | 심각도 | 수정안 |
|---|---|---|---|---|
| 상세 "주소"가 도로명이 아니라 "시 구"만 + 길찾기 검색어도 부정확 | `place_details.address`(1662행 중 **850행에 실주소**)를 hook이 안 읽고 `joinRegion(city,district)`로 합성 | `src/hooks/usePlaceDetail.ts:430`, 표시 `PlaceDetailLayout.tsx:407-415` | **P0** | `address = d?.address?.trim() || joinRegion(city,district)`; PlaceMap 길찾기/카카오맵 쿼리에도 반영 |
| 허니문 상세에 예약/구매 CTA 자체가 없음(47개 상품 링크 미노출) | `agency_product_url` 매핑은 되나 `HoneymoonExtras`가 미렌더(appliance/jewelry엔 buyUrl 있음) | `src/pages/VendorDetailPage.tsx`(HoneymoonExtras), 매핑 `usePlaceDetail.ts:620` | **P1** | `buyUrl = place.agency_product_url || website_url || naver_place_url` CTA 추가 |
| 리스트/홈 카드에서 전화·영업시간·주차·SNS 비어 보임 | `placeToVendor`가 `tel/business_hours/parking_*/sns_info/amenities: null` 하드코딩(카드 경로, place_details 미조인) | `src/lib/placeMappers.ts:186-191` | **P1** | 카드 fetch가 `place_details` 조인+매핑, 또는 카드가 안 쓰면 `Vendor` 타입에서 dead field 제거(드리프트 차단) |
| 명절/임시휴무·셔틀버스·네이버블로그·페북·부모님무료주차 미표시 | hook은 `holiday_notice·shuttle_bus_*·naver_blog_url·facebook_url·parking_free_parents`를 매핑하나 UI 렌더 누락 | `PlaceDetailLayout.tsx:439-483` | **P2** | 위치/주차/SNS 섹션에 각 필드 Row·칩 추가(또는 의도적 제외면 타입에서 제거) |

## C. 엣지함수 배포·계약 정합 (배포목록·로그 대조)

| 증상 | 근본원인 | 함수 / 호출부 | 심각도 | 수정안 |
|---|---|---|---|---|
| 계정 삭제 항상 실패(404) | `delete-account` **미배포**(소스 존재, ACTIVE 목록에 없음) | `supabase/functions/delete-account/`, 호출 `src/pages/Settings.tsx:59` | **P0** | 배포 후 실 삭제 e2e 확인(부분쓰기 주의) |
| 구독 해지 항상 실패(무반응) | `cancel-subscription` **미배포**(catch로 false 반환) | `supabase/functions/cancel-subscription/`, 호출 `src/hooks/useSubscription.ts:105` | **P0** | 배포 + 실 해지 호출 확인. 결제경로라 정적통과만으로 완료 보고 금지 |
| 드레스/메이크업 AI 추천 생성 404 | `dewy-dress-recommend`·`dewy-makeup-recommend` **미배포** | 호출 `src/pages/DressRecommend.tsx:146`, `MakeupRecommend.tsx:139` | **P1** | 배포(하트 차감 전 호출이라 적립 정합 확인) |
| 어드민 인스타 릴스 수집 404 | `instagram-collect-reels` **미배포** | `src/pages/admin/AdminTipInstagrams.tsx:147` | **P2** | 배포(어드민 한정) |
| 청첩장 지도 추가 시 원인 안 보이는 404 | `invitation-map`은 정상 배포·계약 일치. 지오코딩 0건 시 **의도적 404** 반환인데 클라가 제네릭 처리 | `supabase/functions/invitation-map/index.ts:107`, 호출 `InvitationStudio.tsx:599` | **P2** | 비즈니스 실패는 200+`{error}` 또는 422로 → 클라가 "주소를 못 찾았어요" 표시 |
| `naver-place/image/blog-search` 죽은 배포 | 배포돼 있으나 코드 어디서도 호출 안 함(orphaned) | 배포 slug만 존재 | P3 | 미사용 확인 후 제거 또는 연결 |

## D. 비즈니스 온보딩 → 소비자 노출 파이프라인 (약도·전화의 진짜 뿌리)

> 핵심: 사업자 입력(연락처/주소)은 `business_profiles`에만 저장되고 소비자 상세가 읽는
> `places.lat/lng`·`place_details.tel/address`로 **단 한 줄도 흐르지 않는다.** 현재 business
> 행 0건이라 런타임 회귀가 아직 안 터졌을 뿐, 경로가 구조적으로 단절돼 있다.

| 증상 | 근본원인 | 파일/테이블 | 심각도 | 수정안 |
|---|---|---|---|---|
| 업체 리스팅에 전화 영구 공백 | `upsert_my_listing`이 `places` 기본필드만 쓰고 `place_details` 행을 안 만듦 → `tel` NULL 고정 | `migrations/20260521050000_places_ownership.sql:66-72`, hook `usePlaceDetail.ts:533` | **P0** | RPC에 `p_tel` 추가→`place_details` upsert, 또는 승인 시 `business_profiles.phone→place_details.tel` 동기화 |
| 업체 리스팅에 약도 영구 공백 | 공개 폼에 좌표/주소 입력 없음 + RPC가 `lat/lng` 미기록 → `hasCoords=false` | `BusinessVendorEdit.tsx:60-74`, `places_ownership.sql:66-78`, `PlaceDetailLayout.tsx:222,400` | **P0** | 폼에 도로명주소 입력 + 저장 시 좌표 채움(`place-geocode-backfill` 재사용) |
| "주소·네이버맵 연결" 입력이 어디에도 저장 안 됨 | 공개 리스팅 폼이 name/desc/city/district/image/price/tags만 받음. 주소·`naver_place_url` 입력란 부재 | `BusinessVendorEdit.tsx:27-33`, `verify-business/index.ts:47,146` | **P0** | 폼+RPC에 도로명주소·`naver_place_url` 필드 추가 |
| business_profiles↔places 자동연동 전무 | 두 영역 잇는 트리거/RPC 없음. 승인(`admin_review_listing`)도 status만 토글 | DB 트리거(region/completeness/updated_at만), `places_ownership.sql:99-116` | **P1** | 승인 RPC/트리거에서 연락처·주소 1회 동기화(기존값 덮어쓰기 가드) |
| geocode 백필이 주소 대신 상호명 추정 | `place-geocode-backfill` query=`"{name} {district}"` | `place-geocode-backfill/index.ts:88` | **P1** | 주소 저장 생기면 `places.address` 우선 사용 |

## E. 조용한 실패 — awaited mutation의 `{ error }` 미확인 (Supabase는 throw 안 함)

| 증상 | 근본원인 | 파일:line | 심각도 | 수정안 |
|---|---|---|---|---|
| 마케팅 수신동의가 DB 미기록돼도 "기록됨" 처리 + 재시도 영구 차단(PIPA 이력 유실) | `user_consents` insert `{error}` 미확인 + 실패와 무관하게 pending 키 제거 | `src/contexts/AuthContext.tsx:90,100` | **P1** | `{error}` 받고 `if(error) return`(pending 키 제거 건너뛰어 재시도 보존) |
| 커플다이어리 사진이 "저장됨" 뜨고 조용히 유실 | `couple_diary_photos` insert `{error}` 미확인(같은 파일 :147 컨벤션과 불일치) | `src/hooks/useCoupleDiary.ts:153,197` | **P1** | `if(pErr) throw pErr` |
| 사진 업로드 PIPA 동의 미기록돼도 업로드 진행 | `user_consents` insert `{error}` 미확인 | `src/components/PhotoUploadConsent.tsx:45` | **P2** | `{error}` 가시화 |
| 커플투표/사진 삭제 실패해도 성공 토스트 | delete `{error}` 미확인 | `src/hooks/useCoupleDiary.ts:230,246` | **P2** | `if(error) throw error` |
| AI 절충안 저장 실패해도 정상처럼 보임 | `couple_votes.update` `{error}` 미확인 | `src/pages/CoupleVoteDetail.tsx:118` | **P2** | `if(error) throw error` |
| AIPlanner 동의 실패 시 무반응 | catch에서 토스트 없이 pendingSend만 비움 | `src/pages/AIPlanner.tsx:321-324` | **P2** | catch에 실패 토스트 |
| 결제 승인 effect 재실행 시 중복 호출 위험 | ran-guard ref 없음 | `src/pages/HeartChargeSuccess.tsx:19-69` | **P2** | `useRef` 1회 가드(백엔드 멱등성과 별개) |

> ✅ 잘못된 select 컬럼(422)·미실재 RPC는 **발견되지 않음**(검사 view/table 전부 실재).
> 빈 catch 대부분 의도적 best-effort로 문서화돼 있음.

---

## 우선순위 수정 로드맵

**P0 (즉시)**
1. 엣지함수 배포: `delete-account`, `cancel-subscription` (계정·결제). 배포 후 실 호출 e2e.
2. 비즈니스 파이프라인(D): `upsert_my_listing`+공개폼에 전화·도로명주소·좌표·`naver_place_url` 추가 → `place_details`/`places.lat/lng` 기록. (약도·전화의 근본 해결)
3. 상세 주소(B): `place_details.address` 우선 사용(`usePlaceDetail.ts:430`).

**P1**
4. 안드로이드 safe-area: `@capacitor/status-bar@^6` 설치+overlay → 흰여백·토스트 가림 동시 해결(+sonner offset). 실기기 e2e.
5. 추천 엣지함수 배포(dress/makeup) — 적립 정합 확인.
6. 조용한실패 P1: AuthContext 동의 재시도 보존, 커플다이어리 사진 유실.
7. 허니문 예약 CTA, business↔place 동기화 트리거, geocode 주소 우선.

**P2/P3**
8. 상세 미렌더 필드(holiday/shuttle/sns/parking), invitation-map 비즈니스응답 코드, 조용한실패 P2들, dead toast 큐·orphaned naver 함수 정리.

## 검증 방법·한계
- 실DB 스키마·행 카운트·트리거·엣지 배포목록/로그는 MCP로 **실측 확정**.
- 샌드박스 네트워크 정책으로 함수 호스트 직접 호출·실기기 클릭 e2e 일부 **미실행** → 결제(delete/cancel/추천)·업체 온보딩→상세 경로는 배포/수정 후 **실환경 e2e 필수**.
- 오진 1건 정정 기록: "토스트 전멸(Toaster 미마운트)"은 사실무근 — `use-toast`=sonner 어댑터. 추측이 아니라 `use-toast.ts` 원문 확인으로 정정.
