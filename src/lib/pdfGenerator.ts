import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

const PDF_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
  * { font-family: 'Noto Sans KR', sans-serif; box-sizing: border-box; }
  body { margin: 0; padding: 0; color: #1a1a1a; }
  .pdf-page { padding: 40px 36px; max-width: 595px; margin: 0 auto; }
  .pdf-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #F4A7B9; padding-bottom: 12px; margin-bottom: 24px; }
  .pdf-logo { font-size: 20px; font-weight: 700; color: #F4A7B9; }
  .pdf-date { font-size: 11px; color: #888; }
  .pdf-title { font-size: 22px; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; }
  .pdf-subtitle { font-size: 13px; color: #666; margin-bottom: 20px; }
  .pdf-section { margin-bottom: 20px; }
  .pdf-section-title { font-size: 14px; font-weight: 700; color: #F4A7B9; margin-bottom: 10px; padding-bottom: 4px; border-bottom: 1px solid #fce4ec; }
  .pdf-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 12px; }
  .pdf-table th { background: #fce4ec; color: #1a1a1a; font-weight: 600; padding: 8px 10px; text-align: left; border: 1px solid #f8bbd0; }
  .pdf-table td { padding: 7px 10px; border: 1px solid #eee; }
  .pdf-table tr:nth-child(even) td { background: #fafafa; }
  .pdf-table .total-row { font-weight: 700; background: #fff0f3 !important; }
  .pdf-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
  .pdf-info-item { background: #fafafa; border-radius: 8px; padding: 10px 12px; }
  .pdf-info-label { font-size: 10px; color: #888; margin-bottom: 2px; }
  .pdf-info-value { font-size: 13px; font-weight: 600; }
  .pdf-timeline { position: relative; padding-left: 20px; }
  .pdf-timeline-item { position: relative; padding-bottom: 16px; padding-left: 16px; border-left: 2px solid #f8bbd0; }
  .pdf-timeline-item:last-child { border-left-color: transparent; }
  .pdf-timeline-dot { position: absolute; left: -7px; top: 2px; width: 12px; height: 12px; border-radius: 50%; background: #F4A7B9; border: 2px solid #fff; }
  .pdf-timeline-time { font-size: 12px; font-weight: 700; color: #F4A7B9; }
  .pdf-timeline-event { font-size: 12px; font-weight: 500; margin-top: 2px; }
  .pdf-timeline-note { font-size: 10px; color: #888; margin-top: 1px; }
  .pdf-checklist { list-style: none; padding: 0; }
  .pdf-checklist li { font-size: 12px; padding: 4px 0; padding-left: 20px; position: relative; }
  .pdf-checklist li::before { content: '□'; position: absolute; left: 0; color: #F4A7B9; font-weight: 700; }
  .pdf-tip { background: #fff8e1; border-left: 3px solid #ffb300; padding: 10px 14px; border-radius: 0 8px 8px 0; font-size: 11px; color: #5d4037; margin: 10px 0; }
  .pdf-warning { background: #fff3e0; border-left: 3px solid #ff9800; padding: 10px 14px; border-radius: 0 8px 8px 0; font-size: 11px; color: #5d4037; margin: 10px 0; }
  .pdf-footer { text-align: center; font-size: 9px; color: #aaa; padding-top: 16px; border-top: 1px solid #eee; margin-top: 24px; }
  .pdf-badge { display: inline-block; background: #F4A7B9; color: #fff; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 10px; }
  .pdf-highlight { background: #fff0f3; padding: 12px 16px; border-radius: 10px; margin: 10px 0; }
`;

export function generatePdfHeader(title: string): string {
  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;
  return `
    <style>${PDF_STYLES}</style>
    <div class="pdf-page">
      <div class="pdf-header">
        <div class="pdf-logo">🌿 Dewy</div>
        <div class="pdf-date">${dateStr}</div>
      </div>
      <div class="pdf-title">${title}</div>
  `;
}

export function generatePdfFooter(): string {
  return `
      <div class="pdf-footer">
        © Dewy Wedding Planner · 이 문서는 AI가 생성했으며 참고용입니다.
      </div>
    </div>
  `;
}

export async function downloadPdf(htmlContent: string, filename: string): Promise<void> {
  const container = document.createElement("div");
  container.innerHTML = htmlContent;
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
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
