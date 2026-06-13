"""런타임 가드레일 — 비용 캡 + 서킷브레이커 (GUARDRAILS.md 정책의 실제 강제).

LLM 작업(크루·리서처) 실행 전 can_run() 으로 점검, 후 record() 로 기록.
- 일일 호출 캡: 하루 N회 초과 시 정지(폭주·과금 방어).
- 서킷브레이커: 연속 실패 K회면 차단(망가진 채 계속 호출 방지) — 사람이 reset 전까지.
상태는 usage.json(런타임). env 로 한도 조정:
  AGENT_DAILY_CALL_CAP(기본 50), AGENT_FAIL_STREAK_TRIP(기본 3)
"""

import datetime as _dt
import json
import os
from pathlib import Path

BASE = Path(__file__).parent
USAGE = BASE / "usage.json"

DAILY_CALL_CAP = int(os.environ.get("AGENT_DAILY_CALL_CAP", "50"))
FAIL_STREAK_TRIP = int(os.environ.get("AGENT_FAIL_STREAK_TRIP", "3"))


def _load() -> dict:
    if not USAGE.exists():
        return {"day": "", "count": 0, "fail_streak": 0, "tripped": False}
    try:
        return json.loads(USAGE.read_text(encoding="utf-8"))
    except Exception:
        return {"day": "", "count": 0, "fail_streak": 0, "tripped": False}


def _save(d: dict):
    try:
        USAGE.write_text(json.dumps(d, ensure_ascii=False), encoding="utf-8")
    except Exception:
        pass


def _today() -> str:
    return _dt.date.today().isoformat()


def can_run() -> tuple[bool, str]:
    """(허용여부, 사유). 캡 초과·서킷 트립이면 False."""
    d = _load()
    if d.get("day") != _today():  # 날짜 바뀌면 일일 카운트 리셋(서킷 상태는 유지)
        d["day"], d["count"] = _today(), 0
        _save(d)
    if d.get("tripped"):
        return False, f"서킷브레이커 작동(연속 실패 {d.get('fail_streak')}회). 'python guardrails.py --reset' 후 재개."
    if d.get("count", 0) >= DAILY_CALL_CAP:
        return False, f"일일 호출 캡({DAILY_CALL_CAP}) 도달. 내일 리셋 또는 AGENT_DAILY_CALL_CAP 조정."
    return True, "ok"


def record(success: bool):
    """작업 1건 결과 기록 — 카운트 증가 + 실패 스트릭/서킷 갱신."""
    d = _load()
    if d.get("day") != _today():
        d["day"], d["count"] = _today(), 0
    d["count"] = d.get("count", 0) + 1
    if success:
        d["fail_streak"] = 0
    else:
        d["fail_streak"] = d.get("fail_streak", 0) + 1
        if d["fail_streak"] >= FAIL_STREAK_TRIP:
            d["tripped"] = True
    _save(d)


def reset():
    """서킷브레이커 해제(사람이 원인 확인 후)."""
    d = _load()
    d["tripped"] = False
    d["fail_streak"] = 0
    _save(d)


if __name__ == "__main__":
    import sys
    if "--reset" in sys.argv:
        reset()
        print("서킷브레이커 해제됨.")
    else:
        ok, why = can_run()
        d = _load()
        print(f"can_run={ok} ({why}) · 오늘 {d.get('count',0)}/{DAILY_CALL_CAP} · 실패스트릭 {d.get('fail_streak',0)} · tripped={d.get('tripped',False)}")
