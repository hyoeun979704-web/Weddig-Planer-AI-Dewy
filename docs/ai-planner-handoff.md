# AI 플래너 인수인계 프롬프트

다른 작업 세션·도구에서 듀이의 AI 플래너(챗봇)를 작업할 때 그대로 복사·붙여넣기 해서 쓸 수 있는 컨텍스트 문서입니다.

---

## 인수인계 프롬프트 (복사용)

```
나는 '듀이(dewy)' 라는 한국 통합 웨딩 플랫폼의 AI 플래너 챗봇 기능을 작업
하려고 합니다. 다음 컨텍스트를 기반으로 도와주세요.

[프로젝트 개요]
- 서비스명: 듀이(dewy) — dewy-wedding.com
- 비즈니스: AI 기반 통합 웨딩 플랫폼 (정보·플래닝·커뮤니티·커머스·AI Studio)
- 운영: 김효은 1인 부업, 자체 자본·자체 매출 기반 부트스트랩
- 단계: 베타 → 사업자등록(진행 중) → 정식 출시 예정

[챗봇 'AI 플래너' 정체성]
- 페르소나명: 듀이(Dewy) — 'Duo(둘) + Easy(쉽게)' = "둘이서 쉽게"
- 캐릭터: 한국 웨딩 전문가 언니/누나, 정중하고 따뜻한 해요체
- 도메인 특화: 스드메·예단·예물·보증인원 등 한국 결혼 문화·관습 전문
- 톤: 공감 우선, 그 후 구체 대안 3가지 이상 제시
- 사용자 호칭: "신부님" 또는 "신랑님" (또는 사용자 별명)

[기술 스택]
- 프론트엔드: React 18 + TypeScript + Vite + Next.js + Tailwind + shadcn/ui
- 백엔드: Supabase (PostgreSQL, Edge Functions Deno, Storage, Auth)
- LLM: Google Gemini API (chatbot 전용)
- 결제: PortOne (다중 PG 통합) — 토스가 아닌 PortOne 사용
- 배포: PWA (Vercel) + 추후 Android (TWA)

[현재 구현 상태]
파일 위치:
- src/pages/AIPlanner.tsx                       (UI 페이지)
- supabase/functions/ai-planner/index.ts        (Edge Function 진입점)
- supabase/functions/ai-planner/prompt.ts       (BASE_SYSTEM_PROMPT 페르소나)
- supabase/functions/ai-planner/memory.ts       (대화 메모리 추출·저장)
- supabase/functions/ai-planner/user-data.ts    (사용자 결혼 정보 컨텍스트)

이미 동작하는 것:
- Gemini API 연동
- 페르소나 시스템 프롬프트
- 대화 메모리 시스템 (이전 대화 정보 누적)
- 사용자 데이터 기반 컨텍스트 (예식일·예산·선호도·일정 등)
- 일일 무료 한도 (5회/일)
- Premium 구독자 무제한 (subscriptions 테이블 기반)
- 한도 초과 시 Premium 권유 모달

[비즈니스 모델 (챗봇)]
- 무료: 일 5회 질문
- Premium 구독: 무제한 + AI 견적서 PDF + 예산 분석 리포트 PDF
- AI Studio (이미지 생성)는 별도 하트(토큰) 시스템으로 분리

[향후 작업 가능 항목 — 우선순위 순]

(1) 비용 최적화 [추천]
   - FAQ 게이트: 디데이·예산조회·체크리스트 등 단순 질문은 LLM 호출 없이
     DB 쿼리로 즉답 (호출량 30~40% 감소 예상)
   - Gemini context caching: BASE_SYSTEM_PROMPT 캐시화 (90% 토큰 할인)
   - 출력 토큰 캡: max_output_tokens 600 적용
   - 대화 히스토리 압축: 10턴 이상 시 요약본 + 최근 4~5턴만 유지

(2) PDF 생성 기능
   - AI 견적서 자동 생성 (Premium 전용)
   - 예산 분석 리포트 PDF (Premium 전용)
   - 현재 Premium 페이지에 항목만 정의되어 있고 미구현
   - WeasyPrint(Python) 또는 Puppeteer 기반 가능

(3) 프롬프트·페르소나 고도화
   - 시기별 응답 분기 (예식 6개월 전 vs 1개월 전)
   - 갈등 중재 화법 라이브러리 (예단·예물·보증인원 등)
   - 지역별 상세 가이드 (수도권 vs 지방, 보증인원·견적 차이)

(4) 멀티턴 대화 개선
   - Tool calling 도입 (예: 식장 검색·예산 시뮬레이션 자동 호출)
   - Streaming 응답 (TTFT 개선, UX 향상)
   - 음성 입력·출력 (Web Speech API)

(5) 추가 기능
   - 푸시 알림 (D-Day, 골든타임)
   - 카카오톡 알림톡 연동 (별도 사업자 인증 필요)

[건드리지 말 것]
- AI Studio (드레스 피팅 등 이미지 생성) — Gemini Nano Banana Pro 2 사용,
  별도 하트 시스템으로 운영
- 결제 시스템 (Premium 구독·하트팩) — PortOne 연동 별도 작업
- 어드민 영역 — /admin/* 별개 운영자 도구

[주의 사항]
- 외부 AI API 의존: Gemini 가격·정책 변동 위험. 프로바이더 추상화 구조
  유지하면 향후 교체 가능
- 한국 웨딩 도메인 정확성: "예단" vs "예물" 같은 용어 혼용 금지
- 광고성 업체 추천 금지: 객관적 기준만 제시
- 불확실한 견적: "지역·시즌별 상이"라는 단서 필수
- 일 5회 한도 초과 시 메시지: "내일 다시" + Premium 권유 (강제 X)

[성공 지표]
- 사용자당 평균 LLM 호출 비용: 1.5원 이하 목표 (현재 약 3~5원)
- 일일 한도 도달률: 30% 이상 (Premium 전환 트리거)
- 대화 만족도: NPS 50+
- Premium 전환율: 무료 사용자의 5~10%

위 컨텍스트 기반으로 작업해주세요.
```

---

## 추가 참고 자료

### 핵심 페르소나 정의 (prompt.ts에서)

```
당신은 '듀이(Dewy)'입니다. 한국의 웨딩 트렌드와 예절, 실무 절차를 완벽하게
파악하고 있는 AI 웨딩플래너입니다.

목표: 예비부부의 막막함을 '확신'과 '설렘'으로 바꾸기.
태도: 극도로 꼼꼼함, 무한 상냥함, 해결 지향적, 한국 웨딩 특화.

호칭: "신부님" / "신랑님" (또는 별명)
종결: 정중한 해요체
이모지: 🌿 💍 ✨ 등 적절히

선제적 질문: "예식일은 잡히셨나요?" 등 먼저 정보 요청.
```

### 핵심 기능 (현재 구현)

1. 맞춤형 예산 설계 (항목별 비율, 추가금 방어)
2. D-Day 역산 일정 + 시기별 골든타임
3. 멘탈 케어 (예단·예물 갈등 등)

### 금지 사항

- 부정적·비판적 언어
- 광고성 업체 강요
- 불확실한 견적 단정 (반드시 "대략적"·"시즌별 상이" 단서)

---

## 새 세션에서 작업 시작 체크리스트

새 세션·도구로 옮겨가서 작업할 때:

- [ ] 위 인수인계 프롬프트 복사·붙여넣기로 컨텍스트 전달
- [ ] 작업 범위 명확히 (예: "비용 최적화 중 FAQ 게이트만 구현")
- [ ] git pull origin main 으로 최신 상태 받기
- [ ] 새 브랜치 생성: claude/ai-planner-{기능} 형식
- [ ] 변경 시 supabase/functions/ai-planner/ 만 손대고 다른 영역 X
- [ ] 작업 완료 후 PR로 main 머지

## 환경 변수

ai-planner Edge Function에서 사용:
- `GEMINI_API_KEY` — Google AI Studio에서 발급
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — 자동 주입

## 데이터베이스 의존 테이블

- `subscriptions` — Premium 구독 상태
- `ai_usage_daily` — 일일 사용 카운터
- `profiles` — 사용자 기본 정보
- `wedding_info` — 결혼 정보 (예식일·예산·지역 등) ※ 정확 테이블명 확인 필요
- `ai_planner_memories` — 대화 메모리 (memory.ts 참고)

## 비용 추정 (참고)

현재 평균 호출당 약 3~5원 (Gemini 2.5 Flash 가정):
- 입력: 평균 3,000 토큰 (시스템 프롬프트 + 컨텍스트 + 사용자 메시지)
- 출력: 평균 500 토큰

월 100명 사용자 가정 시:
- 사용자당 평균 30~60 호출
- 월 예상 비용: 9,000~30,000원

비용 최적화 후 (FAQ 게이트 + 캐싱):
- 호출당 약 1~1.5원
- 월 예상 비용: 3,000~9,000원 (66% 절감)
