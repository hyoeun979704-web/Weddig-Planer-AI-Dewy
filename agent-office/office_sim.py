"""Dewy 에이전트 오피스 — 터미널 시각화('게임처럼').

오피스 평면도에 에이전트들을 책상으로 그리고, 작업 흐름(접수→분류→작성→시각생성→완료)을
상태 애니메이션 + 활동 로그로 보여준다. 표준 라이브러리만 사용(외부 의존 0).

사용:
    python office_sim.py                 # 데모(스크립트 재생, 키 불필요) — 게임처럼 감상
    python office_sim.py --fast          # 빠르게(검증/미리보기)
    python office_sim.py --brief "성수동 웨딩홀 추천 글"   # 실제 마케팅 크루를 돌리며 시각화
                                                          # (ANTHROPIC_API_KEY + crewai 필요,
                                                          #  없으면 데모로 자동 전환)

설계 메모: 1인 운영용 '관측/감상' 도구. CS·보안 책상은 로드맵 표시용으로만 두고(미가동),
실제 가동은 총괄·마케팅·시각 3석.
"""

import argparse
import itertools
import os
import sys
import threading
import time

# ── ANSI ────────────────────────────────────────────────────────────────────
CSI = "\x1b["
RESET = CSI + "0m"
DIM = CSI + "2m"
BOLD = CSI + "1m"
def color(c): return CSI + c + "m"
PINK, GREEN, YELLOW, BLUE, GREY, CYAN = (color(c) for c in ("95", "92", "93", "94", "90", "96"))

IS_TTY = sys.stdout.isatty()
SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

# 상태: 라벨 + 색
STATES = {
    "idle":  ("💤 대기", GREY),
    "think": ("💭 생각", YELLOW),
    "work":  ("⌨️  작업", CYAN),
    "done":  ("✅ 완료", GREEN),
    "off":   ("🚫 미가동", GREY),
}


class Agent:
    def __init__(self, key, emoji, name, model, state="idle"):
        self.key, self.emoji, self.name, self.model = key, emoji, name, model
        self.state = state
        self.task = ""


class Office:
    def __init__(self):
        self.agents = [
            Agent("router", "🧭", "총괄 관리자", "Haiku"),
            Agent("marketer", "✍️", "마케팅 카피", "Sonnet"),
            Agent("visual", "🎨", "시각 디자이너", "Higgsfield"),
            Agent("cs", "🛟", "CS 상담", "(로드맵)", state="off"),
            Agent("sec", "🔒", "보안 검토", "(로드맵)", state="off"),
        ]
        self.log = []
        self._spin = itertools.cycle(SPINNER)
        self._frame_spin = next(self._spin)

    def get(self, key):
        return next(a for a in self.agents if a.key == key)

    def set(self, key, state, task=None, note=None):
        a = self.get(key)
        a.state = state
        if task is not None:
            a.task = task
        if note:
            self.log.append((a.emoji, a.name, note))
            self.log = self.log[-6:]

    # ── 렌더 ──────────────────────────────────────────────────────────────
    def _desk(self, a):
        label, c = STATES[a.state]
        active = a.state in ("think", "work")
        spin = (self._frame_spin + " ") if active else "  "
        head = f"{a.emoji} {BOLD}{a.name}{RESET} {DIM}{a.model}{RESET}"
        body = f"  {spin}{c}{label}{RESET}"
        task = f"  {DIM}{a.task[:30]}{RESET}" if a.task else ""
        return head, body, task

    def render(self):
        self._frame_spin = next(self._spin)
        lines = []
        lines.append(f"{PINK}{BOLD}╭─ Dewy 에이전트 오피스 ───────────────────────────╮{RESET}")
        lines.append(f"{PINK}│{RESET} {DIM}둘이니까, 쉬워지니까 · 1인 운영 관측 콘솔{RESET}")
        lines.append(f"{PINK}╰──────────────────────────────────────────────────╯{RESET}")
        lines.append("")
        for a in self.agents:
            head, body, task = self._desk(a)
            lines.append(f"  {head}")
            lines.append(f"{body}{task}")
        lines.append("")
        lines.append(f"{DIM}── 활동 로그 ──────────────────────────────────────{RESET}")
        if not self.log:
            lines.append(f"{DIM}  (대기 중){RESET}")
        for emoji, name, note in self.log:
            lines.append(f"  {emoji} {DIM}{name}:{RESET} {note}")
        frame = "\n".join(lines)

        if IS_TTY:
            sys.stdout.write(CSI + "H" + CSI + "J")  # 커서 홈 + 화면 지움
        else:
            sys.stdout.write("\n" + "═" * 50 + "\n")
        sys.stdout.write(frame + "\n")
        sys.stdout.flush()


def animate(office, seconds, fps=12):
    """주어진 시간 동안 스피너만 돌리며 현재 상태를 렌더(작업 '진행 중' 연출)."""
    frames = max(1, int(seconds * fps))
    for _ in range(frames):
        office.render()
        time.sleep(1.0 / fps)


def run_demo(office, fast=False):
    s = 0.25 if fast else 1.0
    timeline = [
        ("router", "think", "새 작업 접수", "새 작업 접수: '성수동 웨딩홀 추천 글'", 1.2),
        ("router", "work", "작업 성격 분류", "마케팅 작업으로 분류 → 마케팅팀에 위임", 1.2),
        ("router", "done", "위임 완료", None, 0.4),
        ("marketer", "think", "브랜드 톤 로딩", "브랜드 보이스 로딩(존댓말·과장금지)", 1.0),
        ("marketer", "work", "블로그 초안 작성", "블로그 초안 작성 중...", 1.8),
        ("marketer", "done", "초안 완료", "초안 완료 → drafts/ 저장", 0.6),
        ("visual", "think", "비주얼 프롬프트", "비주얼 프롬프트 구성(9:16)", 1.0),
        ("visual", "work", "이미지 생성(--wait)", "Higgsfield 이미지 생성 중...", 1.8),
        ("visual", "done", "이미지 완료", "assets/ 저장", 0.6),
        ("router", "done", "작업 마감", "전체 완료 ✅ 사람 검수 대기(자동 발행 없음)", 0.8),
    ]
    for key, state, task, note, dur in timeline:
        office.set(key, state, task=task, note=note)
        animate(office, dur * s)
    office.render()


def run_live(office, brief, fast=False):
    """실제 마케팅 크루를 백그라운드로 돌리며 오피스를 애니메이션."""
    if not os.environ.get("ANTHROPIC_API_KEY"):
        office.set("router", "think", "키 없음", note="ANTHROPIC_API_KEY 없음 → 데모로 전환")
        animate(office, 1.5)
        return run_demo(office, fast=fast)

    result = {"done": False, "ok": False, "err": ""}

    def worker():
        try:
            import marketing_office  # 지연 import(데모만 쓸 땐 crewai 불필요)
            crew = marketing_office.build_crew(brief)
            out = crew.kickoff(inputs={"brief": brief})
            marketing_office.save_draft(brief, str(out))
            result["ok"] = True
        except Exception as e:  # noqa: BLE001
            result["err"] = str(e)[:60]
        finally:
            result["done"] = True

    office.set("router", "work", "실제 크루 가동", note=f"실제 크루 가동: '{brief[:30]}'")
    t = threading.Thread(target=worker, daemon=True)
    t.start()
    office.set("marketer", "work", "초안 작성(LLM)", note="마케팅 카피라이터 작업 중(LLM 호출)...")
    while not result["done"]:
        animate(office, 0.5)
    if result["ok"]:
        office.set("marketer", "done", "초안 완료", note="초안 완료 → drafts/ 저장")
        office.set("router", "done", "작업 마감", note="완료 ✅ 사람 검수 대기")
    else:
        office.set("marketer", "idle", "실패", note=f"실패: {result['err'] or '알 수 없음'}")
    office.render()


def main() -> int:
    ap = argparse.ArgumentParser(description="Dewy 에이전트 오피스 시각화")
    ap.add_argument("--brief", help="실제 마케팅 크루를 돌릴 기획안(없으면 데모)")
    ap.add_argument("--fast", action="store_true", help="빠른 재생(검증/미리보기)")
    args = ap.parse_args()

    office = Office()
    if IS_TTY:
        sys.stdout.write(CSI + "?25l")  # 커서 숨김
    try:
        if args.brief:
            run_live(office, args.brief.strip(), fast=args.fast)
        else:
            run_demo(office, fast=args.fast)
    finally:
        if IS_TTY:
            sys.stdout.write(CSI + "?25h")  # 커서 복원
            sys.stdout.flush()
    print(f"\n{GREEN}오피스 가동 종료.{RESET} 산출물은 drafts/ · assets/ 에서 확인(사람 검수 후 사용).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
