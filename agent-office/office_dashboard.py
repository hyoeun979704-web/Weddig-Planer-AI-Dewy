"""Dewy 에이전트 오피스 — 운영 대시보드(네이티브 창).

플로우 재생이 아니라 '현황판'. runs.jsonl(실행 이력)을 읽어 KPI·에이전트 상태·최근 작업을
보여주고, 산출물(초안·이미지)을 미리보기 + 복사 + 다운로드 + 열기 할 수 있다.
tkinter 기본 포함이라 추가 설치 없음.

실행:
    python office_dashboard.py
    python runlog.py --seed   # (선택) 데모 데이터 — 창의 버튼으로도 가능
"""

import os
import shutil
import subprocess
import sys
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

import runlog

BG = "#FDF8F6"; CARD = "#FFFFFF"; LINE = "#F0E2E7"; PINK = "#F4A7B9"
INK = "#3A2E33"; MUTED = "#9B8E93"
COL = {"done": "#22A06B", "ok": "#22A06B", "fail": "#E0567A", "idle": "#B9ADB2", "off": "#C9BEC3"}

AGENTS = [
    ("🧭", "총괄 관리자", "Haiku", False),
    ("✍", "마케팅 카피", "Sonnet", False),
    ("🎨", "시각 디자이너", "Higgsfield", False),
    ("🛟", "CS 상담", "(로드맵)", True),
    ("🔒", "보안 검토", "(로드맵)", True),
]
KIND_KO = {"routing": "라우팅", "marketing": "마케팅", "visual": "시각", "": "-"}
REFRESH_MS = 5000


def open_in_os(path: str):
    """OS 기본 앱으로 파일 열기(크로스 플랫폼)."""
    try:
        if os.name == "nt":
            os.startfile(path)  # type: ignore[attr-defined]
        elif sys.platform == "darwin":
            subprocess.run(["open", path], check=False)
        else:
            subprocess.run(["xdg-open", path], check=False)
    except Exception as e:  # noqa: BLE001
        messagebox.showerror("열기 실패", str(e))


class Dashboard:
    def __init__(self, root):
        self.root = root
        root.title("Dewy 에이전트 오피스 · 대시보드")
        root.configure(bg=BG)
        root.geometry("1000x720")
        self.outputs: list[dict] = []
        self.selected: dict | None = None
        self._thumb = None  # PhotoImage 참조 유지(GC 방지)

        head = tk.Frame(root, bg=BG); head.pack(fill="x", padx=18, pady=(14, 6))
        tk.Label(head, text="📊 Dewy 에이전트 오피스 — 대시보드", font=("Segoe UI", 16, "bold"),
                 bg=BG, fg=INK).pack(side="left")
        tk.Button(head, text="데모 데이터", command=self._seed, bg=CARD, fg=MUTED,
                  relief="flat", font=("Segoe UI", 10, "bold")).pack(side="right", padx=4)
        tk.Button(head, text="↻ 새로고침", command=self.refresh, bg=PINK, fg="#5A2233",
                  relief="flat", font=("Segoe UI", 10, "bold")).pack(side="right", padx=4)

        # KPI
        self.kpis = {}
        krow = tk.Frame(root, bg=BG); krow.pack(fill="x", padx=14)
        for key, label in [("today", "오늘 작업"), ("total", "총 작업"),
                           ("drafts", "초안"), ("assets", "시각자산"), ("fail", "실패")]:
            c = tk.Frame(krow, bg=CARD, highlightbackground=LINE, highlightthickness=1)
            c.pack(side="left", expand=True, fill="x", padx=4, pady=6)
            v = tk.Label(c, text="0", font=("Segoe UI", 20, "bold"), bg=CARD, fg=INK)
            v.pack(anchor="w", padx=12, pady=(8, 0))
            tk.Label(c, text=label, font=("Segoe UI", 9), bg=CARD, fg=MUTED).pack(anchor="w", padx=12, pady=(0, 8))
            self.kpis[key] = v

        # 에이전트
        tk.Label(root, text="에이전트 현황", font=("Segoe UI", 11, "bold"), bg=BG, fg=MUTED).pack(anchor="w", padx=20, pady=(6, 2))
        grid = tk.Frame(root, bg=BG); grid.pack(fill="x", padx=14)
        self.agent_cards = {}
        for emoji, name, model, off in AGENTS:
            c = tk.Frame(grid, bg=CARD, highlightbackground=LINE, highlightthickness=1)
            c.pack(side="left", expand=True, fill="x", padx=4, pady=4)
            tk.Label(c, text=f"{emoji} {name}", font=("Segoe UI", 10, "bold"), bg=CARD, fg=INK).pack(anchor="w", padx=10, pady=(8, 0))
            cnt = tk.Label(c, text="0건", font=("Segoe UI", 13, "bold"), bg=CARD, fg=INK)
            cnt.pack(anchor="w", padx=10)
            stt = tk.Label(c, text="🚫 미가동" if off else "💤 대기", font=("Segoe UI", 9), bg=CARD, fg=MUTED)
            stt.pack(anchor="w", padx=10, pady=(0, 8))
            self.agent_cards[name] = (cnt, stt, off)

        # 하단: 좌(최근 작업) · 우(산출물)
        bottom = tk.Frame(root, bg=BG); bottom.pack(fill="both", expand=True, padx=14, pady=(8, 14))

        left = tk.Frame(bottom, bg=BG); left.pack(side="left", fill="both", expand=True, padx=(0, 6))
        tk.Label(left, text="최근 작업", font=("Segoe UI", 11, "bold"), bg=BG, fg=MUTED).pack(anchor="w", padx=6)
        cols = ("ts", "kind", "agent", "note")
        self.tree = ttk.Treeview(left, columns=cols, show="headings", height=9)
        for c, w, t in [("ts", 110, "시각"), ("kind", 60, "종류"), ("agent", 100, "에이전트"), ("note", 230, "내용")]:
            self.tree.heading(c, text=t); self.tree.column(c, width=w, anchor="w")
        self.tree.pack(fill="both", expand=True)

        right = tk.Frame(bottom, bg=BG); right.pack(side="left", fill="both", expand=True, padx=(6, 0))
        tk.Label(right, text="산출물 (초안 · 이미지)", font=("Segoe UI", 11, "bold"), bg=BG, fg=MUTED).pack(anchor="w", padx=6)
        self.outlist = tk.Listbox(right, height=5, bg=CARD, fg=INK, relief="flat",
                                  highlightthickness=1, highlightbackground=LINE, font=("Segoe UI", 10))
        self.outlist.pack(fill="x")
        self.outlist.bind("<<ListboxSelect>>", self._on_select)

        btns = tk.Frame(right, bg=BG); btns.pack(fill="x", pady=4)
        for txt, cmd in [("📋 복사", self.copy_selected), ("⬇ 다운로드", self.download_selected), ("↗ 열기", self.open_selected)]:
            tk.Button(btns, text=txt, command=cmd, bg=CARD, fg=INK, relief="flat",
                      font=("Segoe UI", 9, "bold"), highlightbackground=LINE).pack(side="left", padx=(0, 6))

        self.preview = tk.Text(right, height=8, bg=CARD, fg=INK, relief="flat", wrap="word",
                               font=("Consolas", 9), highlightthickness=1, highlightbackground=LINE)
        self.preview.pack(fill="both", expand=True)
        self.preview.configure(state="disabled")
        self.thumb_label = tk.Label(right, bg=CARD)  # 이미지 썸네일용(필요 시 표시)

        self.refresh()
        self._schedule()

    # ── 데이터 ────────────────────────────────────────────────────────────────
    def _seed(self):
        runlog.seed_demo(); self.refresh()

    def refresh(self):
        s = runlog.stats()
        for k, lbl in self.kpis.items():
            lbl.config(text=str(s.get(k, 0)))
        for name, (cnt, stt, off) in self.agent_cards.items():
            cnt.config(text=f"{s['by_agent'].get(name, 0)}건")
            if off:
                stt.config(text="🚫 미가동", fg=COL["off"]); continue
            last = s["last_by_agent"].get(name)
            stt.config(text=(f"✅ {last['ts'][11:16]} {last.get('note','')[:12]}" if last else "💤 대기"),
                       fg=COL.get(last.get("status", "idle") if last else "idle", MUTED))
        self.tree.delete(*self.tree.get_children())
        for r in s["recent"]:
            self.tree.insert("", "end", values=(
                r.get("ts", "")[5:16].replace("T", " "),
                KIND_KO.get(r.get("kind", ""), r.get("kind", "")),
                r.get("agent", ""), r.get("note", "") or r.get("output", "")))
        # 산출물 목록
        self.outputs = runlog.list_outputs()
        self.outlist.delete(0, "end")
        for o in self.outputs:
            icon = "📄" if o["kind"] == "draft" else "🖼"
            self.outlist.insert("end", f"{icon} {o['name']}")
        if not self.outputs:
            self.outlist.insert("end", "(산출물 없음 — 파이프라인 실행 시 생성)")

    # ── 산출물 ────────────────────────────────────────────────────────────────
    def _on_select(self, _evt=None):
        sel = self.outlist.curselection()
        if not sel or sel[0] >= len(self.outputs):
            self.selected = None
            return
        self.selected = self.outputs[sel[0]]
        self._show_preview(self.selected)

    def _show_preview(self, o: dict):
        self.preview.configure(state="normal")
        self.preview.delete("1.0", "end")
        self.thumb_label.pack_forget()
        if o["kind"] == "draft":
            try:
                self.preview.insert("1.0", open(o["path"], encoding="utf-8").read())
            except Exception as e:  # noqa: BLE001
                self.preview.insert("1.0", f"(미리보기 실패: {e})")
        else:
            self.preview.insert("1.0", f"🖼 이미지: {o['name']}\n경로: {o['path']}\n\n'열기'로 기본 뷰어에서 확인하세요.")
            # PNG/GIF 는 썸네일 시도(Tk 8.6+). 실패해도 무시.
            try:
                img = tk.PhotoImage(file=o["path"])
                factor = max(1, img.width() // 280)
                self._thumb = img.subsample(factor, factor)
                self.thumb_label.config(image=self._thumb)
                self.thumb_label.pack(pady=6)
            except Exception:
                pass
        self.preview.configure(state="disabled")

    def copy_selected(self):
        if not self.selected:
            return
        o = self.selected
        text = ""
        if o["kind"] == "draft":
            try:
                text = open(o["path"], encoding="utf-8").read()
            except Exception:
                text = o["path"]
        else:
            text = o["path"]  # 이미지는 경로 복사
        self.root.clipboard_clear()
        self.root.clipboard_append(text)
        messagebox.showinfo("복사됨", "초안 본문" if o["kind"] == "draft" else "이미지 경로")

    def download_selected(self):
        if not self.selected:
            return
        o = self.selected
        dest = filedialog.asksaveasfilename(initialfile=o["name"],
                                            defaultextension=os.path.splitext(o["name"])[1])
        if not dest:
            return
        try:
            shutil.copy(o["path"], dest)
            messagebox.showinfo("저장됨", dest)
        except Exception as e:  # noqa: BLE001
            messagebox.showerror("저장 실패", str(e))

    def open_selected(self):
        if self.selected:
            open_in_os(self.selected["path"])

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
