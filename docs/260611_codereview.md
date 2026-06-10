# 260611 코드리뷰 — 로컬(청첩장) · 원격(예산 리포트) 양측 리뷰 후 병합

## TL;DR

- **로컬 미커밋 작업**(청첩장 러브스토리 템플릿 + RSVP + 슬롯 액션, ~2,100줄): P0 2건·P1 5건 발견 → **전부 수정 후 커밋** `73354e0`.
- **원격 `claude/relaxed-wozniak-iigpkx-p3`**(예산 리포트 정산·타임라인·식대방어율, 6커밋): P0 없음, 병합 가능 → 병합 `4133a57`, P1 1건 후속 수정 `77bc95b`.
- **DB 정합성 사고 발견**: `invitation_rsvp` 가 마이그레이션 기록 없이 수동 생성돼 있었고, 실제 정책이 파일보다 취약(타 사용자가 하객 PII 전체 조회 가능)했음 → 멱등 교정 마이그레이션 적용 + RLS 양방향 e2e 검증.
- 최종 검증: vitest **367/367 PASS** · `vite build` PASS · edge function esbuild PASS · 청첩장 관련 신규 tsc 에러 0.

## 보안

| 이슈 | 심각도 | 수정 |
|---|---|---|
| `invitation_rsvp` 실DB 정책: `INSERT WITH CHECK(true)`(draft 포함 아무 청첩장에 삽입 가능), `SELECT ... OR i.status='published'`(**로그인 사용자 누구나 타인 하객 실명·메시지·동행인원 조회 가능**), CHECK 제약 전무 | P0급 (DB) | 멱등 교정 마이그레이션 `20260608210000_invitation_rsvp.sql` 적용: 발행본만 INSERT 허용, 생성자만 SELECT/DELETE, CHECK 4종, 청첩장당 500행 상한 트리거. anon 역할로 draft 차단(42501)·published 허용 양방향 검증(트랜잭션 롤백, 데이터 영향 0) |
| `invitation-illustration` edge fn: `source_paths` 무제한(N장=N회 OpenAI 호출, portrait 는 호출시 무과금), hint/bg_color 무제한 문자열이 프롬프트에 직결 | P1 | `MAX_SOURCE_PATHS=10`, hint 300자 클램프, bg_color hex 정규식 검증, 에러 응답에서 path echo 제거 — `73354e0` |
| 뷰어 계좌 미입력 시 가짜 계좌(`국민은행 123-456-7890`) 폴백 복사 → 하객 오송금 위험 | P1 | 미입력 안내 토스트로 교체 + clipboard 실패 처리 — `InvitationViewer.tsx`, `73354e0` |
| `PdfPreviewModal` 이 pdfGenerator 가 금지한 raw `</style>` breakout 경로로 스타일 재조립 (현재는 상수 CSS 뿐이라 악용 불가, 불변식 회귀) | P1 | 닫힘 시퀀스 `<\/` CSS escape 중화 — `77bc95b` |

## P0 버그 (로컬 청첩장)

1. **`import type Konva` → 런타임 ReferenceError** (`InvitationCanvas.tsx`): 새 애니메이션 코드가 `new Konva.Animation/Tween` 을 값으로 사용하는데 type-only import 라 빌드는 통과하고 공개 뷰어가 사진 슬롯마다 크래시. value import 로 교정. — "정적 통과 ≠ 런타임 안전" 회귀 사례.
2. **발행본 열람만으로 draft 강등 + 공유링크 무효화** (`InvitationStudio.tsx`): hydrate 플래그를 마지막 set* 배치와 같은 동기 블록에서 세워, 로드 직후 autosave effect 가 published→draft 강등. `setTimeout(0)` 으로 effect flush 이후 hydrate 표시. 강등 분기의 `return` 도 제거해 강등을 유발한 편집이 같은 사이클에 저장되게 함.

## 도메인 변경 요약

- **로컬** `73354e0`: 러브스토리 모바일 템플릿(시드+에셋), RSVP 폼/제출, 슬롯 액션(전화·복사·링크·지도), 하트비트/스프링 등장 애니메이션, 약도·인물 일러스트 프롬프트 고도화, Android versionCode 4 (2.0.1) + AdMob + AGP 8.13.2.
- **원격 병합** `4133a57`: `budgetReportModel.ts`(순수 계산, 테스트 16종) — 납부완료/미납 분리 정산, 결제 타임라인+상태배지, 식대 방어율, 다크 헤더 띠(opt-in), PDF 미리보기 `<style>` 보존 수정.

## 적용 마이그레이션

| 버전 | 이름 | 내용 |
|---|---|---|
| 20260611 (MCP 적용) | `invitation_rsvp` | repo 파일 `20260608210000_invitation_rsvp.sql` 과 동일 내용(멱등) — 테이블 IF NOT EXISTS, CHECK 4종, RLS 정책 3종 교체, 500행 상한 트리거 |

## 남은 작업 (deferred)

- **P2 (예산 리포트)**: 연체(음수 D-day)가 "임박"으로 표기되고 30일 합계에서 제외되는 비일관 — `overdue` 상태 추가 검토; "당일 현금" 라벨이 실제로는 전 기간 현금성 잔금 합계; `pendingOf`/`daysFromToday` 컴포넌트 내 중복 → export 로 단일화; `usagePct` 가 미납 약정액 미반영.
- **P2 (청첩장)**: `resolveSlotAction`/`mergeSlotAction` Studio·Viewer 중복 → `src/lib/invitation/` 단일화; 슬롯 id 문자열 휴리스틱(`includes("heart")` 등) → 명시적 `anim`/`frame` 플래그; 러브스토리 시드 `canvas.h: 7100` ≠ 페이지 합 7500 재측정; 발행본 편집 시 "공유 링크가 잠시 비활성화돼요" 확인 다이얼로그(현재는 즉시 조용히 강등); 신규 순수 함수(`buildMapPrompt` 등) 단위 테스트 0건.
- **인프라**: RSVP 익명 INSERT 의 IP 단위 레이트리밋(현재 행 수 상한만) — edge function 경유 검토; Supabase 생성 타입 재생성(`invitation_rsvp` 등 다수 테이블 드리프트, 현재는 `as any` 관례로 우회); tsc 사전 존재 에러 48줄 별도 정리.
- **검증 한계**: 뷰어/스튜디오 브라우저 e2e 는 미실행(코드+tsc 추론) — 실기기에서 발행→`/i/:slug` 열람 1회 확인 권장.
