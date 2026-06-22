import jsPDF from "jspdf";
import type { InvitationPrintSpec } from "./types";
import { pageSizeMm, trimRectMm, cropMarkSegments, foldMarkSegments } from "./foldGeometry";

/**
 * Konva 캔버스 → PDF 다운로드.
 *
 * 종이 청첩장 기본 크기 가정: 130×190mm (A6 근사). canvas.w / canvas.h 비율
 * 그대로 PDF 페이지에 박아 넣는다. 300dpi 인쇄 품질 확보를 위해
 * pixelRatio = 3 으로 캔버스를 추출.
 */
export function exportInvitationPdf(
  dataUrl: string,
  canvasW: number,
  canvasH: number,
  filename: string,
  printWmm?: number,
  printHmm?: number,
) {
  // mm 단위로 페이지 크기 결정 (캔버스 픽셀 → A6 비율 유지)
  // 기본 폭 130mm, 비율에 맞춰 높이 자동 계산.
  // 커스텀 format 을 지정하므로 orientation 인자는 무시되거나 충돌 가능 →
  // 명시적으로 빼고 jsPDF 가 format 만 보고 페이지 크기를 결정하게 둔다.
  const pageWmm = printWmm ?? 130;
  const pageHmm = printHmm ?? (canvasH / canvasW) * pageWmm;

  const pdf = new jsPDF({
    unit: "mm",
    format: [pageWmm, pageHmm],
  });

  pdf.addImage(dataUrl, "PNG", 0, 0, pageWmm, pageHmm, undefined, "FAST");
  pdf.save(filename);
}

export interface PdfPage {
  dataUrl: string;
  /** 캔버스 픽셀 폭/높이 (페이지 비율 계산용) */
  w: number;
  h: number;
  printWmm?: number;
  printHmm?: number;
}

export function pixelRatioForPrint(
  displayWidth: number,
  printWmm?: number,
  dpi = 300,
) {
  if (!printWmm) return 3;
  return Math.max(3, (printWmm / 25.4) * dpi / displayWidth);
}

/**
 * 다중 페이지 PDF (전면 + 후면 등).
 *
 * 각 페이지를 자신의 캔버스 비율에 맞춰 130mm 폭 기준으로 박는다.
 * 페이지마다 크기가 달라도 addPage 에 개별 format 을 지정해 비율을 유지.
 */
export function exportInvitationPdfPages(pages: PdfPage[], filename: string) {
  const valid = pages.filter((p) => p.dataUrl && p.w > 0 && p.h > 0);
  if (valid.length === 0) return;
  if (valid.length === 1) {
    return exportInvitationPdf(
      valid[0].dataUrl,
      valid[0].w,
      valid[0].h,
      filename,
      valid[0].printWmm,
      valid[0].printHmm,
    );
  }

  const widthOf = (p: PdfPage) => p.printWmm ?? 130;
  const heightOf = (p: PdfPage) => p.printHmm ?? (p.h / p.w) * widthOf(p);

  const pdf = new jsPDF({ unit: "mm", format: [widthOf(valid[0]), heightOf(valid[0])] });
  valid.forEach((p, i) => {
    const wmm = widthOf(p);
    const hmm = heightOf(p);
    if (i > 0) pdf.addPage([wmm, hmm]);
    pdf.addImage(p.dataUrl, "PNG", 0, 0, wmm, hmm, undefined, "FAST");
  });
  pdf.save(filename);
}

/** PDF 위에 재단/접는 마크를 그린다(bleed 영역). 좌표는 foldGeometry 가 계산. */
function drawPrintMarks(pdf: jsPDF, print: InvitationPrintSpec) {
  const segs = [...cropMarkSegments(print), ...foldMarkSegments(print)];
  if (segs.length === 0) return;
  pdf.setLineWidth(0.1);
  const setDash = (pdf as unknown as { setLineDashPattern?: (p: number[], n: number) => void }).setLineDashPattern?.bind(pdf);
  for (const s of segs) {
    if (s.kind === "fold") {
      setDash?.([1, 1], 0);
      pdf.setDrawColor(120); // 접는선 = 회색 점선
    } else {
      setDash?.([], 0);
      pdf.setDrawColor(0); // 재단선 = 검정 실선
    }
    pdf.line(s.x1, s.y1, s.x2, s.y2);
  }
  setDash?.([], 0);
}

/**
 * 인쇄용 PDF — 트림 + bleed 페이지에 이미지를 박고 재단/접는 마크를 그린다.
 * 접이식(2단/3단)·다이컷 등 인쇄소 입고용. 각 페이지는 자기 InvitationPrintSpec 를 가진다.
 */
export function exportInvitationPrintPdf(
  pages: { dataUrl: string; print: InvitationPrintSpec }[],
  filename: string,
) {
  const valid = pages.filter((p) => p.dataUrl && p.print?.wMm > 0 && p.print?.hMm > 0);
  if (valid.length === 0) return;
  const first = pageSizeMm(valid[0].print);
  const pdf = new jsPDF({ unit: "mm", format: [first.wMm, first.hMm] });
  valid.forEach((p, i) => {
    const size = pageSizeMm(p.print);
    if (i > 0) pdf.addPage([size.wMm, size.hMm]);
    const trim = trimRectMm(p.print);
    pdf.addImage(p.dataUrl, "PNG", trim.x, trim.y, trim.wMm, trim.hMm, undefined, "FAST");
    drawPrintMarks(pdf, p.print);
  });
  pdf.save(filename);
}
