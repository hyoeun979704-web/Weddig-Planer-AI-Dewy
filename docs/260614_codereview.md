# 260614 정식출시 전체감사 (코드리뷰)

> 범위: 정식출시 직전 전면 감사. 4개 도메인을 병렬 서브에이전트로 **현재 코드 기준** 적대적
> 분석 — ① 이번 PR 디프(안전영역·반응형·iOS) 회귀 ② 보안(시크릿·RLS·엣지펑션·SQLi·XSS·
> CORS) ③ 출시 준비도(스토어 거부 리스크·디버그 잔재·접근성·메타) ④ 결제/인증 핵심경로 —
> + 직접 검증(빌드·린트·테스트·tsc·DB list_tables·versionCode). 직전 리뷰: `260613_codereview_2.md`.

## TL;DR

- **출시 블로커는 단 1건 — Android `versionCode`** 가 이미 릴리스된 5(2.0.2) 그대로였다(이번 PR 에
  변경 누적). 안 올리면 Play 가 중복으로 거부. → **6 / 2.0.3 으로 bump 완료**.
- **보안 BLOCKER 0** — 서비스롤/시크릿 키 미커밋(클라의 anon 키는 설계상 공개=안전), public 110+
  테이블 전부 RLS, 결제 가격 서버권위(IDOR 없음), SQL 전부 파라미터화, SSR 전값 escape, CORS 안전.
- **결제/인증 안전** — 승인 멱등성은 서버(UNIQUE 인덱스)로 실재, 포인트/하트 grant·spend 는
  SECURITY DEFINER + `auth.uid()` 가드로 위조 불가. Apple 로그인 이미 존재. Android 출시 블로커 없음.
- **이번 PR 데스크톱 반응형 회귀(내가 유발) 수정 완료** — `fixed` 하단 바들이 사이드바와 어긋나던
  것을 CSS 한 줄(`.fixed.app-col`)로 전역 정렬. 모바일/네이티브는 처음부터 불영향.
- **즉시 수정한 출시 위생 5건**(이번 커밋): OAuth 코드 로깅 제거 · `alert()`→toast · 커뮤니티 검색
  `.or()` 인젝션 · 외부 URL `safeUrl()` 가드 · LoginOverlay 안전영역/데스크톱 정렬.
- **출시 전 처리 권장(미적용)**: 엣지펑션 `migrate-data` 재게이트/제거 · 어드민 href `safeUrl` 확대 ·
  `community_author_cards` 뷰 security_invoker · `tsc` 타입에러 ~15건 · 결제 e2e 리플레이 테스트.

---

## 0. 즉시 수정 (이번 커밋 — 출시본 반영)

| # | 항목 | 위치 | 처리 |
|---|---|---|---|
| 1 | **versionCode 미증가**(Play 거부) | `android/app/build.gradle:18` | 5→**6**, versionName 2.0.2→**2.0.3**, package.json 정렬 |
| 2 | OAuth 콜백 URL·code 콘솔 로깅(민감정보) | `src/lib/native/deepLink.ts:33,41,43` | 로그 3줄 제거(에러 로깅만 유지) |
| 3 | `.or()` PostgREST 필터 인젝션(사용자 직접) | `CommunitySearchOverlay.tsx:171` | `quoteForOr(escapeLikePattern())` 적용 |
| 4 | 외부 URL `javascript:` 스토어드 XSS | `ProductDetail.tsx:117` | `src/lib/safeUrl.ts` 신설 + 적용(http(s)만 허용) |
| 5 | `alert()` 모달(UX·async 블로킹) | `CoupleDiaryWrite.tsx:33` | `toast.info()` 로 교체 |
| 6 | 데스크톱 fixed 바 사이드바 어긋남 | `index.css`(`.fixed.app-col`) | 전역 좌측 오프셋 1줄 — 결제·구매·AI입력 바 일괄 정렬 |
| 7 | LoginOverlay 하드코딩 56/64 + 데스크톱 미정렬 | `LoginRequiredOverlay.tsx:23` | 안전영역 토큰 + `lg:left` 적용 |
| 8 | 데스크톱 사이드바 짧은 창 오버플로 | `BottomNav.tsx` | `lg:flex-col`+`lg:overflow-y-auto` |

## 1. 보안 (BLOCKER 0)

**안전 확인(놀라지 말 것)**: 클라 번들의 하드코딩 JWT(`client.ts:13`·`api/ssr.ts:13`)는 **anon 키**(role=anon)로
설계상 공개값. 데이터는 RLS 가 보호. 서비스롤/시크릿/키스토어/`.env`·`google-services.json` **미커밋**.

| 심각도 | 항목 | 위치 | 조치 |
|---|---|---|---|
| HIGH | `migrate-data` 가 service-role 키를 bearer 로 raw 비교(구 안티패턴) + 임의 외부데이터 upsert + raw error 노출 | `supabase/functions/migrate-data/index.ts:34,69,96` | `jwtRole==="service_role"` 게이트 or **출시 전 제거** |
| HIGH | 어드민/벤더 DB URL 필드 href·window.open 무검증(`javascript:`) | VendorDetailPage:682,797,844 · AdminFeaturedProducts:275 · AdminProductCuration:823 · InfluencerDetail:121 | `safeUrl()`(0번에서 신설) 확대 적용 |
| ERROR(advisor) | SECURITY DEFINER 뷰 `community_author_cards` 가 viewer RLS 우회 | DB 뷰 | 컬럼 제한 + `security_invoker=on` 재생성 |
| MED | `charge-approve` 에서 포인트 50% 상한 재검증 누락(ready 에서만) | `kakao-pay-charge-approve` | approve 에서 상한 재적용 |
| MED | raw `error.message` 클라 노출 | delete-account:41 · product-search:240 | 제네릭 메시지 |
| MED | 공개 스토리지 버킷 8개 list 허용(타인 업로드 열람) | storage 정책 | 경로 스코프 |
| MED | `delete-account` 스텝업 재인증 없음(토큰 탈취 시 영구삭제) | delete-account:26 | 재인증 검토 |

> 결제 IDOR 없음: 모든 `kakao-pay-*` approve 가 JWT `sub` 에서 userId 도출 + `partnerUserId!==userId→403`.
> CORS `*` 는 Allow-Credentials 미설정 + 결제 origin 은 `allowedOrigins` exact-match 라 안전.

## 2. 결제/인증 핵심경로 (Android 출시 블로커 0)

- **멱등성 서버 실재**: `payments_payment_key_uniq` UNIQUE + approve 함수들의 사전조회/UNIQUE 폴백.
  클라 success 페이지의 effect 재실행(가드 없음)은 서버 멱등이라 **이중결제 없음**(선택: `useRef` 가드).
- **세션 `JSON.parse` 무가드(LOW)**: `PaymentSuccess:31`·`HeartChargeSuccess:30`·**`SubscriptionPaymentSuccess:33`**
  (직전 리뷰가 놓친 3번째). 손상 세션 시 무한 스피너 — 외부 공격 경로 없음. try/catch→error 권장.
- **economy 잠금 강력**: `points_economy_lockdown` 가 earn/spend 를 anon/authenticated 에서 REVOKE,
  `spend_hearts` 는 `p_user_id<>auth.uid()` 예외. 직접 RPC 로 자기 지급 불가.
- **Apple 로그인 존재**(`AuthContext:204`) · 딥링크 web/native 분기 정상 · 콜드스타트 로그아웃 레이스 없음.
- **검증 한계**: DB 안전장치는 **마이그레이션 파일 기준**(적용 ≠ 파일). 출시 전 prod 에서
  `payments_payment_key_uniq` 인덱스 + economy REVOKE/grant **실제 적용 확인 권장**(미적용 시 위 2건 BLOCKER 로 승격).

## 3. 출시 준비도

- **양호**: ErrorBoundary·404·오프라인 SW 존재. manifest 아이콘(192/512+maskable)·favicon·apple-touch·og 메타 OK.
  소스맵 미배포. `.gitignore` 적절. UTF-8 한글 정상.
- **확인 필요(스토어)**: 계정삭제 안내 이메일 `kheceo@dewy-wedding.com`(`AccountDeletion.tsx:60`)이 **모니터링되는
  업무 메일인지**(Play 가 이 메일로 삭제 컴플라이언스 확인). 네이티브 매니페스트/Info.plist 의 **권한 사용 사유 문구**.
- **잔재**: OG 전용 이미지 TODO(`index.html:40`) · `Beta.tsx:10` TODO · `sensitiveConsent.ts:8` `as any`(타입 재생성 후 제거).
- **번들**: 최대 청크 vendor-pdf 391KB(gzip 129KB, PDF export 전용·기대치) · index 92KB gzip(합리적).

## 4. 데스크톱 반응형 회귀 (이번 PR — 0번에서 수정)

- 원인: `#root{padding-left}`(데스크톱 사이드바 자리)는 인플로우만 미는데, `position:fixed` 바는
  viewport 기준이라 패딩을 못 받아 사이드바와 어긋남. **결제/구매/AI입력 바 ~18곳**이 동일 패턴
  (`fixed … left-0 right-0 app-col mx-auto`)이라 **`.fixed.app-col{left:var(--app-sidebar-width)}` 한 줄로 전역 정렬**.
- 확인 완료(정상): StatusBar `Style.Light`(핑크 배경 어두운 아이콘) · 플랫폼 클래스 동기 타이밍 ·
  `app-col` 모바일 byte 동등 · iOS `env()` overlay 비중복 · MainActivity WindowInsets.
- 여전히 **데스크톱 e2e(브라우저) 미확인** — 사이드바 정렬·칼럼·모달은 실브라우저 확인 필요(샌드박스 한계).

## 5. 타입 안전 (tsc)

`vite build`(SWC)는 타입 미검사라 빌드가 통과해도 타입은 깨질 수 있다. `npx tsc --noEmit` 결과
**~15개 타입 에러**(예: `BudgetAddSheet`의 `updated_at` 누락, `ValueTagChipRow`의 `valueTags`/`toggleValueTag`,
`Auth.tsx:142` Record 타입, `Budget.tsx:220` 비교 무overlap, `quickQuestionHandlers` export 누락 등) +
`scripts/**` 다수. 런타임 영향 낮은 것 위주이나 **CI 에 `tsc --noEmit` 게이트 추가** 권장(드리프트 차단).

---

## 적용 마이그레이션

| 항목 | 파일 | 커밋/PR |
|---|---|---|
| §0 즉시 수정 8건 | build.gradle·package.json·deepLink·CommunitySearchOverlay·ProductDetail·safeUrl·CoupleDiaryWrite·index.css·LoginRequiredOverlay·BottomNav | PR #289 (이 커밋) |
| §1 보안 HIGH/ERROR | migrate-data·어드민 href·community_author_cards 뷰 | 미적용(권장) |
| §2 JSON.parse 가드 | PaymentSuccess·HeartChargeSuccess·SubscriptionPaymentSuccess | 미적용(LOW) |
| §5 tsc 타입에러 | (다수) | 미적용 |

## 남은 작업 / 검증 한계 (deferred)

- **prod DB 적용 확인(gating)**: `payments_payment_key_uniq` 인덱스 + economy REVOKE/grant 가
  실제 적용됐는지. 미적용이면 결제 멱등·지급위조 방지가 무력 → 그 경우 BLOCKER.
- **출시 전 권장**: ① migrate-data 재게이트/제거 ② 어드민 href `safeUrl` 확대 ③ author_cards 뷰
  security_invoker ④ 결제 success `JSON.parse` try/catch ⑤ `tsc --noEmit` CI 게이트.
- **e2e 미확인**: 데스크톱 브라우저 렌더 · Android APK 상태바 · (Mac 후)iOS · 결제 라이브 리플레이.
  본 감사는 정적 코드 + DB 스키마 레벨 — 실환경 확인은 사용자/실기기 필요.
- **스토어 제출 확인**: 계정삭제 이메일 모니터링 · 권한 사용 사유 문구 · OG 1200x630 이미지.
