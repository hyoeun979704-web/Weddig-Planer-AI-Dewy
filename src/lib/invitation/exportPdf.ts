import jsPDF from "jspdf";

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
) {
  // mm 단위로 페이지 크기 결정 (캔버스 픽셀 → A6 비율 유지)
  // 기본 폭 130mm, 비율에 맞춰 높이 자동 계산.
  // 커스텀 format 을 지정하므로 orientation 인자는 무시되거나 충돌 가능 →
  // 명시적으로 빼고 jsPDF 가 format 만 보고 페이지 크기를 결정하게 둔다.
  const pageWmm = 130;
  const pageHmm = (canvasH / canvasW) * pageWmm;

  const pdf = new jsPDF({
    unit: "mm",
    format: [pageWmm, pageHmm],
  });

  pdf.addImage(dataUrl, "PNG", 0, 0, pageWmm, pageHmm, undefined, "FAST");
  pdf.save(filename);
}
