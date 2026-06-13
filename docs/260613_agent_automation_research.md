# 260613 에이전트 자동화 — 업계 분석 후 계획

> 목적: Dewy 에이전트 오피스의 자동화 방향(특히 browser-use 도입·개입 최소화)을 정하기 전에
> "다른 기업들은 어떻게 하나"를 조사하고 그에 근거해 계획. 조사: 웹 리서치(2026-06), 출처 하단.
> 기준: 1인 운영 pre-beta, CS ~50건/월, AI 예산 $50–200/월.

## 1. 발견 — 업계는 지금 이렇게 한다

### A. Human-in-the-loop(HITL)가 사실상 표준
- 2026 고성과 마케팅팀의 **73%가 HITL** 운영(완전 자동 아님). 패턴: **에이전트가 생성·스테이징 → 사람이 발행 전 승인**.
- 효과: 콘텐츠 제작 시간 최대 75%↓, 완전 자동 대비 **오류 73%↓**.
- 핵심 원칙: 사람을 **모든 곳이 아니라 고레버리지 지점(브리프·편집검토·최종승인)에만** 둔다. 실패한 도입 대부분은 "AI가 나빠서가 아니라 사람을 아무 데나 끼워서".
- **티어드 리뷰**: 저위험(내부 리포트)=빠른 점검 / 고위험(공개 광고)=다단계 승인.
- 롤아웃: **"섀도 모드"** — 처음 2주는 에이전트 결과를 'Drafts'에만 쌓고 사람이 검토, 신뢰되면 게이트 완화.

### B. 브라우저 자동화 — 2026엔 "프로덕션급"이지만 조건부
- 주류 플랫폼이 **샌드박스·세분 권한·중요동작 HITL 확인**을 기본 탑재 → 프로덕션 안전성 확보.
- ⚠️ **프롬프트 인젝션 리스크**: 미방어 에이전트는 공격의 24%에 당함(방어 적용 시 절반 이하로). → 스크래핑한 외부 텍스트가 에이전트 행동을 좌우하게 두면 안 됨.
- 베스트 프랙티스: **AI + 결정론적 스크립트 페어링** — 애매·동적 부분만 AI, 항상 같아야 하는 단계는 스크립트. 안정성↑ 실패율↓.
- ROI 사례: 정부포털 월 24h→3h, 이커머스 상품수정 6h→25분(누락오류 12%→0.5%). 조직 57%가 에이전트 프로덕션 가동.

### C. 솔로 파운더 스택(2026)
- 표준 5영역: 제품/코드=Claude Code·Cursor / 콘텐츠=Claude·GPT / CS=Intercom Fin·전용 에이전트 / 디자인=Canva·Midjourney / **오케스트레이션=Make·n8n**.
- 비용 연 $3k–12k(인력 대비 95–98%↓), 마진 60–80%. 솔로 창업 비중 23.7%(2019)→36.3%(2025).
- 시사: 비개발 오케스트레이션은 **n8n/Make**가 흔함(코드형 LangGraph/CrewAI는 무거움).

## 2. Dewy 시사점

1. **내 직감(승인 게이트 1개 + 나머지 자동)이 업계 표준과 정확히 일치.** browser-use로 무인 발행이 아니라, **생성·리서치는 자동 / 발행은 1클릭 승인**이 정답(오류 73%↓ 근거).
2. **browser-use는 도입 가치 있음**(API 없는 한국 커뮤니티 리서치·게시·앱QA). 단 조건: 샌드박스·권한 최소화, **프롬프트 인젝션 방어**(스크랩 콘텐츠로 행동 결정 금지), **결정론적 스크립트와 페어링**(전부 AI에 맡기지 않기).
3. **섀도 모드로 시작.** 첫 2주는 전부 Drafts/큐에만 — 신뢰 쌓이면 게이트 완화. pre-beta에 딱.
4. **오케스트레이션 과설계 경계.** 업계 솔로는 n8n/Make로 가볍게 간다. Dewy는 이미 Python 오피스가 있으니 유지하되, **CrewAI 같은 무거운 협업 계층은 2개 에이전트엔 불필요**(기존 결론 재확인).

## 3. 계획 (근거 기반)

### 1단계 — 승인 큐 + 섀도 모드 (개입 최소화의 핵심, 외부 의존 0)
- 산출물에 `status: pending|approved` 도입. 대시보드에서 **1클릭 승인/반려**.
- 승인 전엔 어디에도 안 나감(섀도 모드). 개입 = "큐 훑고 승인" 하루 ~30초.
- HITL 73%·오류73%↓ 근거. 제가 지금 만들고 검증 가능.

### 2단계 — browser-use (로컬, 결정론 페어링)
- 용도 한정: ① 한국 커뮤니티(네이버카페·디시) 웨딩 리서치 ② **승인된** 초안 게시 ③ 앱 자가 QA.
- 안전장치: 샌드박스 프로필 + 허용 도메인 화이트리스트 + **스크랩 텍스트는 '데이터'로만 취급(행동 지시로 해석 금지)** + 중요동작은 큐로 보내 사람 승인.
- 결정론 스크립트 우선(로그인·고정 셀렉터), AI는 애매한 탐색에만.
- 샌드박스 검증 불가 → 스캐폴드 + 로컬 실행.

### 3단계 — 운영 데이터 루프 (선택)
- duckdb로 runs.jsonl·앱 익스포트(클릭·에러로그) 로컬 분석 → 무엇을 더 자동화할지 데이터로 결정.

### 보류 (현 단계 과설계)
- 완전 무인 발행 / browser-use 무제한 권한 / 가상 CS crew 상시가동 / Valyu·excalidraw.

## 출처
- [Human-in-the-loop marketing 2026 (Roar)](https://roardigital.co.uk/insights/human-in-the-loop-marketing-why-ai-needs-people-more-than-ever-in-2026/)
- [HITL AI agents in LangGraph 2026 (GrowwStacks)](https://growwstacks.com/blog/human-in-the-loop-ai-agents-langgraph)
- [Human in the Loop AI Marketing guide 2026](https://agenticmarketingpro.com/human-loop-ai-marketing/)
- [State of AI & Browser Automation 2026 (Browserless)](https://www.browserless.io/blog/state-of-ai-browser-automation-2026)
- [AI Browser Agents for SMEs 2026 (ACTGSYS)](https://actgsys.com/en/blog/ai-browser-agent-operator-business-2026)
- [Best Agent Browsers 2026 (Bright Data)](https://brightdata.com/blog/ai/best-agent-browsers)
- [Solo Founder AI Agent Stack 2026 (mean.ceo)](https://blog.mean.ceo/the-solo-founder-ai-agent-stack-that-is-replacing-entire-startup-teams/)
- [How solo founders build with AI 2026 (Founder Institute)](https://fi.co/insight/how-solo-founders-are-building-unicorns-with-ai-tools-in-2026-and-where-to-learn-it-live)
