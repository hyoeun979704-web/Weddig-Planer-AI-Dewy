# 사용 가이드 작성·업데이트 플레이북 (단일 절차서)

> 소비자(`/help`)·기업(`/business/guide`) **인앱 사용 가이드**를 만들거나 **새 기능을 가이드에
> 반영**할 때 따르는 정식 절차. "지금 추가한 기능 가이드에 업데이트해줘" 류 요청은 이 문서대로
> 수행한다. 스크린샷 생성 세부는 `docs/business-guide-capture.md`, 발견 이슈 기록은
> `docs/consumer-guide-qa.md`(소비자) 참조.

## 0. 완성의 정의 (Definition of Done) — 셋 다 충족해야 "완성"
가이드는 슬라이드를 채웠다고 끝이 아니다. 아래 3가지를 **반드시** 검증한다.

1. **주제 ↔ 내용 일치** — 각 가이드/슬라이드가 그 주제(기능)를 정확히 설명한다.
   요청받은 주제를 **임의로 합치거나 줄이지 않는다**(요청 목록 = 가이드 목록).
2. **텍스트 ↔ 시각데이터 일치** — 슬라이드의 제목·설명·팁·**하이라이트 라벨**이 캡처된 실제
   화면과 일치한다. ① 화면에 없는 UI를 설명하지 않는다 ② 강조 박스가 설명하는 **그 요소 위**에
   있다(엉뚱한 곳/누락 금지) ③ 숫자·단위가 화면 표기와 같다.
3. **사용자 시뮬레이션 통과** — 실제 로그인 사용자가 가이드를 따라갈 때:
   화면이 **데이터로 채워져** 있고(빈 화면 금지), CTA·이전/다음·각 링크가 **깨짐 없이** 이동하며,
   상세/목록이 정상 렌더된다(e2e로 직접 확인).

## 1. 가이드 시스템 구조 (어디를 고치나)
| 구성 | 소비자 | 기업 |
|------|--------|------|
| 데이터(단일 소스) | `src/data/consumerGuides.ts` | `src/data/businessGuides.ts` |
| 목록 페이지 | `ConsumerGuideIndex` (`/help`) | `BusinessGuideIndex` (`/business/guides`) |
| 상세(슬라이드) | `ConsumerGuideDetail` (`/help/:id`) | `BusinessGuideDetail` (`/business/guide/:id`) |
| 프레젠테이션(공용) | `src/pages/business/BusinessGuideView.tsx`(스와이프 슬라이드) | 동일 |
| 슬라이드 이미지 | `src/assets/consumer/guide/*.png` | `src/assets/business/guide/*.png` |
| 캡처 스크립트 | `scripts/capture-consumer-shots.cjs` | `scripts/capture-guide-shots.cjs` |
| 산문 문서(CS/단일콘텐츠) | `docs/consumer-onboarding-guide.md` | `docs/business-onboarding-guide.md` |

슬라이드 타입은 `GuideSlide { phase, img, alt, title, subtitle, tip, tags }`(BusinessGuideView).
가이드는 `{ id, headerTitle, eyebrow, deskHeading, deskSub, slides[], cta }` + 목록/이전다음 헬퍼.

## 2. 새 기능 가이드 추가/업데이트 — 단계별 절차
사전: 목 + dev 서버 기동
```
# 자기 자신 pkill 주의: 시작 명령에 'mock-supabase' 문자열이 있으면 self-kill → 죽이기/띄우기 분리
MOCK_BUSINESS=1 node scripts/visual-review/mock-supabase.cjs            # 9999
VITE_SUPABASE_URL=http://127.0.0.1:9999 VITE_SUPABASE_ANON_KEY=mock \
  npm run dev -- --host 127.0.0.1 --port 5199                          # 5199
```
- **(A) 화면 파악**: 실제 라우트·로그인 필요 여부·핵심 요소 selector 확인. 먼저 `DISCOVER=1`
  풀페이지 덤프로 화면 내용을 눈으로 본다. (라우트는 `src/App.tsx`에서 확인.)
- **(B) 목 데이터 채우기**: 그 화면이 비지 않도록 `mock-supabase.cjs` `ROWS`에 행 추가.
  테이블·컬럼은 **`src/integrations/supabase/types.ts`** + 화면의 `.from(...).select(...)`로 확인.
  **단위·enum 주의**(아래 §5). 사용자 데이터는 `user_id = USER_ID` 기준.
- **(C) 캡처 SHOT 추가**: `capture-consumer-shots.cjs` `SHOTS`에
  `{ id, route, auth, label, target:{sel|pick}, pad, below }`. **사용자 데이터 화면은 `auth:true`**.
  `target`은 **채워진 화면에 실제 존재하는** 텍스트/버튼.
- **(D) 캡처 실행**: `node scripts/capture-consumer-shots.cjs [--only=c-xxx]` → 로그에서 **`(hi)`**
  확인. `no hi`(target 미발견)면 캡처 PNG에 강조 박스가 없으니 **target 교정 후 재캡처**.
- **(E) 데이터/슬라이드 등록**: `consumerGuides.ts`에 가이드/슬라이드 추가(이미지 import +
  title/subtitle/tip/tags). 16개 주제처럼 **주제별로 분리**(축약 금지).
- **(F) 텍스트↔이미지 일치 점검**: 캡처 PNG를 **직접 열어 보고**(필수) 문구·숫자·강조 위치가
  화면과 맞는지 확인. 안 맞으면 문구 또는 target/데이터 수정.
- **(G) 사용자 시뮬레이션 e2e**: `/help` 목록 노출 수, `/help/:id` 슬라이드 렌더·강조·**이전/다음
  가이드(첫 슬라이드부터)**·**CTA 라우트 유효성**(죽은 링크 금지)·빈 화면/크래시 없음 확인.
- **(H) 마무리**: `npm run build` · `npm run lint`(error 0). 발견·수정 이슈는
  `docs/consumer-guide-qa.md`에 표로 기록. 산문 문서(`docs/consumer-onboarding-guide.md`)도
  같은 변경 반영.

## 3. 캡처 규칙 (md 원칙)
3:4(390×520, DPR2) 라이브 뷰포트 + **SUITE 폰트 주입** + 핑크 **하이라이트 박스 + 라벨 pill**.
홈 Premium 유도·웰컴 등 오버레이는 자동 닫기(`dismissOverlays`). 출력은 viewport-only(풀페이지 크롭 금지).

## 4. 목 데이터 운영 (가이드 캡처용)
- `MOCK_BUSINESS=1`로 기동(소비자/기업 데이터 동시 로드). 채워둔 소비자 개인 데이터:
  `favorites · vendor_board_items · budget_settings/items · community_posts · invitations ·
  user_points · orders · quote_requests` + 비교/카테고리용 **업체 여러 곳**(`places`).
- **목 GET 필터**: `id`·`place_id`의 `eq`만 honor(상세 `.maybeSingle()`이 단건 받게). 그 외 필터는
  무시 → 리스트는 전부 반환(후보가 다소 많게 보일 수 있음 — 캡처상 무방).
- 행 추가 후 **목 재기동 필요**(node 핫리로드 없음).

## 5. 자주 나는 버그 / 사전 체크리스트 (이번 세션 회귀 — 반드시 확인)
- **다중 행 + `.maybeSingle()` → 상세 "찾을 수 없어요"**: `places` 여러 곳이면 `/vendor/:id`·
  `/product/:id`·`/event/:id`가 깨진다 → 목 `id/place_id` eq 필터 필수(§4).
- **데이터 채우면 화면 문구가 바뀜 → 캡처 target 깨짐(no-hi)**: 빈 상태 문구로 target 잡지 말고
  **채워진 화면 기준** target(예: 보드 "정리 중인 업체", 예산 "남은 예산", 커뮤니티 "오늘의 수다").
- **단위 불일치**: 예산은 앱이 **만원 단위**로 표시(`{amount}만원`) → 목 값도 만원 단위.
  (회귀: 원 단위 입력 → "35,000,000만원".)
- **사용자 데이터 화면은 `auth:true`로 캡처**: 아니면 로그인 프롬프트/빈 화면이 찍힘(찜·비교·커뮤니티 등).
- **가이드 간 이동은 첫 슬라이드부터**: `BusinessGuideView`가 slides 교체 시 캐러셀 0으로 리셋(유지).
- **컴포넌트 방어**: 예상 외 enum/status 값에 페이지가 크래시되지 않게 폴백(예: 보드 status →
  `VENDOR_STATUS_META[status] ?? undecided`).
- **추천/관련 섹션은 큐레이션**(AGENTS.md): 빈 결과면 섹션 숨김.

## 6. 요청 "이 기능 가이드에 추가/업데이트" 빠른 실행 순서
1) 주제 정의(요청 그대로, 분리) → 2) 화면 DISCOVER 확인 → 3) 목 데이터 채움 → 4) SHOT 추가·캡처
((hi) 확인) → 5) `consumerGuides.ts` 슬라이드 추가 → 6) PNG 직접 보고 텍스트↔이미지 일치 →
7) e2e 시뮬레이션(목록·상세·이전/다음·CTA) → 8) build/lint + QA 기록. **§0 3개 충족 = 완성.**
