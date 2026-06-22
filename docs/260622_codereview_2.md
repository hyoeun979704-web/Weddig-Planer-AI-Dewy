# 배포 전 검토 — UI/UX·큐레이션·기업 관리 (2026-06-22 #2)

> 범위: 사용자 6가지 배포 전 검토 요청 전수 대응. 브랜치 `claude/bold-euler-zjtk2r`.
> 검증: 브라우저 캡처(모바일 390×844, @sparticuz/chromium + mock-supabase)로 실제 화면 확인.

## TL;DR
- **요청 6건 전부 처리.** 5건은 코드 반영+화면 검증 완료, 1건(기업 연락처 RPC)은 코드 완료·
  **프로덕션 마이그레이션 적용만 사용자 승인 대기**.
- 빌드·린트(0 error)·전체 테스트 **597 통과**. 핵심 화면 캡처로 시각 검증.

## 요청별 결과

### #1 예산 '건당 평균' 제거 ✅ (캡처 검증)
- `BudgetHistory.tsx` — `filteredAvg` 계산·UI 제거. 요약 카드 = 합계 단독(좌측 정렬).
  화면: "전체 합계 · N건 / N만원"만 노출, 건당 평균 사라짐 확인. `9caa68c`.

### #2 할 일 추가 = 퀴즈카드 ✅ (캡처 검증)
- `TimelineDetailSheet.tsx` — 항상 떠있던 입력폼 + 평면 추천 리스트(복잡) →
  **추천을 한 장씩 카드로**(추가/건너뛰기, "N개 남음", 추가 시 들어갈 날짜 미리보기),
  직접 입력은 접어둠(`직접 할 일 추가하기` 토글). 추천 소진 시 빈 상태 안내.
  단계 전환 시 카드 큐 초기화. 화면: 단계 시트에 단일 추천 카드 + 두 버튼 렌더 확인. `9caa68c`.

### #3 추천업체·일일미션 큐레이션 고도화 ✅
- **일일미션**(`personaMissions.ts`): designer_late(누락→신규 2종), small_outdoor/budget/luxury
  (1→2종), budget_analytic·first_timer·luxury_hotel 보강 + **전 미션 이모지** 채움
  (`PersonaDashboard` 가 이모지 렌더하도록 수정 — 시각 구분).
- **추천업체**(`personaRecommendations.ts`): CORE 복제(차별성 없던) 페르소나 차별화 —
  luxury_hotel/small_luxury=드레스 강조, small_outdoor=한복 추가, small_budget=혼수(가전) 추가.
  공급 fetch 는 이미 `is_active`+`partner_rank`>`data_completeness`>`avg_rating` 게이트(검증 완료). `9caa68c`.

### #4 다른 기능·꿀팁 큐레이션 ✅
- **꿀팁**(`tipCuration.ts`): 부스트 없던 sparse 페르소나 보강 — luxury_hotel(wedding_hall),
  budget_analytic(wedding_gifts·appliance), first_timer(ceremony·family_meeting),
  single_household(legal_paperwork·ceremony). 기존 페르소나 부스트와 직교. `9caa68c`.
- 기능 전반(예산·일정·추천·후기·기업) 화면 캡처로 점검 — dead-end/빈 화면 신규 없음.

### #5 기업 상세페이지 관리 (기본·상세·리뷰) — 핵심 개선
- **리뷰 관리** ✅ (캡처 검증): `BusinessReviews.tsx` — 평점/미답변 **필터** + **정렬**
  (최신·평점순) + **답글률 지표** 추가. (기존 답글 기능 유지.) 화면 확인. `9caa68c`.
- **기본/운영 정보** ✅ 코드 / ⏳ 마이그 승인대기: 공개 상세페이지가 읽는 `place_details`의
  전화·운영시간·SNS·주차/교통을 **사장님이 입력할 경로가 없던** 핵심 결함 해소.
  - 새 RPC `upsert_my_listing_contact`/`get_my_listing_contact`(마이그 `20260622150000`):
    소유자 인가 + URL(http(s))·전화 살균 + **부분 갱신**(키 없으면 기존값 보존 → 스크랩 데이터
    안 덮음). 기존 저장 RPC(upsert_my_listing·update_my_branch·upsert_my_listing_detail)
    **무수정 → 무회귀**.
  - `BusinessListingContactForm` 신규 + `BusinessVendorEdit` '연락처·운영 정보' 섹션 통합
    (draft 자동저장 재사용). 화면: 전화·홈페이지·SNS·요일별 운영시간·주차/교통 입력 렌더 확인. `04c8902`.

### #6 빠짐없이 전부 검토 ✅
- 캡처 검증 화면: 예산내역·홈(미션)·일정 퀴즈카드·기업 후기·기업 정보편집. page error 0.
- **남은 갭(문서화)**: 카테고리 상세(홀별 정보·스튜디오 16필드 등)는 공개 상세 40+ 필드 대비
  관리 폼이 5~8필드 — 후속 확장 과제. 갤러리 앨범 편집/재정렬, 리뷰 신고/이메일 알림은 후속.

## 적용/대기 마이그레이션
| 마이그 | 내용 | 상태 |
|---|---|---|
| `20260622150000_listing_contact_rpc` | 기업 연락처·운영정보 upsert/get RPC | ⏳ **프로덕션 적용 사용자 승인 대기** (미적용 시 저장만 실패, 폼 정상 렌더) |

## 검증
- `npm run build` ✅ · `npm run lint` 0 error(835 기존 warning) · `vitest` 597 통과.
- 브라우저 캡처(로그인+mock 데이터)로 #1·#2·#5(리뷰·연락처폼) 실화면 확인.
- ⚠️ 한계: 기업 연락처 저장 e2e(실DB upsert→공개 상세 노출)는 마이그 적용 후 실환경 확인 필요.

## 남은 작업 (deferred)
1. **기업 연락처 마이그 적용**(승인 후) + 실DB e2e.
2. **카테고리 상세 폼 확장**: 홀별 정보(floor/capacity/rental_fee…)·스튜디오 상세 등 공개 노출
   필드와 관리 폼 격차 해소.
3. **리뷰 운영 보강**: 신고/스팸, 새 후기 이메일 알림, 답변 템플릿.
4. **갤러리**: 앨범 사진 재정렬·앨범 메타 편집·일괄 삭제.
