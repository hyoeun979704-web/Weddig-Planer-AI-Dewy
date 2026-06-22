import { describe, it, expect } from "vitest";
import {
  printRatioMatches,
  pageSizeMm,
  trimRectMm,
  cropMarkSegments,
  foldMarkSegments,
  panelBoundariesMm,
  bifoldPrintSpec,
} from "./foldGeometry";

describe("foldGeometry", () => {
  const bifold = bifoldPrintSpec(); // 256×182, bleed3, v-fold@128

  it("printRatioMatches: 캔버스 비율 == 인쇄 비율이면 true", () => {
    // 2단 샘플 캔버스 1280×910 의 비율이 펼침 256×182 와 정확히 일치
    expect(printRatioMatches(1280, 910, bifold)).toBe(true);
    expect(printRatioMatches(1000, 1000, bifold)).toBe(false);
    expect(printRatioMatches(0, 910, bifold)).toBe(false);
    expect(printRatioMatches(1280, 910, undefined)).toBe(false);
  });

  it("pageSizeMm: 트림 + 양쪽 외곽여백(bleed+8)", () => {
    // outer = 3 + 8 = 11 → page = 256+22 × 182+22
    expect(pageSizeMm(bifold)).toEqual({ wMm: 278, hMm: 204 });
  });

  it("trimRectMm: offset = 외곽여백, 크기 = 트림", () => {
    expect(trimRectMm(bifold)).toEqual({ x: 11, y: 11, wMm: 256, hMm: 182 });
  });

  it("cropMarkSegments: 모서리당 2개 = 8개, 전부 페이지 안", () => {
    const segs = cropMarkSegments(bifold);
    const page = pageSizeMm(bifold);
    expect(segs).toHaveLength(8);
    for (const s of segs) {
      for (const [x, y] of [[s.x1, s.y1], [s.x2, s.y2]]) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(page.wMm);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(page.hMm);
      }
    }
  });

  it("foldMarkSegments: 세로 접는선 1개 → 위/아래 2개, x=트림offset+접는위치", () => {
    const segs = foldMarkSegments(bifold);
    expect(segs).toHaveLength(2);
    expect(segs.every((s) => s.kind === "fold")).toBe(true);
    // 접는선 x = outer(11) + atMm(128) = 139
    expect(segs.every((s) => s.x1 === 139 && s.x2 === 139)).toBe(true);
  });

  it("foldMarkSegments: 접는선 없으면 빈 배열", () => {
    expect(foldMarkSegments({ wMm: 100, hMm: 148, bleedMm: 3 })).toEqual([]);
  });

  it("panelBoundariesMm: 2단은 세로 경계 [128]", () => {
    expect(panelBoundariesMm(bifold)).toEqual({ vertical: [128], horizontal: [] });
  });

  it("bifoldPrintSpec: 가운데 세로 접는선", () => {
    expect(bifold.folds).toEqual([{ axis: "v", atMm: 128, type: "score" }]);
    expect(bifold.wMm / bifold.hMm).toBeCloseTo(256 / 182, 5);
  });
});
