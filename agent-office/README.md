# Dewy 에이전트 오피스 (1단계)

웨딩 버티컬 AI '듀이'의 운영 보조 멀티에이전트 시스템. **1인 운영 pre-beta** 기준으로
**1단계 최소 구성**(마케팅 에이전트 ↔ 총괄 관리자)만 담는다.

> ⚠️ **솔직한 경고(설계 결론):** 에이전트 2개에 CrewAI는 다소 무겁다. 사실 함수 2개로도 충분하다.
> 학습/확장 대비용으로만 CrewAI를 쓰고, 운영이 무거워지면 plain 함수로 회귀할 것.
> CS·보안·개발 자동 패치는 **현 단계 오버엔지니어링이라 의도적으로 제외**했다.
> 시각 자산은 **생성까지만**(Higgsfield CLI) 지원하고 **자동 발행은 하지 않는다**(사람 검수).
> (근거: CS 약 50건/월 = 하루 1.6건, AI 예산 $50–200/월. 자동화 ROI가 아직 안 난다.)

## 범위 (1단계에서 하는 것 / 안 하는 것)

| 한다 | 안 한다(나중) |
|---|---|
| 마케팅 초안(블로그/숏폼) 생성 | CS 트리아지 crew |
| 총괄(라우터)이 마케팅 작업인지 판단 | 보안→개발 자동 패치 그래프 |
| **시각 자산 생성**(Higgsfield CLI, 터미널) | 시각자산/원고 **자동 발행** |
| 산출물을 `drafts/`·`assets/` 에 저장(사람 검수) | 상시 가동 에이전트 |
| 모델 배분/가드레일 단일 소스(config.py) | |

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

## 오피스 시각화 (게임처럼) 🎮

터미널에서 에이전트들이 일하는 모습을 책상·상태·활동 로그로 본다(표준 라이브러리만, 의존성 0).

```bash
python office_sim.py                 # 데모 재생(키 불필요) — 흐름 감상
python office_sim.py --fast          # 빠른 미리보기
python office_sim.py --brief "성수동 웨딩홀 추천 글"   # 실제 크루를 돌리며 시각화
                                                      # (키 없으면 데모로 자동 전환)
```
- 가동석: 🧭 총괄(Haiku) · ✍️ 마케팅(Sonnet) · 🎨 시각(Higgsfield).
- 🛟 CS · 🔒 보안 책상은 **로드맵 표시용(미가동)** — 현 단계 오버엔지니어링이라 비워둠.

### 브라우저 시각화 (그래픽)
설치 없이 더블클릭으로 열리는 자체 완결 HTML — 책상 애니메이션 + 활동 로그 + 재생/속도 컨트롤.
```
agent-office/office.html   # 브라우저로 열기(더블클릭)
```

## 시각 자산 (Higgsfield)

이미지/숏폼 생성은 Higgsfield CLI 로 처리한다. 두 가지 사용 경로:

### A. 대화형 (Claude Code 등) — 스킬
레포 루트 `.agents/skills/` 에 Higgsfield 스킬 4종이 설치돼 있다(generate · marketplace-cards ·
product-photoshoot · soul-id). 에이전트에서 `/higgsfield:generate` 또는 "Higgsfield로 이미지를
생성하세요" 라고 호출하면 된다.

### B. 자동/배치 (터미널) — Python 파이프라인
```bash
# 사전 1회 (사용자 머신)
npm install -g @higgsfield/cli
higgsfield auth login        # 브라우저 인증(~5초)

cd agent-office
python visual_pipeline.py "성수동 가을 야외 웨딩" --aspect 9:16   # 실제 생성
python visual_pipeline.py "..." --dry-run                        # CLI/인증 없이 흐름만 확인
# → assets/ 에 결과 저장. 사람이 검수 후 사용(자동 게시 없음).
```
- 내부적으로 `higgsfield generate create <model> --prompt "..." --wait` 를 호출한다
  (`--wait` 가 업로드/폴링까지 처리하고 결과 URL 출력 → 자동 다운로드).
- 모델은 `config.HIGGSFIELD_MODEL`(기본 `nano_banana_2`). `higgsfield model list` 로 확인/변경.
- 인증(`higgsfield auth login`)은 브라우저가 필요해 헤드리스 환경에선 불가 — 로컬에서 1회 실행.

## 메인 앱과의 관계

- 이 디렉터리는 **별도 Python 도구**다. Vite/React 앱(`src/`)의 빌드·린트·테스트 대상이 아니다.
- 산출물을 앱에 노출하려면(예: 어드민 마케팅 초안함) `marketing_drafts` 테이블 + 어댑터가 필요하다 —
  현재는 **로컬 `drafts/` 파일 저장**이 기본(1인 운영 최단 경로). Supabase/Notion 연동은 후속(확인 필요).
- 브랜드 톤·기획 근거는 레포의 `docs/marketing-plan.md` 와 `.claude/skills/marketing-draft/` 를 참조.
