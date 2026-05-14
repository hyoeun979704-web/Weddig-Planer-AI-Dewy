import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import DOMPurify from "dompurify";

const PDF_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;900&family=Playfair+Display:wght@600;700&display=swap');
  * { font-family: 'Noto Sans KR', sans-serif; box-sizing: border-box; -webkit-font-smoothing: antialiased; }
  body { margin: 0; padding: 0; color: #1f2937; background: #ffffff; }

  .pdf-page { padding: 44px 40px 40px; max-width: 595px; margin: 0 auto; background: #ffffff; }

  /* Header */
  .pdf-header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 14px; margin-bottom: 28px; border-bottom: 1.5px solid #F4A7B9; }
  .pdf-logo-wrap { display: flex; align-items: center; gap: 8px; }
  .pdf-logo { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; color: #F4A7B9; letter-spacing: 0.5px; }
  .pdf-logo-sub { font-size: 9px; color: #9ca3af; letter-spacing: 1px; text-transform: uppercase; margin-top: -3px; }
  .pdf-date { font-size: 10px; color: #9ca3af; }

  /* Title block */
  .pdf-title { font-size: 24px; font-weight: 700; color: #1f2937; margin-bottom: 6px; letter-spacing: -0.5px; }
  .pdf-subtitle { font-size: 12px; color: #6b7280; margin-bottom: 22px; }

  /* Sections */
  .pdf-section { margin-bottom: 22px; }
  .pdf-section-title { font-size: 14px; font-weight: 700; color: #F4A7B9; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #fce4ec; letter-spacing: -0.3px; }

  /* Tables */
  .pdf-table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-bottom: 8px; }
  .pdf-table th { background: #fce4ec; color: #1f2937; font-weight: 600; padding: 9px 10px; text-align: left; border: 1px solid #f8bbd0; }
  .pdf-table td { padding: 8px 10px; border: 1px solid #f3f4f6; }
  .pdf-table tr:nth-child(even) td { background: #fafafa; }
  .pdf-table .total-row td { font-weight: 700; background: #fff0f3 !important; border-top: 1.5px solid #F4A7B9; }

  /* Info grid (overview cards) */
  .pdf-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
  .pdf-info-item { background: #fafafa; border: 1px solid #f3f4f6; border-radius: 10px; padding: 11px 13px; }
  .pdf-info-label { font-size: 9.5px; color: #9ca3af; margin-bottom: 3px; letter-spacing: 0.3px; }
  .pdf-info-value { font-size: 13px; font-weight: 600; color: #1f2937; }

  /* Timeline */
  .pdf-timeline { position: relative; padding-left: 6px; }
  .pdf-timeline-item { position: relative; padding-bottom: 14px; padding-left: 18px; border-left: 2px solid #f8bbd0; }
  .pdf-timeline-item:last-child { border-left-color: transparent; padding-bottom: 0; }
  .pdf-timeline-dot { position: absolute; left: -7px; top: 3px; width: 12px; height: 12px; border-radius: 50%; background: #F4A7B9; border: 2px solid #fff; box-shadow: 0 0 0 1px #f8bbd0; }
  .pdf-timeline-time { font-size: 11.5px; font-weight: 700; color: #F4A7B9; }
  .pdf-timeline-event { font-size: 12px; font-weight: 500; color: #1f2937; margin-top: 2px; }
  .pdf-timeline-note { font-size: 10px; color: #9ca3af; margin-top: 2px; line-height: 1.5; }

  /* Lists / Checklist */
  .pdf-checklist { list-style: none; padding: 0; margin: 0; }
  .pdf-checklist li { font-size: 11.5px; padding: 5px 0; padding-left: 22px; position: relative; line-height: 1.6; color: #374151; }
  .pdf-checklist li::before { content: '☐'; position: absolute; left: 0; top: 4px; color: #F4A7B9; font-weight: 700; font-size: 14px; }

  .pdf-bullet-list { list-style: none; padding: 0; margin: 0; }
  .pdf-bullet-list li { font-size: 11.5px; padding: 3px 0; padding-left: 14px; position: relative; line-height: 1.6; color: #374151; }
  .pdf-bullet-list li::before { content: '•'; position: absolute; left: 2px; color: #F4A7B9; font-weight: 700; }

  /* Callouts */
  .pdf-tip { background: #fff8e1; border-left: 3px solid #f59e0b; padding: 10px 14px; border-radius: 0 8px 8px 0; font-size: 11px; color: #78350f; margin: 8px 0; line-height: 1.6; }
  .pdf-warning { background: #fef2f2; border-left: 3px solid #ef4444; padding: 10px 14px; border-radius: 0 8px 8px 0; font-size: 11px; color: #7f1d1d; margin: 8px 0; line-height: 1.6; }
  .pdf-note { background: #eff6ff; border-left: 3px solid #3b82f6; padding: 10px 14px; border-radius: 0 8px 8px 0; font-size: 11px; color: #1e3a8a; margin: 8px 0; line-height: 1.6; }
  .pdf-highlight { background: #fff0f3; border: 1px solid #fce4ec; padding: 12px 16px; border-radius: 10px; margin: 10px 0; font-size: 11.5px; color: #374151; line-height: 1.6; }

  /* Misc */
  .pdf-badge { display: inline-block; background: #F4A7B9; color: #fff; font-size: 10px; font-weight: 600; padding: 2px 9px; border-radius: 10px; letter-spacing: 0.2px; }
  .pdf-divider { height: 1px; background: linear-gradient(90deg, transparent, #fce4ec, transparent); margin: 18px 0; }
  .pdf-stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 8px 0 14px; }
  .pdf-stat-item { text-align: center; padding: 10px 6px; background: #fafafa; border-radius: 10px; border: 1px solid #f3f4f6; }
  .pdf-stat-value { font-size: 16px; font-weight: 700; color: #F4A7B9; }
  .pdf-stat-label { font-size: 9.5px; color: #9ca3af; margin-top: 2px; }

  /* Footer */
  .pdf-footer { text-align: center; font-size: 9px; color: #9ca3af; padding-top: 18px; border-top: 1px solid #f3f4f6; margin-top: 28px; line-height: 1.6; }
  .pdf-footer-brand { color: #F4A7B9; font-weight: 600; }

  /* Couple tag in header */
  .pdf-couple-tag { font-size: 10.5px; color: #1f2937; font-weight: 600; margin-bottom: 2px; }
  /* Style badge next to title */
  .pdf-style-pill { display: inline-block; vertical-align: middle; margin-left: 8px; padding: 2px 9px; background: #fce4ec; color: #be185d; font-size: 11px; font-weight: 600; border-radius: 10px; letter-spacing: 0.2px; }
`;

export interface PdfHeaderOptions {
  /** "지유 ♥ 민호" 같은 커플 표시. 헤더 우측 상단에 작게 노출 */
  couple?: string;
  /** 예식일 (YYYY-MM-DD). 커플과 함께 표시 */
  weddingDate?: string;
  /** "셀프웨딩"/"스몰웨딩"/"일반 결혼식" 등 스타일 배지 */
  styleLabel?: string;
}

export function generatePdfHeader(title: string, subtitle?: string, opts: PdfHeaderOptions = {}): string {
  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;
  const coupleLine = opts.couple || opts.weddingDate
    ? `<div class="pdf-couple-tag">${opts.couple ?? ""}${opts.couple && opts.weddingDate ? " · " : ""}${opts.weddingDate ?? ""}</div>`
    : "";
  return `
    <style>${PDF_STYLES}</style>
    <div class="pdf-page">
      <div class="pdf-header">
        <div class="pdf-logo-wrap">
          <div>
            <div class="pdf-logo">Dewy</div>
            <div class="pdf-logo-sub">Wedding Planner</div>
          </div>
        </div>
        <div style="text-align:right;">
          ${coupleLine}
          <div class="pdf-date">발행일 ${dateStr}</div>
        </div>
      </div>
      <div class="pdf-title">${title}${opts.styleLabel ? ` <span class="pdf-style-pill">${opts.styleLabel}</span>` : ""}</div>
      ${subtitle ? `<div class="pdf-subtitle">${subtitle}</div>` : ""}
  `;
}

export function generatePdfFooter(): string {
  return `
      <div class="pdf-footer">
        <span class="pdf-footer-brand">Dewy Wedding Planner</span> · 본 문서는 참고용 자료이며, 실제 진행 시 업체 안내를 우선해주세요.<br/>
        © Dewy · dewywedding.com
      </div>
    </div>
  `;
}

export function pdfInfoGrid(items: { label: string; value: string }[]): string {
  return `<div class="pdf-info-grid">${items
    .map(
      (it) =>
        `<div class="pdf-info-item"><div class="pdf-info-label">${it.label}</div><div class="pdf-info-value">${it.value}</div></div>`,
    )
    .join("")}</div>`;
}

export function pdfStatRow(items: { value: string; label: string }[]): string {
  return `<div class="pdf-stat-row">${items
    .map(
      (it) =>
        `<div class="pdf-stat-item"><div class="pdf-stat-value">${it.value}</div><div class="pdf-stat-label">${it.label}</div></div>`,
    )
    .join("")}</div>`;
}

export function pdfSection(title: string, body: string): string {
  return `<div class="pdf-section"><div class="pdf-section-title">${title}</div>${body}</div>`;
}

export async function downloadPdf(htmlContent: string, filename: string): Promise<void> {
  const container = document.createElement("div");
  container.innerHTML = DOMPurify.sanitize(htmlContent);
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = pdfWidth / imgWidth;
    const scaledHeight = imgHeight * ratio;

    let heightLeft = scaledHeight;
    let position = 0;

    pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, scaledHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position -= pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, scaledHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}
