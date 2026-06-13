# 260613 — e2e 전체 UX/UI 검토 (전 페이지·기능·토스트)

> 방식: 7앵글 코드 워크스루(글로벌 패턴 / 홈·업체 / AI챗·예산 / 마이페이지·인증·기업 /
> 청첩장·커뮤니티·게임·결제) + 발견 건별 검증. 총 ~90건 발굴 → 검증 후 버그 11건 즉시 수정,
> 개선 백로그 25건 정리. **한계**: 샌드박스에서 브라우저 미설치로 실기기 시각 확인은 미수행
> (코드 레벨 검증) — 다크모드·연출 타이밍은 실기기 1회 확인 권장.

## TL;DR
- **즉시 수정(이 PR)**: 다크모드 깨짐 3곳(타이핑 인디케이터·홈 로고·설문 모달/카드),
  RSVP 빈 성함 조용한 실패, 결제실패 dead-end, 프리미엄 한도 문구, 기업 가입 의도 소실,
  메모리칩 truncate, 뒤로가기 aria-label.
- **최우선 백로그**: ① 토스트 2계 혼용(sonner 73 vs shadcn 48 파일 — sonner 단일화)
  ② window.confirm 13곳 → AlertDialog ③ 스켈레톤 없는 로딩(Community/Orders/Budget)
  ④ 커뮤니티 카드 좋아요가 서버 미연동(로컬 토글만).

## 1. 즉시 수정 완료 (이 PR)

| # | 파일 | 내용 |
|---|---|---|
| 1 | wedding-planner/TypingIndicator.tsx | `bg-white` → `bg-card`+border — 다크모드에서 "생각 중" 점이 안 보이던 버그 |
| 2 | home/HomeHeader.tsx | 로고 `text-black` → `text-foreground` (다크모드) |
| 3 | LockedCard.tsx · SurveyModal.tsx | `bg-white` → `bg-card` (다크모드 카드/모달) |
| 4 | invitation/InvitationViewer.tsx | RSVP 빈 성함 제출 시 조용히 무시 → "성함을 입력해주세요." 토스트 |
| 5 | HeartChargeFail.tsx | 재시도/포인트 2버튼뿐인 dead-end → "뒤로 가기" 추가 |
| 6 | wedding-planner/ChatSessionsSheet.tsx | 프리미엄(5/5)에게도 "한도 도달+업그레이드 톤" 노출 → 정리 안내 문구로 분기 |
| 7 | Auth.tsx | `?type=business` 진입자가 로그인↔가입 토글 시 기업 의도 소실(individual 강제 리셋) → 유지 |
| 8 | AIPlanner.tsx | 메모리 확인칩 긴 텍스트 truncate 미작동(flex min-w-0) → 버튼 밀림 수정 |
| 9 | detail/PlaceDetailLayout.tsx | 뒤로가기 아이콘 버튼 aria-label 추가 |

## 2. 개선 백로그 (우선순위)

### P0 — 시스템 일관성 (작업량 중간, 효과 큼)
- **토스트 단일화**: sonner(73파일) vs shadcn useToast(48파일) 혼용 — 위치·스타일·지속시간이
  달라 같은 앱에서 두 종류 토스트가 뜸. **sonner 로 단일화** + 카피 톤 가이드("~했어요." 통일,
  느낌표/존댓말 혼용 정리). 사례: "쿠폰을 받았어요" vs "신고가 접수되었습니다." vs "PDF가 다운로드됩니다!"
- **window.confirm 13곳 → AlertDialog(shadcn)**: 사용자 페이지 우선(SetAsWeddingVenueButton,
  HairPreview 하트 차감, AIPlanner/ChatSessionsSheet 채팅 삭제). 네이티브 confirm 은 웹뷰에서 이질적.
- **스켈레톤 로딩**: Community·Orders·Budget 등 스피너/공백만 있는 페이지에 콘텐츠 모양 스켈레톤.

### P1 — 신뢰/전환 직결
- **PostListCard(홈 피드) 좋아요가 로컬 state 만 토글** — 새로고침하면 원복(상호작용 착각).
  서버 연동 또는 표시 전용으로 결정 필요.
- **CommunityPostDetail 좋아요 낙관적 갱신 없음** — invalidate 전체 리페치로 0.5~1s 지연 체감.
- **기업 전환 깔때기**: 운영자 승인 결과를 "알려드릴게요"만 있고 채널(알림/메일) 불명 +
  반려 시 재신청 CTA 약함(BusinessDashboard). 승인/반려 시 인앱 알림 발송 권장.
- **Deals 필터가 페이지 이탈 시 리셋** — URL query 기반으로 보존 권장.
- **Store 필터 결과 0건 시 빈 그리드만** — "결과 없음 + 필터 조정" 빈 상태 추가.

### P2 — 시각/디테일
- AI챗: Send 비활성 `opacity-30` 너무 희미 / 타이핑 도트 색(#C9A96E)과 버블 색체계 불일치 /
  메모리칩·후속칩 간 여백 / 빠른질문 카드 emoji 전부 빈 문자열(시각 포인트 부재).
- VendorMediaCard 키워드 칩 overflow(truncate 없음, 4칩 시 잘림 가능).
- 마이페이지 QuickMenu "찜"과 "하트"가 같은 Heart 아이콘(색만 다름) + 하트가 /points 로 감 — 혼동.
- DdayCard "예정일 미정"(amber)이 경고처럼 보임 — 중립 톤 권장.
- Settings 언어 버튼 탭마다 토스트 반복 → "곧 지원 예정" 정적 라벨.
- Notifications "마케팅 알림"(기기 수신) vs Settings "마케팅·서비스 개선 활용"(데이터 동의) 용어 충돌.
- Profile weddingRegion 기본값 "서울" 하드코딩 — 미선택과 구분 안 됨.
- MergeGame 광고 로드 실패 시 무한 "불러오는 중" — 타임아웃+재시도 상태 필요.
- HeartChargeSuccess 에 최종 결제액(원) 미표기.
- 아이콘 버튼 aria-label 누락 일괄(PostImageGallery, VendorTagPicker 등 10+).

### P3 — 정책 결정 필요 (단독 진행 보류)
- 청첩장 발행 후 즉시 수정 반영 → draft 전환+재발행 정책(하객 혼동 방지).
- AI챗 응답 중 textarea 입력 허용 여부 — 현재 허용(다음 질문 미리 작성 가능, 의도적 유지).
  전송 버튼만 비활성. 변경 원하면 1줄.
- 기업회원 전환 메뉴가 랜딩(/business) 경유 — 혜택 소개 후 폼 진입(현행 유지 판단).
  바로 폼으로 보내려면 MenuSection href 1줄.

## 3. 검증 중 기각(오보) — 기록용
- "기타 찜 ItemType 누락" → 이미 `"etc"` 포함(useFavorites.ts).
- "기타 카테고리 9-join 미처리" → 이미 placeCat 단독 select 처리(useVendors.ts).
- "체크리스트/예산 진단 진입 불가" 류 기존 백로그 항목들은 이전 라운드에서 처리 확인.

## 4. 다음 액션 제안
1주차: 토스트 sonner 단일화 + confirm→AlertDialog(사용자 3곳) + 스켈레톤(3페이지).
2주차: 좋아요 서버 연동/낙관적 갱신 + 기업 승인 인앱 알림 + P2 디테일 일괄.
