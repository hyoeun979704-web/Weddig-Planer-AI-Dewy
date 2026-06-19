# 소비자 가이드 — e2e 워크스루 QA 기록 (260619)

> 가이드 캡처/구성 과정에서 **사용자 시점 e2e 워크스루**로 발견한 이슈와 수정 내역.
> 캡처는 목 데이터로 화면을 채운 뒤 진행(빈 화면 숙지 곤란 방지).

## 1. 발견·수정 이슈
| # | 화면 | 증상 | 원인 | 수정 |
|---|------|------|------|------|
| B1 | `/board` | 페이지 크래시("문제가 발생했어요") | `vendor_board_items.status`에 유효하지 않은 값이 오면 `VENDOR_STATUS_META[status]`가 undefined → 렌더 에러 | `VendorBoard` SlotCard 에 `?? VENDOR_STATUS_META.undecided` 폴백(예상 외 값에도 안 깨짐) + 목 status 정상값(`undecided/quoting/booked`)으로 수정 |
| B2 | `/compare` | 찜이 있어도 "찜 0곳뿐" 빈 메시지 | `category` 상태가 **찜 비동기 로드 전** 빈 문자열로 초기화돼 로드 후에도 갱신 안 됨(프로덕션 회귀) | 찜 로드 후 유효 카테고리가 생기면 첫 카테고리로 설정하는 `useEffect` 추가 |
| B3 | `/quote` | 내 견적 목록 비어 있음 | 목에 `USER_ID` 기준 `quote_requests` 없음(기존은 업체뷰용 CUST_ID) | 목에 소비자 본인 견적 요청 2건 추가 |
| D1 | 찜·예산·보드·커뮤니티·청첩장·마이페이지 | 빈 화면이라 가이드 숙지 곤란 | 목에 소비자 개인 데이터 부재 | 목 데이터 채움(아래 §2) |

## 2. 목 데이터 보강 (scripts/visual-review/mock-supabase.cjs)
- **업체 5곳**(스튜디오2·웨딩홀2·드레스1) — 비교/카테고리/찜이 비지 않게.
- **favorites 5**(업체 찜) · **vendor_board_items 3**(예약완료/견적중/미정) · **budget_settings/items**(총예산·항목 4) ·
  **community_posts 3**(후기/꿀팁/Q&A) · **invitations 1** · **user_points**(3,200P) · **orders 1** · **quote_requests 2**(본인).

## 3. 가이드 구조 — 16개 주제(축약 없이)
요청한 16개 항목을 각각의 가이드로 구성(회원가입만 비회원 기준, 나머지는 로그인 회원 기준):
회원가입 · 홈 화면/메뉴 · 카테고리·업체상세 · 업체보드 · 견적 · 업체비교 · 스케줄 · 예산 ·
커뮤니티 · 마이페이지 · AI 플래너 · AI 스튜디오 · 꿀팁 · 이벤트 · 쇼핑 · 문의 접수.
- 형식: 기업 가이드와 동일 `BusinessGuideView` 슬라이드 + `/help` 목록 + 이전/다음 가이드 네비.
- 각 슬라이드 **내용·설명·이미지 일치** 확인(채워진 실제 화면 캡처 기준).

## 4. 검증
- build · lint(error 0) · e2e: `/help` 16개 가이드 노출, 상세 슬라이드 렌더, board/compare/quote 채워짐·정상.
- 한계: 일부 화면은 목이 필터(`id=eq`·`user_id`)를 무시해 후보가 많게 보일 수 있음(실 Supabase는 정확 필터).
