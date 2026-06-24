# Console(운영자) + 마케팅 구조 분석 & 전용 대시보드 설계 (260624)

> 목적: 어드민을 "각 관리 전용 대시보드"로 분리(고도화 쉬운 구조)하기 전, **현재 구조를 정확히
> 파악**해 잘못 쪼개지 않도록 한다. 전수 조사(서브에이전트 3갈래 fan-out, 실제 코드·문서 확인) 기반.
> 동반 문서: `260624_app_separation_roadmap.md`(전략), `260624_app_separation_execution_plan.md`(실행).

## 전제 (2026-06-24 확정)

- **운영자(Console) 앱 = 나 혼자 쓰는 솔로 도구 + 주로 폰 사용** → **모바일 우선** 설계 필수
  (기존 "웹 전용" 가정 폐기). 데스크톱 사이드바 중심 UX를 폰 중심으로 재편.
- **마케팅도 나 혼자 쓰는 솔로 내부 도구** → Console 안의 한 대시보드로 통합(별도 앱 X).

---

## 1. 현재 구조 — 실측 요약 (잘 돼 있는 부분)

운영자 영역은 **이미 깔끔하게 모듈화**돼 있다. 새로 발명할 필요 없이 "그룹핑 + 모바일화"만 하면 된다.

| 항목 | 현황 | 파일 |
|---|---|---|
| admin 페이지 | **30개**, 서로 import 거의 없음(독립) — 각자 Supabase 직접 쿼리 | `src/pages/admin/*` |
| **네비게이션 단일 소스** | `ADMIN_NAV` 배열(label·href·icon·badge·featured) — 사이드바·대시보드가 **모두 여기서 파생**(드리프트 0) | `src/components/admin/adminNav.ts` |
| 권한 가드 | `AdminGuard`(라우트 레벨, `useUserRole`의 role='admin' 체크) | `src/components/admin/AdminGuard.tsx` |
| 공통 레이아웃 | `AdminLayout`(사이드바 + 모바일 드로어 + safe-area) | `src/components/admin/AdminLayout.tsx` |
| 대시보드 허브 | `AdminDashboard`(KPI 17개 병렬 쿼리 + featured 빠른액션) | `src/pages/admin/AdminDashboard.tsx` |
| 공통 위젯 | `ImageUploader`(★business와 공유), `ComingSoonAdminPage`, `SheetSplitDialog` | `src/components/admin/*` |
| admin 전용 lib/hook | **없음** — 모두 공유 lib(`utils·postgrestEscape·relativeTime·weddingPersona` 등) + `useUserRole` 사용 | — |

**결합도(분리 관점)**:
- admin 페이지 ↔ 페이지: 결합 거의 0 (독립).
- admin → 소비자/기업: **0** (역오염 없음).
- 기업 → admin: `ImageUploader` **1개만** 공유(`BusinessVendorEdit/Gallery/Products/Designs/Events`). → 이 컴포넌트는
  공유 위치(`components/`)로 빼면 끝.
- `useUserRole`: admin·business·consumer 공유 → **유지**(분리 금지, 이미 검증).

> 즉 Console 분리의 코드 장벽은 **`ImageUploader` 공유 1건뿐**. 나머지는 폴더 이동 + nav 그룹핑.

---

## 2. 30개 페이지 → 6개 전용 대시보드 그룹핑 (제안)

기존에도 사실상 5~6그룹으로 갈려 있다(`audit-surface-map.md` C1~C5). 이를 **명시적 대시보드**로.

| # | 대시보드 | 포함 페이지 | 주요 테이블/RPC |
|---|---|---|---|
| 1 | 🏢 **업체·입점** | AdminPlaces, AdminPlaceEdit, AdminPlaceClaims, AdminBusinessReview | `places`, `business_profiles`, `admin_review_business_profile`, `admin_*_place_claim` |
| 2 | 🛍 **상품·커머스** | AdminProductCuration, AdminFeaturedProducts, AdminContentReview(기업 이벤트/쿠폰 검토) | `products_pool`, `business_events`, `business_coupons` |
| 3 | 🛡 **모더레이션·CS** | AdminReports, AdminInquiries, AdminUsers, AdminCommunityAnnouncements, AdminErrorLogs, AdminServiceWaitlist | `admin_reports_overview`, `inquiries`, `profiles`, `community_announcements`, `client_error_logs` |
| 4 | 💌 **청첩장 에셋** | AdminInvitationTemplates, AdminInvitationAssets, AdminInvitationFonts | `invitation_templates/assets/fonts` |
| 5 | 🤖 **AI 운영** | AdminAIJobs, AdminAIPrompts, AdminAiPromptEditor, AdminAgentOutputs, AdminDress/Makeup/HairSamples, AdminWeddingPhotoRefs | `ai_prompts`, `agent_outputs`, `*_samples`, `admin_ai_job_stats` |
| 6 | 📣 **마케팅(솔로)** | AdminInstagramPosts(+Edit), AdminTipInstagrams, AdminPromotions | `instagram_post_drafts`, `tip_instagrams`, `tip_instagram_accounts`, `promotions` |

(드레스/메이크업/헤어 샘플은 AI 생성 소재라 ⑤ AI운영에 묶음 — 필요시 별도 ⑦ 콘텐츠 카탈로그로 분리 가능.)

---

## 3. 마케팅 자동화 파이프라인 (⑥ 대시보드 상세 — 솔로 도구)

이미 **3단계 독립 파이프라인**으로 성숙. 흩어짐은 "중간"(UI 3 + edge 4 + 테이블 3).

```
주제 입력 → [AI 카피·카드텍스트 생성] → [카드 PNG 렌더] → 검수·승인 → 예약 → [IG 발행]
            instagram-draft-generator    instagram-card-renderer        instagram-publisher
            (Gemini Flash, ~$0.075/회)    (Satori+Resvg, Storage)        (IG Graph API v19)
보조: [릴스 수집] instagram-collect-reels (Business Discovery) → tip_instagrams
```

| 단계 | 위치 | 비용 |
|---|---|---|
| 초안 목록/추가 | `src/pages/admin/AdminInstagramPosts.tsx` | — |
| 초안 편집·라이프사이클(draft→approved→scheduled→published/failed) | `src/pages/admin/AdminInstagramPostEdit.tsx` | — |
| 팁 인스타 큐레이션·릴스 수집 | `src/pages/admin/AdminTipInstagrams.tsx` | — |
| AI 카피 생성 | `supabase/functions/instagram-draft-generator` | Gemini ~$0.075/회 |
| 카드 PNG 렌더 | `supabase/functions/instagram-card-renderer` | Storage(무료쿼터) |
| IG 발행 | `supabase/functions/instagram-publisher` | Meta Graph(무료) |
| 릴스 수집 | `supabase/functions/instagram-collect-reels` | Meta Graph(무료) |
| 6채널 배포 스펙 | `docs/content-distribution.md` + `.claude/skills/marketing-draft` | — |
| 테이블 | `instagram_post_drafts`, `tip_instagrams`, `tip_instagram_accounts` | — |

- **월 비용 추정 ~$1.5 미만**(Gemini만). 외부 호출 비용 발생점 = 생성(Gemini)·발행/수집(Meta, 무료).
- **미완(향후)**: 목록에서 일괄 AI생성 버튼, 렌더링 UI 버튼, pg_cron 자동발행(MANUAL 파일), 발행 전 프리뷰,
  인스타 외 6채널 UI(현재 스킬로만).
- 환경변수: `IG_PAGE_ACCESS_TOKEN`, `IG_BUSINESS_ACCOUNT_ID`, `IG_GRAPH_TOKEN`, `IG_USER_ID`, `GEMINI_*`.

### 3-A. 업체 마케팅 — 제휴 브랜드 학습 + 페르소나 소개형 광고 (신규 기획, 2026-06-24)

**컨셉**: 제휴업체를 마케팅할 때, Dewy **페르소나의 톤을 해치지 않고** 페르소나가 그 업체를 **추천·소개하는
방식**(네이티브 광고). **"광고/제휴"임을 명확히 표기**. 업체의 **브랜딩 자료·포트폴리오를 지정한 Google
Drive 폴더에서 학습**시킨 뒤, 그 브랜드에 **맞춘 콘텐츠**를 생성한다.

**재사용 가능한 기존 인프라(확인됨 — 새로 안 짜도 됨)**:
- **Drive 학습**: `supabase/functions/drive-oauth-start|callback`, `drive-photos`, `drive-sync-cron`
  (폴더 OAuth·자료 fetch·주기 동기화 이미 존재) → 업체별 폴더 지정 후 자료 수집.
- **페르소나 소개**: `src/lib/weddingPersona.ts`(20모드) + `personaRecommendations.ts` + `tipCuration.ts`
  (큐레이션 패턴) → 페르소나 보이스 유지 + 해당 모드에 맞는 "추천 사유"로 업체 소개.
- **제휴 게이트**: `partner_tier`/`partner_rank`(이미 `usePlaceRecommendations` 등 큐레이션에 사용) →
  **제휴 등급 업체만** 대상, 등급순 우선.
- **생성**: `instagram-draft-generator`(Gemini) 확장 — 브랜드 프로필 + 페르소나 타깃을 프롬프트에 주입.

**흐름(안)**:
```
업체 선택(제휴 등급) → Drive 폴더 지정 → [브랜드 학습] → 브랜드 프로필 캐시
   (로고·컬러·톤·포트폴리오 요약)              drive-* + Gemini, vendor_brand_profiles 테이블
→ 페르소나 타깃 + 주제 선택 → [맞춤 생성] → 페르소나 보이스 + 브랜드 맞춤 + 광고표기
   instagram-draft-generator 확장 / card-renderer가 업체 컬러·로고 반영
→ 검수 → 발행(IG 등)  ※모든 산출물에 #광고 #제휴 + 카드 내 라벨 강제
```

**반드시 지킬 것(차원 연계)**:
- **§10 법적 — 광고 표기 의무(필수·비협상)**: 경제적 이해관계가 있는 추천은 **명확히 광고/제휴 표기**해야
  함(표시광고법·공정위 추천보증 심사지침=‘뒷광고’ 규제). 캡션 해시태그 + **카드 내 시각 라벨** 둘 다,
  생성 단계에서 **자동 강제**(끄기 불가).
- **§14 초개인화 — 페르소나 보존**: "전원 동일 광고"가 아니라 **페르소나 모드별 추천 사유**로 소개(페르소나
  보이스 유지). 페르소나를 깨는 톤·표현 금지(가드).
- **§13 데이터 거버넌스**: 업체 Drive 자료는 **업체 동의** 하에 사용·캐시. 보존·파기 정책(제휴 종료 시
  브랜드 프로필 파기), 제3자(Drive·Gemini) 처리 고지.
- **§11 비용/쿼터**: Drive 재학습은 **폴더 변경 시에만**(drive-sync-cron 감지) — 매 생성마다 재학습 금지.
  브랜드 프로필 캐시 + 생성 호출 상한·백오프.

**신규로 필요한 것**:
- `vendor_brand_profiles` 테이블(업체↔drive_folder_id↔학습 요약/컬러/last_synced) — DB 작업 전 테이블
  선확인 게이트 준수(`types.ts` 먼저).
- 마케팅 대시보드 내 "업체 브랜드 학습" UI(폴더 지정·학습 트리거·프로필 미리보기).
- 생성 프롬프트에 브랜드 프로필 + 페르소나 타깃 주입 + 광고표기 강제 로직.

> 정리: **Drive 학습 + 페르소나 추천 + 제휴 등급 + Gemini 생성**은 기존 조각이 다 있고, 이를 **엮고
> ‘광고 표기 강제 + 브랜드 프로필 캐시’만 신규**로 추가하면 된다. 로드맵 Phase 5(마케팅 모듈)에 편입.

---

## 4. "고도화 쉬운 구조"로 가는 핵심 — 이미 있는 단일 소스를 활용

**관리하기 복잡한 원인** = 30개가 사이드바 1단 평면 리스트라 스크롤·인지 부하 + 폰에서 특히 불편.

**해법(작고 안전 — `adminNav.ts` 단일 소스 덕에 쉬움)**:
1. `adminNav.ts` 각 항목에 **`group` 필드 추가**(업체/상품/모더레이션/청첩장/AI/마케팅).
2. 허브 `/admin` = **6개 그룹 카드**(각 카드에 그 그룹의 pending 배지·KPI). 카드 → 그룹 대시보드.
3. 그룹 대시보드(`/admin/<group>`) = 그 그룹 KPI + 하위 페이지 진입 + 최근 활동(AdminDashboard 패턴 재사용).
4. `AdminLayout` 사이드바 = **그룹별 섹션(접기/펼치기)**. 모바일은 그룹 탭/바텀시트.
5. **모바일 우선 재편(솔로+폰)**: 사이드바 의존 ↓, 바텀 탭/그룹 칩 + 카드형 리스트 + 큰 터치타깃(≥44pt).

→ 새 admin 기능 추가 = `adminNav`에 항목 1개(+group) 추가 + 페이지 1개. **그룹·허브·사이드바가 자동 반영**
(단일 소스라 드리프트 0). 이것이 "고도화 쉬운 구조".

---

## 5. 분리·재편 순서 (제안)

전체 로드맵의 Console 트랙. 앱 분리(Phase 1 console 폴더 이동)와 대시보드 재편은 **독립적으로** 진행 가능.

1. **C-1 폴더 이동**: `pages/admin/*` → `features/console/`, `components/admin/*` → `features/console/components/`
   (단 `ImageUploader`는 business도 쓰므로 **공유 `components/`로 승격**). 경계 린트.
2. **C-2 nav 그룹핑**: `adminNav.ts`에 `group` 추가 + 허브/사이드바 그룹화(저위험, 화면 점진 개선).
3. **C-3 그룹 대시보드**: 6개 그룹 Overview 페이지(KPI·배지·최근활동) — AdminDashboard 패턴 복제.
4. **C-4 모바일 우선 재편**: 폰 레이아웃(바텀탭/칩/카드) — 솔로+폰 전제.
5. **C-5 마케팅 모듈 완성**: 일괄 생성·렌더 UI·프리뷰·(선택)6채널 — 로드맵 Phase 5.
6. **C-6 Console PWA 패키징**(Phase 4): 모바일 우선 → **설치형 PWA**(확정) + 웹푸시. `console.dewy.app`.

---

## 6. Console 출시 형태 — PWA 확정 (2026-06-24)

"혼자 + 폰" → 모바일 우선 + **설치형 PWA로 확정**.
- **PWA**: 설치형 웹(홈화면 추가), 스토어·심사 0, 즉시 배포, 솔로 내부도구에 가장 가볍고 빠름.
- 푸시(신고·문의 즉시 알림)는 **웹푸시**로 구현(iOS 16.4+ 설치형 PWA 웹푸시 지원). 네이티브 푸시가
  꼭 필요해지면 추후 Capacitor 래핑으로 승격 가능(코드 재사용).
- 빌드: `console.dewy.app`에 PWA manifest + service worker(앱은 이미 `vite-plugin-pwa` 사용 중 —
  consumer와 분리된 console 전용 manifest/SW로 구성). 단일 Supabase 백엔드.
- §5 C-6 = "Console PWA 패키징"으로 확정.

---

## 결론 (파악 요약)
- 운영자 영역은 **이미 모듈화 우수**(독립 페이지 + nav 단일 소스 + 가드/레이아웃 분리). 코드 결합 장벽은
  `ImageUploader` 공유 1건뿐.
- "복잡함"은 **평면 30개 리스트 + 데스크톱 사이드바**가 원인 → **6 그룹 대시보드 + 모바일 우선**으로 해결.
- 마케팅은 성숙한 솔로 파이프라인 → ⑥ 마케팅 대시보드로 통합.
- 단일 소스(`adminNav.ts`) 덕에 **고도화 쉬운 구조**로 가는 변경이 작고 안전.
