"""Dewy 에이전트 오피스 1단계 — 마케팅 에이전트 ↔ 총괄 관리자.

총괄(라우터)이 들어온 요청이 마케팅 작업인지 판단하고, 맞으면 마케팅 카피라이터에게
'초안' 작성을 위임한다. 산출물은 drafts/ 에 저장되며 자동 발행하지 않는다(사람 검수).

실행:
    python marketing_office.py "성수동 웨딩홀 추천 글"

실행 전 가정:
  - ANTHROPIC_API_KEY 환경변수 설정됨(.env 또는 셸).
  - pip install -r requirements.txt 완료.
  - 출력은 초안일 뿐, 자동 게시 경로는 없다(AUTO_PUBLISH=False).

⚠️ 솔직한 지적: 에이전트 2개에 CrewAI 는 다소 무겁다 — 함수 2개로도 충분하다.
   확장 대비 학습용으로만 사용하고, 무거워지면 plain 함수로 회귀할 것.
"""

import os
import re
import sys
import datetime as _dt
from pathlib import Path

from dotenv import load_dotenv

import config


def _slugify(text: str) -> str:
    """파일명용 슬러그. 한글은 보존하되 공백/특수문자만 정리."""
    s = re.sub(r"\s+", "-", text.strip())
    s = re.sub(r"[^0-9A-Za-z가-힣\-]", "", s)
    return (s[:40] or "draft").strip("-")


def save_draft(brief: str, content: str) -> Path:
    """초안을 drafts/ 에 마크다운으로 저장. 사람이 검토 후 직접 게시한다."""
    draft_dir = Path(__file__).parent / config.DRAFT_DIR
    draft_dir.mkdir(exist_ok=True)
    ts = _dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    path = draft_dir / f"{ts}-{_slugify(brief)}.md"
    header = f"<!-- 초안(자동 생성) · brief: {brief} · {ts} · 검수 후 게시 -->\n\n"
    path.write_text(header + content, encoding="utf-8")
    try:
        import runlog
        runlog.record_run("marketing", "마케팅 카피", "done", str(path.name), f"초안: {brief[:30]}")
    except Exception:
        pass
    return path


def build_crew(brief: str):
    """CrewAI 크루 구성. import 는 함수 안에서 — 미설치 환경에서도 모듈 로드는 되게."""
    from crewai import Agent, Task, Crew, Process

    manager = Agent(
        role="총괄 관리자",
        goal="들어온 요청이 마케팅 작업인지 판단하고 적합한 담당에게 위임",
        backstory="듀이 1인 운영을 보조하는 라우터. 가볍고 빠르게 판단한다.",
        llm=config.ROUTER_MODEL,   # 라우팅=최저가
        allow_delegation=True,
        verbose=True,
    )

    marketer = Agent(
        role="마케팅 카피라이터",
        goal="웨딩 버티컬 톤에 맞는 블로그/숏폼 '초안' 작성(발행은 사람이 결정)",
        backstory=config.BRAND_VOICE,
        llm=config.MARKETER_MODEL,  # 품질/비용 균형
        allow_delegation=False,
        verbose=True,
    )

    draft_task = Task(
        description=(
            f"요청 brief: {brief}\n"
            "웨딩 톤의 블로그 초안 1편을 작성하세요. 제목 + 본문(마크다운). "
            "과장·허위 금지, 실용 정보 우선. 발행하지 말고 초안만 작성."
        ),
        expected_output="제목 + 본문(마크다운) 형식의 블로그 초안",
        agent=marketer,
    )

    return Crew(
        agents=[manager, marketer],
        tasks=[draft_task],
        process=Process.sequential,  # 2개라 hierarchical 불필요(오버엔지니어링 회피)
        verbose=True,
    )


def main() -> int:
    load_dotenv()
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ERROR: ANTHROPIC_API_KEY 가 설정되지 않았습니다(.env 또는 셸).", file=sys.stderr)
        return 1

    brief = " ".join(sys.argv[1:]).strip() or "예비부부를 위한 웨딩 준비 꿀팁"
    print(f"[에이전트 오피스] brief: {brief}")

    crew = build_crew(brief)
    result = crew.kickoff(inputs={"brief": brief})

    # 가드레일 — 절대 자동 발행하지 않는다.
    assert config.AUTO_PUBLISH is False, "자동 발행은 금지되어 있습니다."
    path = save_draft(brief, str(result))
    print(f"\n✅ 초안 저장: {path}\n   사람이 검토 후 직접 게시하세요(자동 발행 없음).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
