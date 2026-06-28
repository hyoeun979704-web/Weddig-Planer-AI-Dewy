// 종이 청첩장 인쇄 기하 — 접는선(fold)·재단(crop)·블리드(bleed) 계산(mm 단위).
// 전부 순수 함수 → 단위테스트로 검증(물리 인쇄 교정은 파트너 게이트). PDF 출력(exportPdf)이
// 이 좌표를 그대로 사용한다. 좌표계 = 페이지 좌상단 원점, 트림은 bleed 만큼 안쪽.

import type { InvitationPrintSpec } from "./types";

export interface MarkSegment {
  x1: number; y1: number; x2: number; y2: number;
  kind: "crop" | "fold";
}

/** 캔버스 픽셀 비율이 인쇄 mm 비율과 일치하는지(±tol). 인쇄 늘어짐/레터박스 방지 가드. */
export function printRatioMatches(
  canvasW: number,
  canvasH: number,
  print: Pick<InvitationPrintSpec, "wMm" | "hMm"> | undefined,
  tol = 0.005,
): boolean {
  if (!canvasW || !canvasH || !print?.wMm || !print?.hMm) return false;
  const canvasRatio = canvasW / canvasH;
  const printRatio = print.wMm / print.hMm;
  return Math.abs(canvasRatio - printRatio) / printRatio <= tol;
}

// 마크가 들어갈 여백(트림 바깥). bleed 보다 충분히 커서 마크가 페이지를 벗어나지 않게.
const MARK_RESERVE = 8; // mm
const MARK_LEN = 4; // mm — 마크 길이
const MARK_GAP = 1.5; // mm — 트림에서 약간 떨어뜨림(표준 crop mark)

/** 트림 바깥 여백(mm) = bleed + 마크 영역. 페이지는 트림보다 이만큼 사방으로 크다. */
export function outerMarginMm(print: InvitationPrintSpec): number {
  return (print.bleedMm ?? 0) + MARK_RESERVE;
}

/** 페이지 전체 크기 = 트림 + 양쪽 외곽 여백(마크 영역 포함). */
export function pageSizeMm(print: InvitationPrintSpec): { wMm: number; hMm: number } {
  const o = outerMarginMm(print);
  return { wMm: print.wMm + 2 * o, hMm: print.hMm + 2 * o };
}

/** 트림(완성) 사각 — 페이지 내 offset = 외곽 여백. 이미지가 놓이는 영역. */
export function trimRectMm(print: InvitationPrintSpec): { x: number; y: number; wMm: number; hMm: number } {
  const o = outerMarginMm(print);
  return { x: o, y: o, wMm: print.wMm, hMm: print.hMm };
}

/** 재단 마크 — 트림 네 모서리, 바깥 여백에. */
export function cropMarkSegments(print: InvitationPrintSpec): MarkSegment[] {
  const { x, y, wMm, hMm } = trimRectMm(print);
  const corners = [
    { cx: x, cy: y, sx: -1, sy: -1 },
    { cx: x + wMm, cy: y, sx: 1, sy: -1 },
    { cx: x, cy: y + hMm, sx: -1, sy: 1 },
    { cx: x + wMm, cy: y + hMm, sx: 1, sy: 1 },
  ];
  const segs: MarkSegment[] = [];
  for (const c of corners) {
    segs.push({ x1: c.cx + c.sx * MARK_GAP, y1: c.cy, x2: c.cx + c.sx * (MARK_GAP + MARK_LEN), y2: c.cy, kind: "crop" });
    segs.push({ x1: c.cx, y1: c.cy + c.sy * MARK_GAP, x2: c.cx, y2: c.cy + c.sy * (MARK_GAP + MARK_LEN), kind: "crop" });
  }
  return segs;
}

/** 접는선 마크 — 세로 접는선이면 트림 위/아래, 가로면 좌/우 bleed 영역에 tick. */
export function foldMarkSegments(print: InvitationPrintSpec): MarkSegment[] {
  const folds = print.folds ?? [];
  if (folds.length === 0) return [];
  const { x, y, wMm, hMm } = trimRectMm(print);
  const segs: MarkSegment[] = [];
  for (const f of folds) {
    if (f.axis === "v") {
      const fx = x + f.atMm;
      segs.push({ x1: fx, y1: y - MARK_GAP, x2: fx, y2: y - (MARK_GAP + MARK_LEN), kind: "fold" });
      segs.push({ x1: fx, y1: y + hMm + MARK_GAP, x2: fx, y2: y + hMm + (MARK_GAP + MARK_LEN), kind: "fold" });
    } else {
      const fy = y + f.atMm;
      segs.push({ x1: x - MARK_GAP, y1: fy, x2: x - (MARK_GAP + MARK_LEN), y2: fy, kind: "fold" });
      segs.push({ x1: x + wMm + MARK_GAP, y1: fy, x2: x + wMm + (MARK_GAP + MARK_LEN), y2: fy, kind: "fold" });
    }
  }
  return segs;
}

/** 접는선으로 나뉜 패널 경계(트림 기준 mm). 슬롯이 어느 패널인지 판정에 사용. */
export function panelBoundariesMm(print: InvitationPrintSpec): { vertical: number[]; horizontal: number[] } {
  const folds = print.folds ?? [];
  return {
    vertical: folds.filter((f) => f.axis === "v").map((f) => f.atMm).sort((a, b) => a - b),
    horizontal: folds.filter((f) => f.axis === "h").map((f) => f.atMm).sort((a, b) => a - b),
  };
}

/** 2단(bifold) 프리셋 — 펼침 256×182mm, 가운데 세로 접는선. 값 조정 가능. */
export function bifoldPrintSpec(
  openWmm = 256,
  openHmm = 182,
  bleedMm = 3,
  safeMarginMm = 5,
): InvitationPrintSpec {
  return { wMm: openWmm, hMm: openHmm, bleedMm, safeMarginMm, folds: [{ axis: "v", atMm: openWmm / 2, type: "score" }] };
}
