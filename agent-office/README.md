# Dewy 에이전트 오피스 (1단계)

웨딩 버티컬 AI '듀이'의 운영 보조 멀티에이전트 시스템. **1인 운영 pre-beta** 기준으로
**1단계 최소 구성**(마케팅 에이전트 ↔ 총괄 관리자)만 담는다.

> ⚠️ **솔직한 경고(설계 결론):** 에이전트 2개에 CrewAI는 다소 무겁다. 사실 함수 2개로도 충분하다.
> 학습/확장 대비용으로만 CrewAI를 쓰고, 운영이 무거워지면 plain 함수로 회귀할 것.
> CS·보안·개발 자동 패치·시각자산 자동발행은 **현 단계 오버엔지니어링이라 의도적으로 제외**했다.
> (근거: CS 약 50건/월 = 하루 1.6건, AI 예산 $50–200/월. 자동화 ROI가 아직 안 난다.)

## 범위 (1단계에서 하는 것 / 안 하는 것)

| 한다 | 안 한다(나중) |
|---|---|
| 마케팅 초안(블로그/숏폼) 생성 | CS 트리아지 crew |
| 총괄(라우터)이 마케팅 작업인지 판단 | 보안→개발 자동 패치 그래프 |
| 산출물을 `drafts/` 에 저장(사람 검수) | Higgsfield 시각자산 자동 발행 |
| 모델 배분/가드레일 단일 소스(config.py) | 상시 가동 에이전트 |

**자동 발행 금지.** 모든 산출물은 초안이며, 사람(운영자)이 검토 후 직접 게시한다.

## 모델 배분 (config.py — 설계서 권고 반영)

| 역할 | 모델 | 이유 |
|---|---|---|
| 총괄 라우팅 | `claude-haiku-4-5` | 분류/디스패치는 경량 — 최상위 모델 낭비 회피 |
| 마케팅 카피 | `claude-sonnet-4-6` | 품질/비용 균형 |

> ⚠️ CrewAI/LiteLLM 의 정확한 모델 문자열 규약(`anthropic/...` 프리픽스 등)은 **확인 필요** —
> 사용 중인 CrewAI 버전 문서에 맞춰 `config.py` 의 모델 문자열만 조정하면 된다.

## 실행 전 가정 (반드시 충족)

1. Python 3.10+ 와 가상환경.
2. `ANTHROPIC_API_KEY` 환경변수 설정(`.env.example` 참고).
3. `pip install -r requirements.txt` (CrewAI 등 — 메인 앱과 **독립**, npm 빌드에 영향 없음).
4. 산출물은 항상 초안. 자동 발행 경로 없음.

## 실행

```bash
cd agent-office
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...
python marketing_office.py "성수동 웨딩홀 추천 글"   # 인자 = 기획 brief
# → drafts/<timestamp>-<slug>.md 에 초안 저장. 사람이 검토 후 게시.
```

## 메인 앱과의 관계

- 이 디렉터리는 **별도 Python 도구**다. Vite/React 앱(`src/`)의 빌드·린트·테스트 대상이 아니다.
- 산출물을 앱에 노출하려면(예: 어드민 마케팅 초안함) `marketing_drafts` 테이블 + 어댑터가 필요하다 —
  현재는 **로컬 `drafts/` 파일 저장**이 기본(1인 운영 최단 경로). Supabase/Notion 연동은 후속(확인 필요).
- 브랜드 톤·기획 근거는 레포의 `docs/marketing-plan.md` 와 `.claude/skills/marketing-draft/` 를 참조.
