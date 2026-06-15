# 260615 코드리뷰 (#3) — 내 업체 보드 + 업체 비교 + 발표자료/ML 실습

> 같은 날 세 번째 감사(`_3`). 대상: 브랜치 `claude/app-state-update-issue-ptcbkm`
> 의 vendor board·compare 피처 + RAG/딥러닝 발표 산출물.

## TL;DR

- **P0 없음, 인가(RLS) 구멍 없음, DB 스키마 정합 OK(라이브 DB 직접 확인), dead-end UI 없음, DRY 양호.**
- **P1 — false-success 보고**: `vendor_board_items` 쓰기(`saveSlot`/`removeSlot`/`addCustomSlot`/`markBooked`)가 DB 에러를 삼키고 성공 토스트("저장했어요")를 무조건 띄움 → **수정 완료**(에러를 `{ok}`로 호출부까지 전달 + 실패 토스트 + `console.error` 로깅).
- 발표자료(RAG·딥러닝)·ML 실습은 앱 무영향(`docs/`·`ml/` 격리). 빌드/린트/타입(touched) 통과.

## 보안 · 인가

- **인가 CLEAN**: `supabase/migrations/20260615120000_vendor_board_items.sql` — RLS 활성 + select/insert/update/delete **4정책 모두 `auth.uid() = user_id`**(insert/update 는 `with check`). 타 사용자 행 접근 경로 없음. 클라 쿼리도 `.eq("user_id", user.id)` 이중 방어.
- **라이브 DB 검증**(Supabase MCP): 테이블 실재, 컬럼 10개(`custom_label` 포함) 코드와 일치, `rls_enabled=true`, 정책 4개, `set_updated_at` 함수 존재 → 트리거 유효. 마이그레이션 파일 존재 ≠ DB 적용 회귀 차단(검증 규칙 준수).
- 문자열 병합 SQL 없음, 시크릿 하드코딩 없음.

## P0 버그

- 없음.

## P1 — false-success (수정 완료)

대상: `src/hooks/useVendorBoard.ts` · `src/pages/VendorBoard.tsx` · `src/components/place/AddToBoardButton.tsx`

| 위치 | 문제 | 조치 |
|---|---|---|
| `useVendorBoard.saveSlot`(upsert/delete 분기) | error 무시·삼킴, 실패해도 로컬 state·성공 반환 | 실패 시 `console.error`+`{ok:false}`, **성공일 때만** 낙관적 state 반영 |
| `useVendorBoard.removeSlot` | 반환 void·error 무시, 실패해도 행 제거 | `{ok}` 반환, 실패 시 state 미변경 |
| `useVendorBoard.addCustomSlot` | error 삼킴 | `console.error`+`{ok:false}` |
| `markBoardSlotQuoting/Booked` | best-effort 인데 완전 무로그 | `console.warn` 로깅(Booked 는 `{ok}` 반환해 명시 CTA 가 결과 반영) |
| `VendorBoard.SlotCard.saveDetails/setStatus` | 결과 무시·항상 "저장했어요" | `res.ok` 검사 → 실패 시 에러 토스트 |
| `AddToBoardButton.record` | 실패해도 `chosen=true`+성공 토스트 | `res.ok` 검사 → 실패 시 에러 토스트·`chosen` 미설정 |

## Dead-end UI

- **CLEAN**. 모든 인터랙티브 컨트롤이 실제 동작 수행(상태저장·견적route·둘러보기·비교·결정·삭제). 토스트만 띄우는 placeholder/no-op onClick 없음. 택소노미가 공급 없는 슬롯엔 죽은 버튼을 두지 않도록 설계(`src/lib/vendorBoard.ts` L6-7). `VendorCompare.tsx:123` "결정 기록 미지원"은 `onDecide` 미주입 시의 정직한 안내(죽은 버튼 아님).

## 공통화(DRY)

- **양호**. `useCompareItems` 가 `usePlaceDetail` 의 `PLACE_DETAIL_SELECT`+`mapPlaceDetailRow` 재사용(드리프트 방지), 카테고리 라벨·item 매핑도 단일 소스. 중복 매핑/포맷 없음.

## 도메인/스키마 변경

- 신규 테이블 `vendor_board_items`(+`custom_label` 컬럼) — 위 보안 섹션대로 적용·검증됨.
- 신규 라우트 `/board`, `/compare`(`src/App.tsx`).

## 규칙/문서 · 검증 인프라 (이번 산출물)

- 발표자료/대본/PDF: `docs/260615_rag_grounding_presentation.md`(+`_script.md`), `docs/slides_pdf/RAG_grounding.pdf`, `ml/tip-classifier/presentation.*`.
- 딥러닝 실습: `ml/tip-classifier/` — 실데이터 1,242건 학습 결과 `results/`(MLP micro-F1 0.76 > LogReg 0.72), 적용 전/후(2.04→1.63 태그) 정량 비교 포함.

## 검증

- `npm run build` ✓ · 린트/타입(touched 파일) clean ✓ · 라이브 DB 스키마/RLS 직접 확인 ✓.
- 한계: vendor board 의 클라 e2e(실제 로그인→보드 저장→재조회)는 sandbox 에서 미실행 — RLS·빌드·타입 레벨까지 확인. 실환경 클릭 확인 권장.

## 남은 작업 (deferred)

- `SlotCard` 인세션 외부 업데이트 시 입력필드 재동기화(P2, `markBoardSlotQuoting` 등 호출 후) — `item` 변화에 `useEffect` resync.
- `saveSlot` read-modify-write 동시성(P2, 단일 사용자·`saving` 비활성으로 실질 위험 낮음).
- 딥러닝: 사람 손라벨 gold 200건으로 "모델 vs 규칙" 엄밀 비교 + KLUE-RoBERTa 파인튜닝(노트북 준비됨).
