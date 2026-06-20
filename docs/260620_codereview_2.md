# 260620 전체 코드리뷰 (표준 전 차원) — 코드·DB·의존성·정책콘텐츠

> "코드 전체 감사 + 흩어진 정책 정리 + 코드↔정책 부합성" 요청의 **코드 차원 종합**.
> 같은 날 법적/보안 감사 `260620_codereview.md`(국내외법·AI규제) 와 **상보적** — 여기선
> 보안은 라이브 DB 어드바이저 중심 + P0버그·dead-end·iOS·DRY·계정삭제·의존성·정책콘텐츠 단일화.
> 입력: 서브에이전트 3종(dead-end·DRY/P0/iOS·법적콘텐츠) + 라이브 Supabase 어드바이저(보안/성능)
> + `delete-account` 정독 + `npm audit`. **감사(발견) 단계 — 개선은 후속 배치로 적용·커밋.**

## TL;DR
- **Dead-end UI = 거의 없음**(과거 회귀 '미입점 문의 토스트'는 수정 확인). 잔여: `Premium.tsx` "(테스트)" 라벨.
- **P0 코드버그 2종**: ① **결제 플로우 sessionStorage 무가드**(iOS 프라이빗→TID 유실→승인 실패) ② **ilike 미이스케이프**(사용자 `%/_` 입력 → 쿼리 오작동).
- **라이브 DB 어드바이저**: ERROR 1(security definer view) + WARN 9(함수 search_path·public 버킷 리스팅·always-true RLS 등) + 성능 대규모(RLS initplan 235·중복정책 152) → **출시 전 보안 WARN 정리, 성능은 백로그**.
- **계정삭제 불완전(법적)**: `delete-account`가 **스토리지 파일 미삭제**(CASCADE만 의존) → PIPA·스토어 삭제정책 위반 소지.
- **정책 콘텐츠 단일화**: 사업자정보가 **약관/방침에 누락**(Footer만) = 전상법 갭. 이메일 6곳 하드코딩+DB 이중소스.
- **의존성**: 6 취약점(high 2: `form-data`·`ws`).

---
## A. 라이브 DB 어드바이저 (실 프로젝트 `dewy_wedding_planer_AI`)
> 정적 코드리뷰가 못 보는 **실 DB 권위 린트**. ([Supabase database-linter](https://supabase.com/docs/guides/database/database-linter))

### A1. 보안 (출시 전 정리 권장)
| lint | level | 대상 | 조치 |
|---|---|---|---|
| `security_definer_view` | 🔴 ERROR | `community_author_cards` | PG17 `security_invoker=on` 또는 anon SELECT REVOKE |
| `function_search_path_mutable` | 🟠 WARN | 함수 19개(트리거·정규화·완성도 등) | 각 함수에 `SET search_path = public, pg_catalog` (객체 섀도잉 차단) |
| `public_bucket_allows_listing` | 🟠 WARN | 버킷 8개(`community-images`·`vendor-images`·`*-samples`·`invitation-*`) | 카탈로그 버킷은 허용 가능하나 **`community-images`·`vendor-images`는 전체 리스팅 차단**(열거 방지) |
| `rls_policy_always_true` | 🟠 WARN | `client_error_logs`·`product_clicks`·`service_waitlist` | 텔레메트리 의도적 INSERT-open → **레이트리밋/크기제한**(A6 보안감사와 동일) |
| `authenticated/anon_security_definer_function_executable` | 🟠 WARN | 함수 82/68 | **대부분 RPC 설계상 의도**(내부 `has_role`/`auth.uid()` 게이트). 단 **방어심화로 `admin_*`·민감 함수는 `REVOKE EXECUTE FROM anon, authenticated`** 후 필요한 role만 GRANT |
| `extension_in_public` | 🟠 WARN | `pg_net` | 별도 스키마로 이동(하드닝) |
| `rls_enabled_no_policy` | 🔵 INFO | 14테이블(`*_oauth_states`·`naver_search_cache`·`user_calendar_accounts`·`tutorial_tours` 등) | 대부분 service-role/RPC 전용 = deny-all 안전. **user_calendar_accounts·tutorial_tours**는 사용자 직접 read 필요 시 정책 추가 확인 |

> ⚠️ 위 `admin_*` 함수의 **내부 인가가 진짜 있는지**는 §G 부합성 감사에서 표본 검증.

### A2. 성능 (출시 후 백로그 — 차단 아님)
| lint | 규모 | 메모 |
|---|---|---|
| `auth_rls_initplan` | 235테이블 | RLS의 `auth.*()`를 `(select auth.uid())`로 감싸 InitPlan 1회화 → 대량 행 성능. 광범위 → 단계적. |
| `multiple_permissive_policies` | 152테이블 | 동일 role/action 다중 permissive → OR 통합. |
| `unindexed_foreign_keys` | 39 | FK 커버링 인덱스 추가(JOIN/DELETE). |
| `unused_index` | 73 | 미사용 인덱스 제거(쓰기비용↓). |
| `duplicate_index` | `wedding_consulting_reports` | 중복 인덱스 1개 제거. |
| `no_primary_key` | `_matoni_backup_places` | 백업테이블 — 정리 대상. |

---
## B. P0 정확성/견고성 (코드)
| # | 파일 | 문제 | 영향 | 수정 |
|---|---|---|---|---|
| B1 | `HeartCharge.tsx:79`·`Checkout.tsx:35`·`SubscriptionCheckout.tsx:50`·`invitation/InvitationMarket.tsx:69` | 결제 직전 `sessionStorage.setItem(TID/order)` **try-catch 없음** | 🔴 iOS 프라이빗/용량초과 throw → TID 유실 → **승인 100% 실패** | `safeSessionStorage` 또는 try-catch. iOS 회귀 클래스(safeLocalStorage 교훈) |
| B2 | `Store.tsx:92`·`business/BusinessClaim.tsx:40`·`admin/AdminFeaturedProducts.tsx:81`·`admin/AdminProductCuration.tsx:114` | `.ilike("name", \`%${input}%\`)` **미이스케이프** | 🔴 사용자 `%`/`_` → 와일드카드 오매칭/쿼리깨짐 | `escapeLikePattern`(`src/lib/postgrestEscape`) 적용 |
| B3 | `Auth.tsx:89,94` | `error.errors[0].message` 빈배열 가정 | 🟠 검증 0건 시 크래시 | `errors[0]?.message ?? fallback` |
| B4 | `MyResults.tsx:29`·`VendorCompare.tsx:185`·`SdmPreview.tsx:144-147` | non-null `!` 무가드 | 🟠 데이터 형태 다르면 런타임 크래시 | 옵셔널체이닝/가드 |
| B5 | `BudgetSplitSimulator.tsx:146,225,229` | null 예산 `.toLocaleString()` → "null만원" | 🟡 UX | `?? 0` 가드 |

---
## C. Dead-end UI / placeholder CTA
- ✅ 주요 CTA(문의·예약·결제·공유·투표·컨설팅·주문) 전부 실배선. 과거 회귀('미입점 문의 토스트')는 `PlaceDetailLayout`에서 **연락처 없으면 비활성**으로 수정 확인.
- 🟡 `Premium.tsx:179` 버튼 **"(테스트)" 라벨 잔존** → 제거/검증.
- 🟡 엣지함수(`ai-planner`·`wedding-consulting`) 미배포 시 **무한 스피너** 가능 → 타임아웃/에러 폴백 점검(운영).

## D. iOS / 사파리
- ✅ safe-area(`safe-sticky-header`/`safe-bottom-cta`) 일관 적용, `authErrors.ts`가 "Load failed"/"Failed to fetch" 양쪽 매핑.
- ⚠️ **결제 sessionStorage 무가드**(B1) = iOS 최대 리스크. `<input type=date>` 다수(사파리 UX), HEIC 업로드 처리 흔적 없음(파일 input) → 확인.

## E. 공통화 (DRY drift)
| 단일소스 | 중복 위치 | 조치 |
|---|---|---|
| `priceFormat`(`formatManwon`) | `vendorInfoLines.ts:39`·`FilterBar.tsx:243`·`PlaceDetailLayout.tsx:96`·`QuoteDetail.tsx:13` | import 재사용(특히 PlaceDetailLayout 억 단위 포맷 상이) |
| `relativeTime` | `CommunityPostDetail:379`·`BookmarkedPosts:75`·`CommunitySearchOverlay:234`·`RelatedCommunityPosts:29` | `relativeTime()` 호출로 통일 |
| navigator.share (9곳) | Referral·DressFittingResult·InvitationViewer·InvitationFlow×2·Budget·SdmPreviewResult·MakeupFittingResult·CommunityPostDetail·Events | **`src/lib/shareContent.ts` 추출**(U2 `useShareResult`와 합침) |
| `escapeLikePattern` | B2의 4파일 | 동일 |

## F. 계정삭제 완전성 (법적 — 신규)
- `delete-account/index.ts`는 `auth.admin.deleteUser()`만 호출 → **FK ON DELETE CASCADE에만 의존**.
- 🔴 **스토리지 객체(ai-uploads/community-images 등) 미삭제**(30일 자동삭제로 결국 지워지나 즉시 아님). **CASCADE 미적용 테이블의 PII 잔존 가능**(미검증).
- 조치: 삭제 시 ① 사용자 소유 **storage object 일괄 삭제** ② CASCADE 커버리지 검증(없는 FK는 명시 삭제) ③ (iOS) **SiwA 토큰 revoke**. PIPA·구글/애플 삭제정책 부합.

## G. 의존성 / 공급망
- `npm audit`(prod): **6건** — high 2(`form-data`·`ws`, 다수 전이), moderate 3(`dompurify`·`react-router(-dom)`), low(esbuild).
  - `dompurify`(직접, HTML 살균 — 청첩장/리치텍스트면 XSS 직결) → 우선 업데이트. `react-router-dom` 마이너 업. `form-data`/`ws`는 전이 경로 확인 후 상위 핀.
- Capacitor **6.2.1**(푸시 플러그인 미설치 — 푸시 스코프와 일치). SDK 상향은 `android-target-sdk-upgrade.md`(Cap8/API36) 백로그.

## H. 정책/법적 콘텐츠 단일화 (in-app)
- 🔴 **사업자등록번호·통신판매업신고·주소·전화가 Footer에만**, **약관/방침 누락** → 전상법 기재의무 갭.
- 🟡 이메일 **6파일 하드코딩 + app_config(DB) 이중소스** → 드리프트. 동의타입 상수 훅마다 분산.
- 단일소스 신설: **`src/lib/companyInfo.ts`**(상호·대표·사업자/통신판매번호·주소·전화·이메일·개인정보책임자) · **`consentDefinitions.ts`**(동의 타입/버전) · **`dataRetention.ts`**(보유기간). 약관/방침/Footer/동의훅이 이를 참조. 값 불일치는 법적 리스크라 **우선 교정**.

---
## I. 우선순위 · 실행 배치
- **🔴 P0(출시 전)**: B1 결제 sessionStorage · B2 ilike 이스케이프 · A1 security_definer_view · F 계정삭제(스토리지+CASCADE) · H 사업자정보 약관 기재 · (법무) `260620_codereview.md`의 AI 라벨·RPC 인가.
- **🟠 P1**: A1 function search_path·public 버킷 리스팅·always-true RLS · B3/B4 무가드 · H 단일소스 모듈 · G `dompurify` 등 의존성 · Premium "(테스트)".
- **🟡 P2**: E DRY 통합 · A2 성능(initplan·중복정책·인덱스) · 의존성 전이 핀 · 백업테이블 정리.

### 실행 배치 (전부 적용 예정 — 단계 커밋·검증)
1. **Batch A(코드 P0, 여기서 검증)**: B1·B2·B3·B4·B5 + Premium 라벨.
2. **Batch B(정책 단일화)**: H 모듈 신설 + 약관/방침 사업자정보 기재 + 참조 치환.
3. **Batch C(DB 마이그)**: security_definer_view·function search_path·public 버킷·always-true RLS (브랜치 마이그, main 머지 시 적용).
4. **Batch D(계정삭제)**: storage 일괄삭제 + CASCADE 검증 + SiwA revoke.
5. **Batch E(의존성)**: dompurify·react-router 업, 전이 핀.
6. **Batch F(성능)**: 백로그(initplan·정책통합·인덱스) — 출시 후.
7. **부합성 감사(§다음)**: 코드↔정책 대조(별도).

## J. 검증/적용 상태
- 감사 단계. 적용 시 항목별 커밋해시 기록. DB 변경은 **브랜치 마이그레이션 파일**로만(배포 영향 0, main 머지 시 적용) — 실 DB 직접변경 금지.
