# 전환 이벤트 측정 설계안 (Firebase/GA4 + Google Ads)

> ⚠️ **현재 상태(2026-06): 미연동.** 레포에 Firebase/GA4/gtag 의존성이 없고, `src/lib/behavioralSignals.ts`
> 는 **localStorage 기반 인앱 신호**(추천 프롬프트용)일 뿐 분석 도구가 아니다.
> 본 문서는 **연동 전 설계안**이며, 실제 SDK 배선은 별도 구현 작업이다. (지어내지 말 것: 아직 측정 안 됨)

## 1. 목표
- Google App Campaign / 광고 최적화에 쓸 **전환 이벤트** 확보.
- 퍼널 측정: 설치 → 회원가입 → 예식일 입력 → 체크리스트 생성 → 예산 입력 → 핵심 기능 사용.
- 채널별(UTM) 설치·가입 기여 파악.

## 2. 연동 방식(권장)
| 플랫폼 | 도구 | 비고 |
|---|---|---|
| 웹(dewy-wedding.com) | **GA4 (gtag.js)** 또는 Firebase JS SDK + GA4 | UTM은 GA4가 `session_source/medium`으로 자동 수집 |
| Android(Capacitor) | **@capacitor-firebase/analytics** (Firebase Analytics) | `first_open`·세션 자동 수집 |
| 광고 연결 | **GA4 ↔ Google Ads 링크** | App Campaign 입찰에 전환 가져오기 |

> 단일 이벤트 스키마를 웹/앱 공용으로 쓰면 채널 비교가 쉬움. 이벤트명·파라미터는 아래 표 고정.

## 3. 이벤트 택소노미

GA4 예약/권장 이름은 그대로(`sign_up`, `purchase`), 나머지는 커스텀. snake_case.

| 이벤트명 | 발생 시점 | 권장 삽입 위치(실제 코드) | 주요 파라미터 | 광고 전환 후보 |
|---|---|---|---|---|
| `app_first_open` | 앱 최초 실행 | Firebase 자동(Android) | — | — |
| `sign_up` | 회원가입 완료 | `src/contexts/AuthContext.tsx` 가입 성공 / `pages/Auth.tsx` | `method`(google/kakao/email) | ★ 주요 |
| `login` | 로그인 | AuthContext 로그인 성공 | `method` | — |
| `wedding_date_set` | 예식일(D-Day) 입력·저장 | 온보딩/`pages/Schedule.tsx`·웨딩 프로필 저장 지점 | `days_to_wedding` | ★ 주요 |
| `checklist_created` | 체크리스트 최초 생성/항목 추가 | `pages/Schedule.tsx` | `item_count` | 보조 |
| `checklist_item_done` | 체크리스트 항목 완료 | `pages/Schedule.tsx` | `progress` | — |
| `budget_input` | 예산 항목 입력/저장 | `pages/Budget.tsx`·`BudgetSplitSimulator.tsx` | `category` | 보조 |
| `ai_planner_used` | AI 상담 첫 메시지 전송 | `pages/AIPlanner.tsx` | — | 보조 |
| `ai_studio_used` | 드레스/메이크업 시뮬 실행 | `pages/DressFitting.tsx`·`MakeupFitting.tsx` | `type`(dress/makeup) | 보조 |
| `invitation_created` | 모바일 청첩장 생성 완료 | `pages/invitation/InvitationFlow.tsx` | — | 보조 |
| `purchase` | 하트 충전/결제 완료 | `pages/Checkout.tsx`·결제 성공 콜백 | `value`,`currency=KRW`,`item` | ★(가치) |
| `subscribe` | 프리미엄 구독 시작 | `pages/SubscriptionCheckout.tsx` 성공 | `value`,`plan` | ★(가치) |

## 4. 광고 전환 설정(권장)
- **주요 전환**: `sign_up`, `wedding_date_set` — 설치 직후 "진짜 사용 시작"을 의미해 App Campaign 최적화에 적합.
- **가치 전환**: `purchase`, `subscribe` — 매출 기반 입찰 시.
- Google Ads에서 위 이벤트를 전환으로 표시 → UAC가 자동 최적화.

## 5. UTM ↔ GA4
- 외부 링크 UTM(`utm_source=naver_sa&utm_medium=cpc...` 등, `docs/naver-search-ads-keyword-map.md` 참조)은
  GA4가 세션 소스/매체로 자동 매핑 → 채널별 `sign_up` 전환 비교 가능.
- 앱 설치 기여는 Google Play ↔ Firebase ↔ Google Ads 연결로 측정(웹 UTM과 별개 경로).

## 6. 구현 체크리스트(TODO — 별도 작업)
- [ ] GA4 속성 생성 → 측정 ID 발급
- [ ] 웹: gtag/Firebase JS SDK 삽입(+ SPA 라우트 변경 시 `page_view` 수동 전송 — React Router)
- [ ] Android: Firebase 프로젝트 + `google-services.json` + `@capacitor-firebase/analytics` 설치
- [ ] 공용 `logEvent(name, params)` 래퍼 1개 만들어 위 지점에 호출(웹/네이티브 분기)
- [ ] GA4 ↔ Google Ads 링크 + 전환 표시
- [ ] **동의·개인정보**: 분석 쿠키/식별자 처리 동의 + 처리방침에 분석 도구 고지 추가

## 7. ⚠️ 개인정보 처리방침 연동 필요
현재 `src/pages/Privacy.tsx` 위탁 목록에 **분석 도구(GA4/Firebase Analytics)가 없다.** 분석을 도입하면
처리방침 제5항(위탁)·제6항(국외 이전)에 Google Analytics/Firebase 항목을 추가하고, 분석 식별자 수집·동의를
고지해야 한다. (도입과 처리방침 갱신은 함께 진행)
