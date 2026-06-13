"""Dewy 에이전트 오피스 — 운영 대시보드(네이티브 창).

플로우 재생이 아니라 '현황판'. runs.jsonl(실행 이력)을 읽어 KPI·에이전트 상태·최근 작업을
표로 보여주고 주기적으로 새로고침한다. tkinter 기본 포함이라 추가 설치 없음.

실행:
    python office_dashboard.py
    python runlog.py --seed   # (선택) 데모 데이터 먼저 채우고 보기 — 창의 버튼으로도 가능
"""

import sys
import tkinter as tk
from tkinter import ttk

import runlog

BG = "#FDF8F6"; CARD = "#FFFFFF"; LINE = "#F0E2E7"; PINK = "#F4A7B9"
INK = "#3A2E33"; MUTED = "#9B8E93"
COL = {"done": "#22A06B", "ok": "#22A06B", "fail": "#E0567A", "idle": "#B9ADB2", "off": "#C9BEC3"}

# 표시할 에이전트(가동석 + 로드맵석). name 은 runlog 의 agent 값과 일치.
AGENTS = [
    ("🧭", "총괄 관리자", "Haiku", False),
    ("✍", "마케팅 카피", "Sonnet", False),
    ("🎨", "시각 디자이너", "Higgsfield", False),
    ("🛟", "CS 상담", "(로드맵)", True),
    ("🔒", "보안 검토", "(로드맵)", True),
]
KIND_KO = {"routing": "라우팅", "marketing": "마케팅", "visual": "시각", "": "-"}
REFRESH_MS = 5000


class Dashboard:
    def __init__(self, root):
        self.root = root
        root.title("Dewy 에이전트 오피스 · 대시보드")
        root.configure(bg=BG)
        root.geometry("960x640")

        head = tk.Frame(root, bg=BG); head.pack(fill="x", padx=18, pady=(14, 6))
        tk.Label(head, text="📊 Dewy 에이전트 오피스 — 대시보드", font=("Segoe UI", 16, "bold"),
                 bg=BG, fg=INK).pack(side="left")
        tk.Button(head, text="데모 데이터 채우기", command=self._seed, bg=CARD, fg=MUTED,
                  relief="flat", font=("Segoe UI", 10, "bold")).pack(side="right", padx=4)
        tk.Button(head, text="↻ 새로고침", command=self.refresh, bg=PINK, fg="#5A2233",
                  relief="flat", font=("Segoe UI", 10, "bold")).pack(side="right", padx=4)

        # KPI 카드 행
        self.kpis = {}
        krow = tk.Frame(root, bg=BG); krow.pack(fill="x", padx=14)
        for key, label in [("today", "오늘 작업"), ("total", "총 작업"),
                           ("drafts", "초안(drafts)"), ("assets", "시각자산(assets)"), ("fail", "실패")]:
            c = tk.Frame(krow, bg=CARD, highlightbackground=LINE, highlightthickness=1)
            c.pack(side="left", expand=True, fill="x", padx=4, pady=6)
            v = tk.Label(c, text="0", font=("Segoe UI", 22, "bold"), bg=CARD, fg=INK)
            v.pack(anchor="w", padx=12, pady=(8, 0))
            tk.Label(c, text=label, font=("Segoe UI", 9), bg=CARD, fg=MUTED).pack(anchor="w", padx=12, pady=(0, 8))
            self.kpis[key] = v

        # 에이전트 상태 그리드
        tk.Label(root, text="에이전트 현황", font=("Segoe UI", 11, "bold"), bg=BG, fg=MUTED).pack(anchor="w", padx=20, pady=(8, 2))
        grid = tk.Frame(root, bg=BG); grid.pack(fill="x", padx=14)
        self.agent_cards = {}
        for emoji, name, model, off in AGENTS:
            c = tk.Frame(grid, bg=CARD, highlightbackground=LINE, highlightthickness=1)
            c.pack(side="left", expand=True, fill="x", padx=4, pady=4)
            tk.Label(c, text=f"{emoji} {name}", font=("Segoe UI", 10, "bold"), bg=CARD, fg=INK).pack(anchor="w", padx=10, pady=(8, 0))
            tk.Label(c, text=model, font=("Segoe UI", 8), bg=CARD, fg=MUTED).pack(anchor="w", padx=10)
            cnt = tk.Label(c, text="0건", font=("Segoe UI", 14, "bold"), bg=CARD, fg=INK)
            cnt.pack(anchor="w", padx=10)
            stt = tk.Label(c, text="🚫 미가동" if off else "💤 대기", font=("Segoe UI", 9), bg=CARD, fg=MUTED)
            stt.pack(anchor="w", padx=10, pady=(0, 8))
            self.agent_cards[name] = (cnt, stt, off)

        # 최근 작업 표
        tk.Label(root, text="최근 작업", font=("Segoe UI", 11, "bold"), bg=BG, fg=MUTED).pack(anchor="w", padx=20, pady=(10, 2))
        cols = ("ts", "kind", "agent", "status", "note")
        self.tree = ttk.Treeview(root, columns=cols, show="headings", height=10)
        for c, w, t in [("ts", 140, "시각"), ("kind", 70, "종류"), ("agent", 120, "에이전트"),
                        ("status", 70, "상태"), ("note", 360, "내용")]:
            self.tree.heading(c, text=t); self.tree.column(c, width=w, anchor="w")
        self.tree.pack(fill="both", expand=True, padx=18, pady=(0, 14))

        self.refresh()
        self._schedule()

    def _seed(self):
        runlog.seed_demo()
        self.refresh()

    def refresh(self):
        s = runlog.stats()
        for k, lbl in self.kpis.items():
            lbl.config(text=str(s.get(k, 0)))
        for name, (cnt, stt, off) in self.agent_cards.items():
            n = s["by_agent"].get(name, 0)
            cnt.config(text=f"{n}건")
            if off:
                stt.config(text="🚫 미가동", fg=COL["off"]); continue
            last = s["last_by_agent"].get(name)
            if last:
                st = last.get("status", "done")
                stt.config(text=f"✅ {last.get('ts','')[11:16]} {last.get('note','')[:14]}", fg=COL.get(st, MUTED))
            else:
                stt.config(text="💤 대기", fg=MUTED)
        self.tree.delete(*self.tree.get_children())
        for r in s["recent"]:
            self.tree.insert("", "end", values=(
                r.get("ts", "")[5:16].replace("T", " "),
                KIND_KO.get(r.get("kind", ""), r.get("kind", "")),
                r.get("agent", ""),
                r.get("status", ""),
                r.get("note", "") or r.get("output", ""),
            ))

    def _schedule(self):
        self.refresh()
        self.root.after(REFRESH_MS, self._schedule)


def main():
    try:
        root = tk.Tk()
    except tk.TclError as e:
        print(f"디스플레이를 열 수 없습니다(GUI 환경 필요): {e}", file=sys.stderr)
        return 1
    Dashboard(root)
    root.mainloop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
