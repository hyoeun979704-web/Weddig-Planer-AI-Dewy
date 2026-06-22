# 모바일 청첩장 리뉴얼 — 네이티브 섹션 뷰어 (I-MOBILE)

> 목표: 발행 모바일 청첩장 품질을 시중 최상위(MakeDear·바른손·카카오 모바일청첩장) 수준으로.
> 사용자 요구 = **인터랙션·사운드·UI** 가 핵심. 네 가지(스크롤 모션 / BGM·사운드 /
> 타이포·UI 완성도 / 지도·계좌·방명록) 전부 P0.

## 1. 근본 진단 — 왜 지금은 시중 수준이 안 되나

현재 발행 뷰어(`InvitationViewer.tsx` + `InvitationCanvas.tsx`)는 **1080px 고정
Konva 캔버스**에 이미지·텍스트 노드를 좌표로 찍어 스크롤시키는 "움직이는 포스터"다
(`presentation: "seamless_roll"`). 이 구조가 품질 천장을 만든다:

- **인터랙션**: 탭→액션 + Konva 트윈이 한계. CSS/스크롤 기반의 부드러운 등장·패럴랙스·제스처 불가.
- **사운드**: 캔버스 안에 `<audio>` 를 못 넣음 → BGM 자체가 구조적으로 불가.
- **타이포/UI**: 캔버스 텍스트는 래스터라이즈 → 고DPI 흐릿·선택불가·접근성↓. 네이티브 폰트의 또렷함·여백·반응형이 안 나옴.
- **지도 임베드·동영상·방명록**: 캔버스 내부 불가.

→ 캔버스에 기능을 덧대도 천장이 고정. **발행 뷰어를 네이티브 DOM 섹션 렌더러로 전환**해야 한다.
(시중 서비스는 전부 "테마 + 폼 입력 → 큐레이션 반응형 섹션" 모델이지 자유 캔버스가 아니다.)

## 2. 새 아키텍처

```
invitations(row: user_data + layout.imageUrlsForViewer + template.tone)
        │  extractMobileContent(row)               (src/lib/invitation/mobileContent.ts)
        ▼
MobileInvitationContent  ──►  <MobileInvitationView/>  (src/pages/invitation/MobileInvitationView2.tsx)
   {names, date, greeting,         │  theme = themeForTone(tone)   (mobileThemes.ts)
    parents, gallery[], venue,     ▼
    accounts[], bgmUrl, ...}   섹션 컴포넌트(네이티브 DOM):
                                Cover · Greeting · DateCalendar(D-day) · Gallery(lightbox)
                                · Venue(지도앱) · Account(복사) · Closing
                                + 모션(Reveal/Parallax) + BgmPlayer
```

- **데이터 무변경 시작**: 기존 `user_data`(couple_names/wedding_date/venue_*/intro/parents/account)
  와 `layout.imageUrlsForViewer`(main_photo/gallery_*) 를 어댑터가 정규화. 스키마 변경 없이 Phase 1 가능.
- **테마 토큰**: 색/폰트/여백/모션을 토큰화(`MobileTheme`). tone→theme 매핑. 신규 테마는 토큰만 추가.
- **비파괴**: 새 라우트 `/i2/:slug` 로 먼저 출시(기존 `/i/:slug` 캔버스 유지). 검증·합의 후 모바일 기본 뷰어로 승격.
- **빈 데이터 우아 처리**: 데이터 없는 섹션은 숨김(큐레이션 원칙 — dead-end 방지).

## 3. 섹션 명세 (시중 표준 대응)

| 섹션 | 내용 | 인터랙션 |
|---|---|---|
| Cover | 풀블리드 히어로 + 한/영 이름 + 일시 | 진입 페이드/줌, 스크롤 시 패럴랙스 |
| Greeting | 인사말 + 양가 혼주(아버지·어머니/아들·딸) | 스크롤 등장 |
| DateCalendar | 포맷 일시 + 미니 달력(예식일 강조) + **D-day 카운터** | 등장 + 실시간 카운트 |
| Gallery | 다중 사진 반응형 그리드 | **풀스크린 스와이프 라이트박스** |
| Venue | 예식장명·주소 + 교통 안내 | **지도앱 바로열기(카카오맵·네이버·티맵)**, (Phase 2) 지도 임베드 |
| Account | 신랑측/신부측 계좌 아코디언 | **복사 버튼** + (Phase 2) 카카오페이 |
| RSVP | 참석 의사 | 시트(기존 RPC `submit/update_invitation_rsvp` 재사용) |
| Guestbook | 하객 공개 축하글 | (Phase 4) 작성·목록·비번 삭제 |
| BgmPlayer | 배경음악 | 우상단 토글, iOS 제스처 언락 |

## 4. 단계별 로드맵 (PR 단위)

- **Phase 1 (이 PR)** — 기반 + 프리미엄 테마 1종 + 핵심 섹션(Cover·Greeting·DateCalendar·
  Gallery·Venue·Account·Closing) + 스크롤 모션 + BgmPlayer(콘텐츠에 bgmUrl 있을 때). `/i2/:slug` 프리뷰.
- **Phase 2** — 지도 임베드(카카오/네이버 JS SDK, 키 필요) + 계좌 데이터 모델(은행·예금주) + 카카오톡 공유 SDK(썸네일/제목).
- **Phase 3** — RSVP 섹션 통합(기존 RPC) + 모션 정교화(패럴랙스·플로럴 입자) + 테마 2~3종 추가.
- **Phase 4** — 방명록(테이블 + RLS + 섹션) + 동영상 임베드.
- **Phase 5** — 에디터 전환(자유 캔버스 → 폼 기반 섹션 편집 + 테마 선택). 기존 캔버스 뷰어 deprecate.

## 5. 검증 메모

- DB·실데이터 의존 e2e 는 sandbox 불가. `/i2/:slug` 로 **실제 발행 카드**를 열어 MakeDear 와 나란히 비교.
- 폰트는 `useInvitationFonts` 가 @font-face 를 전역 주입하므로 DOM 에서도 동일 폰트 사용(재사용).
- 모션은 `prefers-reduced-motion` 존중. iOS BGM 은 사용자 제스처 후 재생(자동재생 정책).
