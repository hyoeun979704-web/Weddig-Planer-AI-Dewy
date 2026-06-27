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

try:
    from dotenv import load_dotenv
except ImportError:  # dotenv 는 LLM 실행 때만 필요 — save_draft/검수 경로는 없이도 동작
    def load_dotenv(*_a, **_k):
        return False

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
    # 자동 품질 검수(quality: deslop 룰 + LLM-judge) — 사람 가기 전 점수·통과여부 산출.
    try:
        import quality
        rev = quality.evaluate(content, brief)
    except Exception:
        rev = {"score": None, "passed": None, "issues": []}
    score = rev.get("score")
    gate = "통과" if rev.get("passed") else "주의"
    issue_line = (" · 이슈: " + "; ".join(rev["issues"])) if rev.get("issues") else ""
    header = (f"<!-- 초안(자동 생성) · brief: {brief} · {ts} · 검수 후 게시"
              f" · 품질 {score}/10({gate}){issue_line} -->\n\n")
    path.write_text(header + content, encoding="utf-8")
    try:
        import runlog
        # 섀도 모드: 생성물은 pending 으로 큐에 — 사람 승인 전 미발행.
        runlog.set_status(path.name, "pending", f"품질 {score}/10 {gate}")
        runlog.record_run("marketing", "마케팅 카피", "done", str(path.name),
                          f"초안: {brief[:24]} (품질 {score}/10 {gate})")
    except Exception:
        pass
    # 앱 어드민 승인 큐로 업로드(env 있을 때만 — 폰에서 승인 가능). 실패해도 로컬 큐는 유지.
    try:
        import supabase_bridge
        supabase_bridge.push_output("draft", brief, source="marketing", body=content,
                                    deslop_score=score, issues="; ".join(rev.get("issues") or []) or None)
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
        llm=config.CREW_ROUTER_MODEL,   # 라우팅=최저가 (LiteLLM 프리픽스)
        allow_delegation=True,
        verbose=True,
    )

    marketer = Agent(
        role="마케팅 카피라이터",
        goal="웨딩 버티컬 톤에 맞는 블로그/숏폼 '초안' 작성(발행은 사람이 결정)",
        backstory=config.BRAND_VOICE,
        llm=config.CREW_MARKETER_MODEL,  # 품질/비용 균형 (LiteLLM 프리픽스)
        allow_delegation=False,
        verbose=True,
    )

    draft_task = Task(
        description=(
            f"요청 brief: {brief}\n\n"
            "웨딩 버티컬 블로그 초안 1편을 작성하세요(제목 + 마크다운 본문). 발행 금지·초안만.\n"
            "정보성 70% : 앱 소개 30%. 노골적 광고 톤 금지. 지어낸 수치·후기·효능 금지.\n\n"
            "[제목] 롱테일 검색 키워드를 앞단에 + 검색 의도 반영"
            "(예: '2026 결혼 준비 순서 체크리스트 (예비부부 필독)').\n"
            "[도입] 상투적 인사 금지 — '안녕하세요 신부님~' 류 금지. 검색자의 "
            "구체적 고민 상황 1문단으로 바로 진입.\n"
            "[본문] ## 소제목 4~6개로 시기별/항목별 전개. 표·리스트로 스캔 가능하게. 1,500자+. "
            "이미지 자리표시 `> [이미지: ...]` 6개+.\n"
            "[AIO 대응] 본문에 **FAQ(질문-답) 블록**을 ## 자주 묻는 질문 으로 3~5개 포함 — "
            "각 질문은 실제 검색 질의문, 답은 2~4문장 핵심부터(구글 AIO·검색 노출 대응).\n"
            "[SEO] 핵심 키워드를 제목·첫 문단·소제목에 자연 배치. 하단에 관련 키워드/해시태그 줄.\n"
            "[CTA] 마지막 ## 에서 앱 연결 1문단 + 자연스러운 CTA(예: 'Dewy 앱에서 자동 관리').\n"
            "[톤] 경험 공유형('저는 이렇게 했어요'), 과장·단정 금지.\n\n"
            "작성 후 자가 점검: 상투적 도입 아님 / FAQ 포함 / 키워드 배치 / 지어낸 수치 없음 — "
            "미달이면 고쳐 쓴 뒤 최종본만 출력."
        ),
        expected_output=(
            "제목(롱테일 키워드) + 마크다운 본문(소제목 4~6, 표/리스트, FAQ 블록, "
            "이미지 자리표시, 관련 키워드/해시태그, 자연스러운 앱 CTA)"
        ),
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

    # 런타임 가드레일 — 비용 캡·서킷브레이커 점검(GUARDRAILS.md 강제).
    import guardrails
    ok, why = guardrails.can_run()
    if not ok:
        print(f"⛔ 실행 차단: {why}", file=sys.stderr)
        return 2

    try:
        crew = build_crew(brief)
        result = crew.kickoff(inputs={"brief": brief})
        guardrails.record(success=True)
    except Exception as e:  # noqa: BLE001 - 실패도 서킷브레이커에 기록
        guardrails.record(success=False)
        print(f"크루 실행 실패: {e}", file=sys.stderr)
        return 1

    # 가드레일 — 절대 자동 발행하지 않는다.
    assert config.AUTO_PUBLISH is False, "자동 발행은 금지되어 있습니다."
    path = save_draft(brief, str(result))
    print(f"\n✅ 초안 저장: {path}\n   사람이 검토 후 직접 게시하세요(자동 발행 없음).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
