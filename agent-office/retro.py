"""주간 회고 + 학습(Reflexion) — 청사진 P4.

runlog/품질/승인 이력을 분석해 "무엇이 먹혔나/안 먹혔나"를 요약하고 개선 제안을 도출,
learnings.md(영속 성찰 메모리)에 누적한다. 다음 생성 때 이 학습을 컨텍스트로 주입하면
같은 실수를 반복하지 않는다(Reflexion). LLM 없이도 휴리스틱으로 동작.

    python retro.py            # 요약·제안 출력
    python retro.py --write    # learnings.md 에 회고 1건 append
"""

import argparse
import datetime as _dt
import re
from pathlib import Path

import runlog

BASE = Path(__file__).parent
LEARNINGS = BASE / "learnings.md"


def summarize() -> dict:
    runs = runlog.read_runs()
    outs = runlog.list_outputs()
    scores = [int(m.group(1)) for r in runs if (m := re.search(r"품질 (\d+)/10", r.get("note", "")))]
    by_status = {"pending": 0, "approved": 0, "rejected": 0}
    for o in outs:
        by_status[o.get("status", "pending")] = by_status.get(o.get("status", "pending"), 0) + 1
    reviewed = by_status["approved"] + by_status["rejected"]
    return {
        "runs": len(runs),
        "outputs": len(outs),
        "avg_quality": round(sum(scores) / len(scores), 1) if scores else None,
        "low_quality": sum(1 for s in scores if s < 6),
        "approval_rate": round(by_status["approved"] / reviewed * 100) if reviewed else None,
        "by_status": by_status,
    }


def suggestions(sm: dict) -> list[str]:
    out = []
    if sm["avg_quality"] is not None and sm["avg_quality"] < 7:
        out.append("평균 품질<7 — 마케터 프롬프트에 '과장·군더더기 금지, 사실 근거' 강화.")
    if sm["low_quality"]:
        out.append(f"저품질(<6) {sm['low_quality']}건 — deslop 룰/금칙어 보강 또는 brief 구체화.")
    if sm["approval_rate"] is not None and sm["approval_rate"] < 60:
        out.append(f"승인율 {sm['approval_rate']}% — 반려 사유 패턴을 brief 템플릿에 반영.")
    if sm["by_status"]["pending"] > 10:
        out.append("대기 누적>10 — 승인 주기를 줄이거나 저위험 자동 통과 임계 도입 검토.")
    if not out:
        out.append("특이사항 없음 — 현 설정 유지. 데이터 더 쌓이면 자동 임계 조정 검토.")
    return out


def write_learning(sm: dict, sugg: list[str]) -> Path:
    if not LEARNINGS.exists():
        LEARNINGS.write_text("# 학습 메모리 (Reflexion)\n\n> 회고가 누적되는 곳. 다음 생성 시 컨텍스트로 참조.\n", encoding="utf-8")
    ts = _dt.datetime.now().strftime("%Y-%m-%d %H:%M")
    block = (f"\n## {ts} 회고\n"
             f"- 실행 {sm['runs']} · 산출물 {sm['outputs']} · 평균품질 {sm['avg_quality']} · "
             f"승인율 {sm['approval_rate']}% · 상태 {sm['by_status']}\n"
             + "".join(f"- 제안: {s}\n" for s in sugg))
    with open(LEARNINGS, "a", encoding="utf-8") as f:
        f.write(block)
    return LEARNINGS


def main() -> int:
    ap = argparse.ArgumentParser(description="주간 회고/학습")
    ap.add_argument("--write", action="store_true", help="learnings.md 에 회고 append")
    args = ap.parse_args()
    sm = summarize()
    sugg = suggestions(sm)
    print("=== 회고 요약 ===")
    print(f"실행 {sm['runs']} · 산출물 {sm['outputs']} · 평균품질 {sm['avg_quality']} · 승인율 {sm['approval_rate']}%")
    print("=== 개선 제안 ===")
    for s in sugg:
        print(" -", s)
    if args.write:
        print("기록:", write_learning(sm, sugg))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
