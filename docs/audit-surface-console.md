# Console(운영자) 도메인 정밀감사 — 앱 분리 후 영역별 감사맵 (260625)

> 앱 분리 Phase 1(console→`src/features/console/`) 직후, **분리된 console 도메인만** 14차원(AGENTS.md)으로
> 정밀감사. surface별 병렬 fan-out(4클러스터: 권한·유저 / 모더레이션·CS / 업체·커머스 / AI·콘텐츠에셋) +
> 실코드/**실DB(pg_policies·pg_proc) 교차확인**. 단일 소스: 전체 맵=`docs/audit-surface-map.md`, partners=`audit-surface-partners.md`.

## TL;DR
- 🟢 **권한상승(privilege escalation) 없음 — 실DB 검증.** partners P0(`business_profiles` self-UPDATE)의
  운영자측 짝은 **안전**: `user_roles` write RLS 정책 **0건**(자기 역할 admin 승격 불가), admin 쓰기는 전부
  `has_role(auth.uid(),'admin')` 게이트 SECURITY DEFINER RPC 또는 admin RLS 경유. 클라 `AdminGuard`는 UX용.
- 🔴 **P0 = 새 유형 "조용한 무동작(dead-end)" 3건** — admin UPDATE RLS 정책 부재로 admin 액션이 0행
  매칭 → 에러 없이 성공 toast만 뜨고 실제 미반영(partners P0와 달리 보안 구멍 아니라 **기능 결함**):
  1. **AdminContentReview** 이벤트/쿠폰 승인·반려 → 이벤트는 **이번에 RPC로 수정**, 쿠폰은 백엔드 부재로 이관.
  2. **AdminServiceWaitlist** 처리완료 토글 → `service_waitlist` UPDATE 정책 0(실DB 확인). **DB 마이그 필요(이관)**.
  3. **AdminWeddingPhotoRefs** → 영구 `ComingSoonAdminPage` placeholder가 메뉴에 노출(dead-end).
- 🟠 P1: 운영자 화면 대량 PII(이메일) 노출 · iOS 긴 편집폼 draft 부재 · Storage orphan 잔존 · LLM 프롬프트
  비용 상한 부재 · AIJobs 재시도/취소 개입 UI 부재 · `admin_review_event` 시그니처 드리프트(repo 2-arg↔live 3-arg).
- 🟢 양호: 신고삭제·문의답변·공지·에이전트·프롬프트·에셋·업체승인·등급부여·클레임승인 전부 서버 인가 강제 +
  RPC 인자 PGRST202 전수 일치(클러스터 3 실DB 대조) + dead-end 거의 없음(위 3건 제외).

## 실DB 검증 결과 (pg_policies / pg_proc, 260625)
| 확인 항목 | 결과 |
|---|---|
| `user_roles` write(INSERT/UPDATE/DELETE/ALL) 정책 수 | **0** → 권한상승 차단 ✅ |
| admin RPC SECURITY DEFINER+시그니처 (`admin_set_member_tier/affiliation`, `admin_review_business/event/listing/place_claim/partnership`, `admin_set_business_tier`, `has_role`) | 전부 존재·SECURITY DEFINER·클라 호출 인자와 일치 ✅ |
| `business_events` admin UPDATE 정책 | **0** → AdminContentReview 이벤트 직접 update 무동작(→RPC 수정) |
| `business_coupons` admin UPDATE 정책 / `admin_review_coupon` RPC | **0 / 없음** → 쿠폰 검토 구조적 불능(이관) |
| `service_waitlist` UPDATE 정책 | **0** → 처리완료 토글 무동작(DB 마이그 이관) |

## 커버리지 (console surface × 14차원)
✅=점검·이상없음 / ⚠️=발견(아래) / 클러스터별 31페이지 전수.

| 클러스터 | surface | 주요 발견 |
|---|---|---|
| 1 권한·유저 | AdminGuard·AdminDashboard·AdminGroupDashboard·AdminUsers | 권한상승 없음(✅) · 이메일 대량 PII(P1) · 대시보드 heart_transactions 전량 SELECT(P2) |
| 2 모더레이션·CS | AdminReports·AdminInquiries·AdminContentReview·AdminCommunityAnnouncements·AdminErrorLogs·AdminAgentOutputs | **AdminContentReview P0(→이벤트 수정)** · 신고삭제·문의·공지·에이전트 인가 양호 · user_id 평문(P2) · raw window.confirm 2곳(P2) · 페이지네이션 부재(P2) · 24h SLA 가시성(P2) |
| 3 업체·커머스 | AdminBusinessReview·AdminPlaceClaims·AdminPlaces·AdminPlaceEdit·AdminProductCuration·AdminFeaturedProducts·AdminPromotions·AdminServiceWaitlist | 승인/등급/클레임 RPC 인가 양호(✅, 실DB 대조) · **AdminServiceWaitlist P0(DB 이관)** · 승인 race 가드 부재(P2) |
| 4 AI·콘텐츠에셋 | AdminAIPrompts·AdminAiPromptEditor·AdminAIJobs·AdminInvitation{Templates,Assets,Fonts}·AdminWeddingPhotoRefs·Admin{Dress,Makeup,Hair}Samples·AdminTipInstagrams·AdminInstagramPosts(+Edit) | **AdminWeddingPhotoRefs P0(placeholder)** · 프롬프트 비용 상한 부재(P1) · AIJobs 개입 UI 부재(P1) · 편집폼 iOS draft 부재(P1) · Storage orphan(P1) · @font-face 부분살균(P2) |

## P0 상세
1. **AdminContentReview 이벤트/쿠폰 검토 — 조용한 무동작** (`AdminContentReview.tsx`).
   - 이벤트/쿠폰 승인·반려가 `.from(table).update({moderation_status})` 직접 수행하나, 두 테이블 모두
     admin UPDATE RLS 정책 0(실DB 확인) → 운영자(=비소유자) update 가 0행 매칭, 에러 없이 성공 toast만.
   - **이벤트 = 이번 수정**: `admin_review_event(p_id,p_approved,p_note)` RPC(검증된 경로, AdminBusinessReview 동일 사용)로 전환.
   - **쿠폰 = 이관**: `admin_review_coupon` RPC·admin RLS 모두 없음(원설계 "쿠폰 검토 면제, 즉시 노출" ↔
     이후 moderation 컬럼 드리프트 + UI 추가로 충돌). 결정 필요 — ① 면제 유지면 쿠폰 탭 제거 ② 도입이면
     `admin_review_coupon` RPC + admin UPDATE 정책 추가.
2. **AdminServiceWaitlist 처리완료 토글 — 조용한 무동작** (`AdminServiceWaitlist.tsx:68-93`).
   - `notified=true` 직접 update, `service_waitlist` UPDATE 정책 0(실DB) → 무동작. **DB 마이그 필요**:
     `CREATE POLICY ... FOR UPDATE TO authenticated USING/​WITH CHECK (has_role(auth.uid(),'admin'))`.
   - **추가 드리프트**: INSERT 하드닝 마이그(`20260605170000`, `user_id IS NULL OR user_id=auth.uid()`)가
     **실DB 미적용** → 타인 user_id 스푸핑 표면이 라이브에 잔존. 재적용 필요.
3. **AdminWeddingPhotoRefs — 영구 placeholder dead-end** (`ComingSoonAdminPage`).
   - 라우트·메뉴 노출되나 기능 0("v2 이후"). 같은 학습레퍼런스 묶음의 드레스/헤어/메이크업은 실CRUD인데
     촬영만 미구현. 메뉴 숨김 또는 "준비 중" 배지 명시 필요.

## P1 상세(요약)
- **개인정보**: AdminUsers 가 이메일·닉네임·하트 200명 평문 표시(admin RLS 보호되나 화면 캡처/로그 시 대량
  PII 노출면) → 마스킹 옵션. 에러 toast 에 PostgREST 메시지 노출 → 제네릭+서버로그 분리.
- **iOS(§7)**: AdminAiPromptEditor(수천자 프롬프트)·AdminInstagramPostEdit(2200자 캡션) 긴 편집폼에 draft
  자동저장 없음 → 탭 폐기 시 유실. `useTextDraft`/`formDraft` 적용 권장.
- **데이터 생명주기(§13)**: ImageUploader 즉시 업로드 + 폼 취소/교체/row삭제 시 Storage 객체 미삭제 →
  전 에셋 페이지 orphan 잔존(공개 버킷). 저장 안 된 업로드 GC + 삭제 시 객체 동반 삭제.
- **비용(§11)**: `ai_prompts.content` 가 그대로 LLM system prompt 투입 — 길이 상한·경고 없음(비용 직결).
  AdminAIJobs 는 읽기전용 모니터링뿐 — 재시도/취소/강제환불 개입 UI 부재(reaper 서버 의존).
- **드리프트**: `admin_review_event` repo 마이그 2-arg ↔ live 3-arg(p_note). repo 마이그 역추가 권장
  (신규 환경 재현 시 PGRST202 위험).

## P2(요약)
raw `window.confirm` 2곳(AdminReports·AdminAnnouncements → 공용 confirm-dialog 통일) · 페이지네이션 부재
(agent_outputs 200cap·error_logs 1000cap·inquiries·reports·service_waitlist 무제한) · 24h UGC SLA 경과
배지·정렬 부재 · @font-face family/url 부분살균 · datetime-local KST 표기 · 승인 RPC 상태머신 가드 부재
(멱등이라 손상은 없음) · 강등 시 placeholder 사업자번호 잔존.

## 이번 라운드 적용 수정
- **P0-1 이벤트 검토**: `AdminContentReview.tsx` 의 이벤트 승인/반려를 `admin_review_event` RPC 로 전환
  (직접 update → 무동작 dead-end 제거). 쿠폰은 백엔드 부재로 코드 주석에 이관 명시.

## Deferred (다음 라운드 — 우선순위순)
1. **P0-2 service_waitlist** admin UPDATE 정책 추가 + INSERT 하드닝 재적용 — **프로덕션 DB 변경(사용자 확인 후)**.
2. **P0-1 쿠폰** 검토 백엔드 결정(면제 유지=탭 제거 / 도입=RPC+정책) · **P0-3 AdminWeddingPhotoRefs** 메뉴 숨김.
3. P1: 이메일 마스킹 · 긴 편집폼 iOS draft · Storage orphan GC · 프롬프트 길이 상한 · AIJobs 개입 UI ·
   `admin_review_event` repo 마이그 역추가.
4. P2 모음 · 클러스터 4 미확인 RLS 실DB 교차확인(`tip_instagrams`·`hair/makeup_samples` write 정책,
   `admin_ai_job_stats`/`admin_list_ai_failures` RPC admin 게이트).

## 검증 한계
- 인가·핵심 정책은 실DB(`pg_policies`/`pg_proc`)로 확정. 일부 보조 테이블 RLS(클러스터4 표)는 다음 라운드 이월.
- admin JWT e2e(실제 승인→row 반영, service_waitlist 토글)는 sandbox 에서 admin 세션 시뮬 불가 → 실기 확인 요청.
