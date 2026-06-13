"""에이전트 오피스 실행 이력 — 대시보드 데이터 계층.

각 작업(마케팅 초안·시각 생성·라우팅)을 runs.jsonl 에 한 줄(JSON)씩 기록하고,
대시보드가 이를 읽어 KPI/상태/최근작업을 집계한다. GUI 와 분리돼 단독 테스트 가능.

    python runlog.py --seed     # 데모 데이터 채우기
    python runlog.py --stats    # 현재 집계 출력(텍스트)
"""

import argparse
import datetime as _dt
import json
from pathlib import Path

BASE = Path(__file__).parent
RUNS = BASE / "runs.jsonl"

IMG_EXT = {".png", ".jpg", ".jpeg", ".webp", ".mp4", ".mov", ".gif"}


def record_run(kind: str, agent: str, status: str = "done", output: str = "", note: str = "") -> dict:
    """작업 1건 기록(append). kind: routing|marketing|visual ..."""
    rec = {
        "ts": _dt.datetime.now().isoformat(timespec="seconds"),
        "kind": kind, "agent": agent, "status": status,
        "output": output, "note": note,
    }
    try:
        with open(RUNS, "a", encoding="utf-8") as f:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    except Exception:
        pass  # 로깅 실패가 작업을 막지 않게
    return rec


def read_runs(limit: int = 10000) -> list[dict]:
    if not RUNS.exists():
        return []
    out = []
    for line in RUNS.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            out.append(json.loads(line))
        except Exception:
            pass
    return out[-limit:]


def _count_files(dirname: str, exts) -> int:
    d = BASE / dirname
    if not d.exists():
        return 0
    return sum(1 for p in d.iterdir() if p.is_file() and p.suffix.lower() in exts)


def stats() -> dict:
    runs = read_runs()
    today = _dt.date.today().isoformat()
    by_agent: dict[str, int] = {}
    last_by_agent: dict[str, dict] = {}
    fail = 0
    for r in runs:
        a = r.get("agent", "?")
        by_agent[a] = by_agent.get(a, 0) + 1
        last_by_agent[a] = r
        if r.get("status") not in ("done", "ok"):
            fail += 1
    return {
        "total": len(runs),
        "today": sum(1 for r in runs if str(r.get("ts", "")).startswith(today)),
        "fail": fail,
        "by_agent": by_agent,
        "last_by_agent": last_by_agent,
        "drafts": _count_files("drafts", {".md"}),
        "assets": _count_files("assets", IMG_EXT),
        "recent": list(reversed(runs[-15:])),
    }


def seed_demo() -> int:
    """대시보드를 바로 채우기 위한 샘플 이력(과거 시각 분산)."""
    now = _dt.datetime.now()
    samples = [
        (180, "routing", "총괄 관리자", "done", "", "VOC 아님 → 마케팅 분류"),
        (175, "marketing", "마케팅 카피", "done", "drafts/0612-여름웨딩.md", "여름 웨딩 블로그 초안"),
        (120, "visual", "시각 디자이너", "done", "assets/0612-여름웨딩.png", "릴스 9:16 이미지"),
        (90, "routing", "총괄 관리자", "done", "", "마케팅 분류·위임"),
        (85, "marketing", "마케팅 카피", "done", "drafts/0613-성수웨딩.md", "성수동 웨딩홀 추천"),
        (30, "visual", "시각 디자이너", "done", "assets/0613-성수웨딩.png", "썸네일 이미지"),
        (12, "marketing", "마케팅 카피", "done", "drafts/0613-스드메.md", "스드메 가이드 초안"),
        (3, "routing", "총괄 관리자", "done", "", "신규 작업 접수"),
    ]
    n = 0
    for mins_ago, kind, agent, status, output, note in samples:
        ts = (now - _dt.timedelta(minutes=mins_ago)).isoformat(timespec="seconds")
        rec = {"ts": ts, "kind": kind, "agent": agent, "status": status, "output": output, "note": note}
        with open(RUNS, "a", encoding="utf-8") as f:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
        n += 1
    return n


def main() -> int:
    ap = argparse.ArgumentParser(description="에이전트 오피스 실행 이력")
    ap.add_argument("--seed", action="store_true", help="데모 데이터 채우기")
    ap.add_argument("--stats", action="store_true", help="집계 출력")
    args = ap.parse_args()
    if args.seed:
        print(f"샘플 {seed_demo()}건 기록 → {RUNS}")
    if args.stats or not args.seed:
        s = stats()
        print(f"총 {s['total']}건 · 오늘 {s['today']}건 · 실패 {s['fail']} · 초안 {s['drafts']} · 시각 {s['assets']}")
        print("에이전트별:", s["by_agent"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
