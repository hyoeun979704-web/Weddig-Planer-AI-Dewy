# 버티컬 AI 개발기업 포지셔닝 — 기술성·R&D 별첨

**작성일**: 2026-06-19
**기업**: 듀이 (Dewy) — 개인사업자 — 대표 김효은
**용도**: 정부지원(창업도약 딥테크특화형·TIPS·AI바우처) 및 투자유치(IR)의 **기술성/R&D 항목 별첨**
**한 줄 정체성**: **"AI 신뢰성·초개인화 엔진을 보유한 버티컬 AI 개발사. 웨딩은 첫 번째 vertical이며, 동일 엔진을 라이프스테이지·타 도메인으로 확장한다."**

> 본 문서는 자금조달 전략(`260619_gov_funding_strategy.md`)의 부속 기술 근거다. 모든 주장은
> 실제 레포 코드에 근거하며 파일 경로를 명시한다(과장 금지 — 미구현은 "미구현"으로 표기).

---

## 0. TL;DR — 심사위원용 3줄

1. Dewy는 "웨딩 앱"이 아니라 **자체 설계한 AI 신뢰성 아키텍처(L1~L5 환각차단 RAG) + 20모드 초개인화
   엔진 + 멀티모달 이미지생성 파이프라인**을 보유한 기술기업이다.
2. 핵심 AI 코어(페르소나 분류·의도 라우터·근거주입 RAG·이미지생성)는 **도메인 변수만 교체하면
   재사용 가능**한 플랫폼 자산 → 숙박·부동산·뷰티 등 타 vertical로 1~2개월 내 이전 가능.
3. 1인 풀스택으로 **AI 기반 Edge Function 13개 + ML 분류 파이프라인(KLUE-RoBERTa)**을 프로덕션
   출시(2026.5.22)해, 신산업(AI) 기술기업으로서의 실행력을 실물로 증명했다.

---

## 1. 기술 차별성 — "프롬프트 래퍼"가 아닌 이유

대부분의 'AI 서비스'는 LLM API에 프롬프트만 얹은 래퍼다. Dewy는 **LLM을 신뢰하지 않는 구조**를
직접 설계했다. 이것이 기술적 해자의 핵심이다.

### 1.1 L1~L5 다층 환각차단 아키텍처 (자체 설계)
`supabase/functions/ai-planner/` — 설계문서 `docs/260612_ai_planner_caching_grounding_plan.md`

| 계층 | 역할 | 구현 파일 | 상태 |
|---|---|---|---|
| **L1 결정적 우선** | 의도 분류 후 DB 직답(가격·일정·체크리스트), LLM 미호출 | `intentRouter.ts`, `dbHandlers.ts` | ✅ 프로덕션 |
| **L2 근거주입(RAG)** | 16지역×7항목 평균가·places 실데이터 주입, "목록 밖 생성 금지" | `grounding.ts` | ✅ 프로덕션 |
| **L3 불확실성 계약** | 모든 금액에 출처태그 `[앱데이터]/[일반시세추정]` 강제 | `prompt.ts` | ✅ 프로덕션 |
| **L4 출력 후처리** | 근거 없는 금액·업체명 자동 감지→면책/재생성 (SSE 스트림 감사) | `postprocess.ts` | ✅ 프로덕션 |
| **L5 메모리 검증** | "이렇게 기억할게요" 사용자 확인 칩(✓/✕) + 메모리 관리 UI | `aiMemory.ts`, `MemoryManagerSheet.tsx` | ✅ 프로덕션 |

> **기술 포인트**: 환각을 "프롬프트로 자제 요청"하는 게 아니라 **구조적으로 불가능하게** 만든다.
> 검증가능한 팩트(240개 지역가격 데이터 하드코딩)만 근거로 쓰고, 없으면 "견적받기"로 유도한다.
> B2B·금융·의료 등 **신뢰성이 critical한 도메인으로 이전 가치가 큰 IP**.

### 1.2 의도 라우터 — 비용·지연·환각 동시 절감
`src/lib/chatbot/intentRouter.ts` (+ `intentRouter.test.ts` 21개 시나리오)
- 정규식 패턴 + DB 직답으로 **상위 30~40% 질의를 LLM 호출 없이** 처리.
- 효과: 운영비↓ + 응답속도↑ + 환각확률↓. 부트스트랩 지속가능성의 기술적 근거.

### 1.3 20모드 페르소나 엔진 (초개인화 IP)
`src/lib/weddingPersona.ts` — `PERSONA_REGISTRY` (단일 레지스트리, 약 360줄)
- 상황별(임신·국제결혼·재혼+자녀·스냅only·노웨딩·셀프·규모별·1인진행·해외거주) +
  성향별(절약형·만혼디자이너·초보) + 기본 2모드 = **20모드**, 우선순위 결정적 매칭(멱등).
- DB 트리거(`derive_wedding_persona`)와 클라이언트 parity 유지(드리프트 방지).
- 재사용처: AI 프롬프트 주입·홈 카피 분기·온보딩·미션 필터. **= "사용자 세그먼트 자동분류" 범용 엔진**.

### 1.4 멀티모달 이미지생성 파이프라인 (AI Studio)
OpenAI `gpt-image-2` 기반, 사용자 사진+레퍼런스 합성:

| 기능 | Edge Function | 상태 |
|---|---|---|
| 드레스 피팅(카탈로그) | `dewy-fitting` | ✅ v1 출시 |
| 드레스 추천(생성) | `dewy-dress-recommend` | ✅ |
| 메이크업 추천(얼굴분석) | `dewy-makeup-recommend` | ✅ |
| 메이크업 카탈로그 | `dewy-makeup` | ✅ |
| 헤어 프리뷰 | `dewy-hair-preview` | ✅ |
| 사진 고도화·배경처리 | `photo-enhance-batch` | ✅ |

> e-커머스 가상시착(의류·가구·화장품)으로 직접 이전 가능한 멀티모달 자산.

### 1.5 ML 투자 — 규칙→학습모형 진화
`src/lib/tipClassify.ts`(규칙 현행) + `ml/tip-classifier/`(KLUE-RoBERTa 멀티라벨, 학습 완료·미배포)
- 약한 라벨(규칙) → 골드 라벨(사람) 감독학습 파이프라인(Jupyter). 콘텐츠 큐레이션·모더레이션·자동태깅 확장.

### 1.6 멀티프로바이더 추상화 & 평가 인프라
- `supabase/functions/_shared/llm.ts` + `MODELS.ts` — OpenAI/Gemini 교체를 1파일로(프로바이더 락인 방지).
- 프롬프트 캐싱(2-message split)로 입력비 ~50%↓.
- `eval_options` 평가 모드 — 모델 A/B 테스트 자동화(품질/비용/환각율 측정).
- Gemini **Google Search Grounding** 실시간 웹검색(`vendor-web-search`).

---

## 2. 실측 기술 지표 (R&D 성과 근거)
설계·평가문서 `docs/260612_ai_planner_review.md`

| 지표 | 값 | 의미 |
|---|---|---|
| 입력 토큰/콜 | ~1,700 | eval 21시나리오 |
| 캐싱 효과 | 입력비 ~50%↓ | 운영비 구조 |
| 품질 점수(5점) | gpt-4o 4.19 / mini 4.10 | eval 종합 |
| 환각 건수(L2 적용 후, 4o) | 0건 | 근거주입 효과 |
| 의도 라우터 커버리지 | 30~40% | LLM 미호출 비율 |

> 단, 위는 자체 eval 기준 내부 측정값(외부 벤치 아님)임을 명시. 심사 제출 시 측정 방법 함께 기재.

---

## 3. 재사용 가능한 AI 코어 = 플랫폼 자산 (확장성)

| Tier | 자산 | 타 도메인 이전 |
|---|---|---|
| **T1 즉시** | 페르소나 분류 / 의도 라우터 / L1~L5 환각차단 / 근거데이터 패턴 | 세그먼트 분류·FAQ 절감·LLM 신뢰성(B2B/금융/의료) |
| **T2 재설계** | 이미지생성 / RAG 근거주입 / 도메인 지식캡슐 / KLUE 분류 | 가상시착·시세추천(부동산/자동차/여행)·자동태깅 |
| **T3 플랫폼** | 멀티프로바이더 추상화 / Edge Function 템플릿(인증·RLS·하트) / 캐싱 / eval 프레임 | 신규 vertical 부팅 인프라 |

### 3.1 타 vertical 확장 시나리오 (엔진 재사용)
- **숙박/여행**: 여행스타일 페르소나 + 지역평균가 근거주입 + 인테리어 시뮬.
- **부동산**: 매물검색 의도 우선 + 시세/주변시설 팩트만(환각차단) + 구매자 세그먼트.
- **뷰티/패션**: 가상시착 이미지생성 + 피부톤/체형 페르소나 + KLUE 랭킹 큐레이션.

> **버티컬 AI 기업 서사의 핵심**: 결혼 도메인에서 검증한 4대 엔진(페르소나·라우터·환각차단·이미지생성)을
> 변수 교체로 재사용 → 라이프스테이지(신혼·육아) 우선, 이후 인접 vertical 순차 확장.

---

## 4. 출시 실행력 (Traction = 기술 실현 증거)
출처: `business-plan-gov.md`, `CHANGELOG.md`

| 항목 | 규모(2026.05~06) |
|---|---|
| 출시 | 2026.05.22 dewy-wedding.com 라이브 |
| 프론트엔드 페이지 / 라우트 | 110 / 112 |
| DB 마이그레이션 | 76 |
| Edge Functions(총/ AI기반) | 23~53 / 13 |
| AI Studio | 6개 중 1개 출시 + 4종 구현 |
| B2B 사업자 콘솔 | 가입~정산 워크플로 완비 |
| 제휴 업체 입점 | 36곳 |

→ 1인 풀스택으로 양면시장 + 3계층 권한 + 결제 + AI 응용을 **출시 완료**. 신산업 기술기업 실행력 입증.

---

## 5. 딥테크/R&D 신청 시 강조 포인트 (정리)

- **자체 개발 AI 아키텍처**: L1~L5 구조적 환각차단(타사 미구현 영역).
- **도메인 데이터 자산**: 16지역×7항목 평균 + 사람 라벨 골드셋(KLUE 학습용) 수집.
- **신뢰성 IP의 범용성**: 환각차단·근거주입은 규제 도메인(금융·의료·법률)에서 가치 큼.
- **비용효율 구조**: 캐싱+의도라우터로 부트스트랩 지속가능 — 자금 효율 심사에 유리.
- **확장 로드맵**: 단일 도메인 LTV 한계를 엔진 재사용 멀티 vertical로 돌파(투자 스토리).

### 5.1 정직성 주의(과장 금지 — 심사 신뢰성)
- 2-tier 라우팅은 코드 준비·평가모드만, 본 경로는 gpt-4o 단일(미완).
- KLUE 분류 모델은 학습 완료·**미배포**(규칙 현행).
- PDF 생성·메모리 자동요약은 정의/부분구현 단계.
- 위 지표는 내부 eval 측정값. → 제출 시 "구현/부분/계획"을 구분 표기할 것.

---

## 6. 출처

**레포 코드**: `supabase/functions/ai-planner/{index,prompt,grounding,postprocess,memory,domain-capsules,user-data}.ts`,
`supabase/functions/_shared/llm.ts`, `supabase/functions/{dewy-fitting,dewy-dress-recommend,dewy-makeup-recommend,dewy-makeup,dewy-hair-preview,photo-enhance-batch,vendor-web-search,invitation-text-suggest,instagram-draft-generator}/index.ts`,
`src/lib/weddingPersona.ts`, `src/lib/chatbot/{intentRouter,dbHandlers}.ts`, `src/lib/{tipClassify,aiMemory}.ts`,
`ml/tip-classifier/train_classifier.ipynb`, `src/components/wedding-planner/MemoryManagerSheet.tsx`.

**설계/평가 문서**: `docs/260612_ai_planner_caching_grounding_plan.md`, `docs/260612_ai_planner_review.md`,
`docs/ai-planner-handoff.md`, `docs/260615_rag_grounding_*.md`.

**문서 끝**
