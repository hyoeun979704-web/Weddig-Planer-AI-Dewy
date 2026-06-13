"""Dewy 에이전트 오피스 — 설치형 게임(네이티브 창).

브라우저(HTML)가 아니라 실제 데스크톱 창으로 뜨는 tkinter 게임. tkinter 는 파이썬에
기본 포함(Windows python.org 설치본 포함)이라 추가 설치가 없다.

실행:
    python office_game.py            # 게임 창 실행(자동 재생)
    python office_game.py --selftest # 창을 잠깐 띄웠다 종료(동작 점검용)

화면: 오피스 평면도에 에이전트 책상, 작업 토큰(📋)이 책상 사이를 이동하며 상태가 바뀐다.
가동석 총괄/마케팅/시각 + 로드맵석(CS/보안, 미가동). 자동 발행 없음(사람 검수).

⚠️ 더 아케이드 같은 그래픽(스프라이트/사운드)을 원하면 pygame 버전도 가능:
    pip install pygame-ce   # (Python 3.14 는 pygame-ce 가 호환성 좋음)
   요청 시 office_pygame.py 로 제공.
"""

import argparse
import math
import sys
import tkinter as tk

# ── 테마 ──────────────────────────────────────────────────────────────────────
BG = "#FDF8F6"; CARD = "#FFFFFF"; LINE = "#F0E2E7"; PINK = "#F4A7B9"; PINK_D = "#E0809A"
INK = "#3A2E33"; MUTED = "#9B8E93"
COL = {"idle": "#B9ADB2", "think": "#F59E0B", "work": "#2BB3C0", "done": "#22A06B", "off": "#C9BEC3"}
LABEL = {"idle": "💤 대기", "think": "💭 생각", "work": "⌨ 작업", "done": "✅ 완료", "off": "🚫 미가동"}

AGENTS = [
    {"key": "router",   "emoji": "🧭", "name": "총괄 관리자",   "model": "Haiku",      "pos": (250, 120), "off": False},
    {"key": "marketer", "emoji": "✍", "name": "마케팅 카피",   "model": "Sonnet",     "pos": (480, 120), "off": False},
    {"key": "visual",   "emoji": "🎨", "name": "시각 디자이너", "model": "Higgsfield", "pos": (710, 120), "off": False},
    {"key": "cs",       "emoji": "🛟", "name": "CS 상담",       "model": "(로드맵)",   "pos": (365, 300), "off": True},
    {"key": "sec",      "emoji": "🔒", "name": "보안 검토",     "model": "(로드맵)",   "pos": (595, 300), "off": True},
]

# (key, state, task, note, 지속 ms)
TIMELINE = [
    ("router", "think", "새 작업 접수", "새 작업 접수: '성수동 웨딩홀 추천 글'", 1200),
    ("router", "work", "작업 분류", "마케팅 작업으로 분류 → 위임", 1200),
    ("router", "done", "위임 완료", None, 500),
    ("marketer", "think", "브랜드 톤 로딩", "브랜드 보이스 로딩(존댓말·과장금지)", 1000),
    ("marketer", "work", "블로그 초안 작성", "블로그 초안 작성 중...", 1800),
    ("marketer", "done", "초안 완료", "초안 완료 → drafts/ 저장", 700),
    ("visual", "think", "비주얼 프롬프트", "비주얼 프롬프트 구성(9:16)", 1000),
    ("visual", "work", "이미지 생성", "Higgsfield 이미지 생성 중...", 1800),
    ("visual", "done", "이미지 완료", "assets/ 저장", 700),
    ("router", "done", "작업 마감", "전체 완료 ✅ 사람 검수 대기", 1000),
]

DESK_W, DESK_H = 170, 96
FPS = 30


def _round_rect(cv, x, y, w, h, r, **kw):
    pts = [x+r, y, x+w-r, y, x+w, y, x+w, y+r, x+w, y+h-r, x+w, y+h,
           x+w-r, y+h, x+r, y+h, x, y+h, x, y+h-r, x, y+r, x, y]
    return cv.create_polygon(pts, smooth=True, **kw)


class OfficeGame:
    def __init__(self, root, selftest=False):
        self.root = root
        self.selftest = selftest
        self.speed = 1.0
        root.title("Dewy 에이전트 오피스")
        root.configure(bg=BG)
        root.geometry("940x620")

        # 헤더
        head = tk.Frame(root, bg=BG)
        head.pack(fill="x", padx=18, pady=(14, 4))
        tk.Label(head, text="💞 Dewy 에이전트 오피스", font=("Segoe UI", 16, "bold"),
                 bg=BG, fg=INK).pack(side="left")
        self.speed_btn = tk.Button(head, text="속도 1x", command=self.cycle_speed,
                                   bg=CARD, fg=MUTED, relief="flat", font=("Segoe UI", 10, "bold"))
        self.speed_btn.pack(side="right", padx=4)
        tk.Button(head, text="▶ 다시 재생", command=self.replay, bg=PINK, fg="#5A2233",
                  relief="flat", font=("Segoe UI", 10, "bold")).pack(side="right", padx=4)
        tk.Label(root, text="둘이니까, 쉬워지니까 · 1인 운영 관측 콘솔", font=("Segoe UI", 9),
                 bg=BG, fg=MUTED).pack(anchor="w", padx=20)

        self.cv = tk.Canvas(root, width=900, height=380, bg=BG, highlightthickness=0)
        self.cv.pack(padx=14, pady=8)

        # 활동 로그
        logf = tk.Frame(root, bg=CARD, highlightbackground=LINE, highlightthickness=1)
        logf.pack(fill="both", expand=True, padx=18, pady=(0, 16))
        tk.Label(logf, text="활동 로그", font=("Segoe UI", 10, "bold"), bg=CARD, fg=MUTED).pack(anchor="w", padx=12, pady=(8, 2))
        self.logbox = tk.Text(logf, height=6, bg=CARD, fg=INK, relief="flat",
                              font=("Segoe UI", 10), wrap="word")
        self.logbox.pack(fill="both", expand=True, padx=12, pady=(0, 10))
        self.logbox.configure(state="disabled")

        self.items = {}
        self._build_desks()
        # 작업 토큰(📋)
        self.token = self.cv.create_oval(0, 0, 0, 0, fill=PINK, outline=PINK_D, width=2)
        self.token_txt = self.cv.create_text(0, 0, text="📋", font=("Segoe UI Emoji", 16))
        self.tx, self.ty = 250, 120
        self.target = (250, 120)

        self._reset_anim()
        self._tick()

    # ── 그리기 ───────────────────────────────────────────────────────────────
    def _build_desks(self):
        self.cv.delete("desk")
        for a in AGENTS:
            cx, cy = a["pos"]
            x, y = cx - DESK_W/2, cy - DESK_H/2
            glow = _round_rect(self.cv, x-3, y-3, DESK_W+6, DESK_H+6, 18, fill="", outline="", tags="desk")
            body = _round_rect(self.cv, x, y, DESK_W, DESK_H, 16,
                               fill=CARD, outline=LINE, width=1, tags="desk")
            emo = self.cv.create_text(x+26, y+30, text=a["emoji"], font=("Segoe UI Emoji", 20), tags="desk")
            nm = self.cv.create_text(x+46, y+22, text=a["name"], anchor="w",
                                     font=("Segoe UI", 11, "bold"), fill=INK, tags="desk")
            ml = self.cv.create_text(x+46, y+40, text=a["model"], anchor="w",
                                     font=("Segoe UI", 8), fill=MUTED, tags="desk")
            st = "off" if a["off"] else "idle"
            badge = self.cv.create_text(x+14, y+72, text=LABEL[st], anchor="w",
                                        font=("Segoe UI", 9, "bold"), fill=COL[st], tags="desk")
            self.items[a["key"]] = {"glow": glow, "body": body, "badge": badge,
                                    "state": st, "off": a["off"], "pos": (cx, cy)}

    def _set_state(self, key, state):
        it = self.items[key]
        it["state"] = state
        self.cv.itemconfig(it["badge"], text=LABEL[state], fill=COL[state])

    def _log(self, key, note):
        a = next(x for x in AGENTS if x["key"] == key)
        self.logbox.configure(state="normal")
        self.logbox.insert("end", f"{a['emoji']} {a['name']}: {note}\n")
        self.logbox.see("end")
        self.logbox.configure(state="disabled")

    # ── 애니메이션 ─────────────────────────────────────────────────────────────
    def _reset_anim(self):
        self._build_desks()
        self.logbox.configure(state="normal"); self.logbox.delete("1.0", "end"); self.logbox.configure(state="disabled")
        self.idx = -1
        self.elapsed = 0.0
        self.done = False
        self._next_event()

    def _next_event(self):
        self.idx += 1
        if self.idx >= len(TIMELINE):
            self.done = True
            self._log("router", "— 가동 종료 — 산출물 drafts/ · assets/ (사람 검수) —")
            return
        key, state, task, note, dur = TIMELINE[self.idx]
        self.cur_dur = dur / 1000.0
        self.elapsed = 0.0
        self._set_state(key, state)
        if note:
            self._log(key, note)
        self.target = self.items[key]["pos"]
        self.active_key = key if state in ("think", "work") else None

    def _tick(self):
        dt = 1.0 / FPS
        if not self.done:
            self.elapsed += dt * self.speed
            # 토큰 이징 이동
            tx, ty = self.target
            self.tx += (tx - self.tx) * 0.18
            self.ty += (ty - self.ty) * 0.18 - 0  # 책상 중앙으로
            r = 16
            self.cv.coords(self.token, self.tx-r, self.ty-r-2, self.tx+r, self.ty+r-2)
            self.cv.coords(self.token_txt, self.tx, self.ty-2)
            # 활성 책상 글로우 펄스
            pulse = (math.sin(self.elapsed * 6) + 1) / 2
            for key, it in self.items.items():
                if key == getattr(self, "active_key", None):
                    w = 2 + int(pulse * 4)
                    self.cv.itemconfig(it["glow"], outline=PINK, width=w)
                else:
                    self.cv.itemconfig(it["glow"], outline="", width=0)
            if self.elapsed >= self.cur_dur:
                self._next_event()
        self.root.after(int(1000 / FPS), self._tick)

    # ── 컨트롤 ────────────────────────────────────────────────────────────────
    def cycle_speed(self):
        self.speed = {1.0: 2.0, 2.0: 4.0, 4.0: 1.0}[self.speed]
        self.speed_btn.config(text=f"속도 {int(self.speed)}x")

    def replay(self):
        self._reset_anim()


def main():
    ap = argparse.ArgumentParser(description="Dewy 에이전트 오피스 게임")
    ap.add_argument("--selftest", action="store_true", help="창을 잠깐 띄웠다 자동 종료(점검용)")
    args = ap.parse_args()

    try:
        root = tk.Tk()
    except tk.TclError as e:
        print(f"디스플레이를 열 수 없습니다(GUI 환경 필요): {e}", file=sys.stderr)
        return 1
    OfficeGame(root, selftest=args.selftest)
    if args.selftest:
        root.after(1500, root.destroy)  # 1.5초 후 자동 종료
    root.mainloop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
