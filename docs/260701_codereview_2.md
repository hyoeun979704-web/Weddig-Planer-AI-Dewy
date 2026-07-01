# 260701 코드리뷰 (2) — 안전 1차 기능 5종 감사 (A4·B4·B3·B5·B2)

> 범위: 이 세션이 #518 머지 이후 쌓은 diff(`git diff 29e6616...HEAD`, ~534줄/13파일 — 신규 4기능
> +A4 문서). **레포 전 surface 전체감사가 아니라 이 diff 대상 14차원 정밀 감사**(주간 전체감사 별도).
> 방법: 구현 중 재사용 분석(서브에이전트 4) + 적대적 리뷰 서브에이전트 + 직접 자기검증(라우트·컬럼·
> 읽기전용·용량수학). 사용자 요청 "모두 진행하고 감사하자"의 감사 산출물.

## TL;DR
- **P0 0 · P1 0 · P2 소수(이월).** 신규 코드는 전부 **읽기/prefill/순수계산** — 신규 DB 쓰기 0,
  신규 RLS 표면 0(보안 회귀 없음). 결제/송금/거래 코드 신설 0(법적 안전 1차 원칙 준수).
- 4기능 모두 **빈 신호 폴백**으로 dead-end 방지(혜택 0·하객 0·미입점·persona 없음 → 우아하게 숨김/안내).
- 빌드·lint 0error·**테스트 1283 통과**(신규 19 케이스: mealBudgetOver 3·expo 1·seatingDraft 8 등)·
  integrity 0error·소비자+partners 양빌드 녹색.

## 이번 세션 산출물(기능)
| 기능 | 내용 | 커밋 |
|---|---|---|
| B4 예약문의 | 가능일 칩→그 날짜로 예약 문의(기존 place_inquiries 재사용, 결제 없음) | 57556c7 |
| B5 박람회 | 홈 페르소나 매칭 혜택 행 + 일정 조건부 "박람회 관람"(불필요 페르소나 스킵) | bc65298 |
| B2 좌석배치 | 관계 기반 자동 배치 초안 미리보기(순수계산+빈데이터 폴백, 저장·드래그 이월) | 8225fef |
| A4 마케팅 | 콘솔 marketing 모듈 감사 등재(blog-posts 사각지대 해소+파이프라인 명시) | 9e828d5 |
| B3 계좌안내 | **이미 구현됨**(AccountSection·account_groom/bride·복사) — 신규 작업 없음(확인만) | — |

## 영역별 (14차원)

### 1. 보안·인가·DB (✅ 무결)
- 신규 컴포넌트(HomeExpoDealsRow·SeatingDraftPreview·HallAvailabilityCard) `insert/update/upsert/delete` **0건**
  (grep 확인) — 전부 읽기. 신규 마이그레이션·RPC·RLS 표면 0. 권한상승 경로 신설 없음.
- B4 문의 전송은 **기존** `PlaceInquirySheet`(RLS: 본인·입점업체 INSERT)를 그대로 씀 — 날짜 prefill만 추가.

### 2. 정확성·견고성 (✅)
- `computeSeatingDraft`: 참석 확정만·`attending_count` 용량 반영·같은 그룹 인접·테이블 상한 초과분
  `unseatedHeads` 집계·단일 대인원 빈 테이블 보장. `totalHeads=seatedHeads+unseatedHeads` 불변(테스트 8).
  상한 도달 후에도 **작은 후속 하객은 남은 좌석에 계속 배치**(continue 는 새 테이블 필요분만 스킵).
- prefill 우선순위: draft(작성중) > suggestedDate(가능일 칩) > 예식월. 일반 문의는 `setInquiryDate(undefined)`
  로 날짜 누수 차단. Drawer 오버레이로 열린 중 칩 재선택 불가 → mid-open 변경 없음.

### 3. dead-end UI (✅ — 빈 신호 폴백 철저)
- HallAvailabilityCard: `onPickDate` 는 **입점(claimed) 홀에만** 전달 → 미입점은 칩이 정적(누를 것처럼
  안 보임). HomeExpoDealsRow: 혜택 0 → 행 숨김, 카드/헤더 → 실재 라우트 `/events`. SeatingDraftPreview:
  명단 0 → 렌더 안 함, 참석 0 → 안내만. "곧 지원" 류 죽은 문구 없음.

### 4. 테스트 (✅) — 신규 19케이스, 전체 1283 통과.

### 5~6. 유지보수·아키텍처 (✅)
- 단일 소스 재사용: usePartnerDeals·PERSONA_REC_CATEGORIES·place_inquiries·place_wedding_halls.
  `WEDDING_EXPO_TASK` 상수로 schedule↔personaPlanProfile 문자열 드리프트 차단(정확일치 remove 안전).
  도메인 경계 준수(feature 간 직접 import 없음, 공유는 packages/@ 경유).

### 7. iOS/사파리(웹) (✅) — 신규 raw localStorage 접근 0. 터치타깃: 칩 36px·헤더 36px(≥권장). 이미지 lazy.

### 12. 접근성 (✅) — 칩 aria-label(예약 문의), 섹션 aria-label, 카드 aria-label. 이미지 alt="".

### 14. 초개인화 (✅ 강화)
- B5a 홈 행: persona rec 카테고리+featured/제휴 정렬(깊이 ③→④). B5b 일정: 페르소나 조건부 노출/스킵(깊이 ④).
  B4: 예식월·지역 prefill 위에 특정 가능일 prefill(깊이 ④). B2: 관계 신호로 자동 초안(깊이 ③).

### 10. 법적/전자상거래 (✅ 안전 1차 원칙)
- 축의금=**계좌 안내만**(송금 대행/에스크로 0 → 전자금융 라이선스 불요). 예약=**문의만**(결제 0).
  박람회=**기존 혜택 큐레이션+진입점**(신규 거래 0). 실제 결제/송금/상담운영은 법적·운영 검토 후 이월.

## 남은 작업 (deferred)
- **B2 저장·드래그 편집**: `seating_assignments` 테이블+Konva 드래그 — 하객·홀 구조 데이터 축적 후
  (지금 미리보기는 순수계산·비저장). 라이브 마이그 필요라 브랜치에서 e2e 불가 → 데이터 생기면 착수.
- **B3 계좌 안내**: 이미 구현 — 추가 요구 시 슬롯 기본 노출 강화 정도.
- **B5 실상담/거래·B4 실시간 예약 거래·B3 실송금**: 결제·법규·운영 의존 → 합의·검토 후(3-A/3-B/3-C heavy).
- **A4 인앱 6채널 파이프라인 UI**: 기존 marketing-draft 스킬(→Notion)과 중복이라 대규모 신규 빌드로 이월.
- **검증 한계**: partner_deals/business_events·claimed 홀·하객명단 실데이터가 ~0이라 화면 e2e 는
  빈 신호 폴백 경로 위주로만 확인. 데이터 유입 후 채워진 화면 재검증 필요(SQL/로직·유닛은 통과).

---
*P0 0·P1 0·P2 이월. 신규 쓰기·RLS·결제 표면 0(안전 1차). 빌드·lint·integrity·테스트(1283) 녹색.
커밋: 57556c7·bc65298·8225fef·9e828d5. 적대적 리뷰 서브에이전트 병행.*
