import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import DOMPurify from "dompurify";

// ---------------------------------------------------------------------------
// 프리미엄 인쇄물 톤을 노린 PDF 스타일.
// - 컬러: 부드러운 핑크/로즈 그라데이션 + 차분한 그레이
// - 헤딩: Cormorant Garamond (Serif, 굵게)
// - 본문: Noto Sans KR (한글 가독성)
// - 강조: Playfair Display (Dewy 브랜드 로고)
// ---------------------------------------------------------------------------
const PDF_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;900&family=Noto+Serif+KR:wght@400;500;600;700&family=Playfair+Display:wght@600;700;900&family=Cormorant+Garamond:wght@300;400;500;600;700&display=swap');
  * { box-sizing: border-box; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  body { margin: 0; padding: 0; color: #1f2937; background: #ffffff; font-family: 'Noto Sans KR', sans-serif; }

  .pdf-page { padding: 48px 44px 44px; max-width: 595px; margin: 0 auto; background: #ffffff; }

  /* ============ Cover Page (첫 페이지) ============ */
  .pdf-cover { position: relative; max-width: 595px; min-height: 842px; margin: 0 auto; padding: 64px 48px 56px; background: linear-gradient(165deg, #fff5f7 0%, #ffffff 50%, #fef8fa 100%); overflow: hidden; page-break-after: always; display: flex; flex-direction: column; }
  .pdf-cover::before { content: ''; position: absolute; top: -80px; right: -80px; width: 280px; height: 280px; border-radius: 50%; background: radial-gradient(circle, rgba(244,167,185,0.18) 0%, rgba(244,167,185,0) 70%); }
  .pdf-cover::after { content: ''; position: absolute; bottom: -120px; left: -60px; width: 320px; height: 320px; border-radius: 50%; background: radial-gradient(circle, rgba(252,228,236,0.35) 0%, rgba(252,228,236,0) 70%); }

  .pdf-cover-top { display: flex; justify-content: space-between; align-items: flex-start; position: relative; z-index: 2; margin-bottom: 80px; }
  .pdf-cover-logo { font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 700; color: #F4A7B9; letter-spacing: 1px; }
  .pdf-cover-logo-sub { font-family: 'Cormorant Garamond', serif; font-size: 11px; color: #9ca3af; letter-spacing: 3px; text-transform: uppercase; margin-top: -4px; }
  .pdf-cover-meta { text-align: right; font-family: 'Cormorant Garamond', serif; font-size: 12px; color: #9ca3af; letter-spacing: 1px; }

  .pdf-cover-center { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; position: relative; z-index: 2; text-align: center; }
  .pdf-cover-eyebrow { font-family: 'Cormorant Garamond', serif; font-size: 13px; color: #be185d; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 32px; }
  .pdf-cover-eyebrow::before, .pdf-cover-eyebrow::after { content: ''; display: inline-block; width: 28px; height: 1px; background: #F4A7B9; vertical-align: middle; margin: 0 14px; }

  .pdf-cover-couple { font-family: 'Cormorant Garamond', serif; font-size: 56px; font-weight: 500; color: #1f2937; line-height: 1.15; letter-spacing: 0.5px; margin: 0 0 12px; }
  .pdf-cover-couple-amp { font-style: italic; color: #F4A7B9; font-weight: 400; margin: 0 14px; }

  .pdf-cover-date { font-family: 'Cormorant Garamond', serif; font-size: 18px; color: #6b7280; letter-spacing: 4px; margin-bottom: 56px; }

  .pdf-cover-doc-type { font-family: 'Noto Serif KR', serif; font-size: 30px; font-weight: 600; color: #1f2937; letter-spacing: -1px; margin: 0 0 14px; }
  .pdf-cover-doc-sub { font-size: 13px; color: #6b7280; max-width: 360px; line-height: 1.7; }

  .pdf-cover-style-badge { display: inline-block; margin-top: 32px; padding: 8px 22px; background: #ffffff; border: 1.5px solid #F4A7B9; color: #be185d; font-size: 12px; font-weight: 600; border-radius: 22px; letter-spacing: 0.5px; }

  .pdf-cover-bottom { position: relative; z-index: 2; text-align: center; padding-top: 32px; border-top: 1px solid rgba(244,167,185,0.3); }
  .pdf-cover-bottom-text { font-family: 'Cormorant Garamond', serif; font-size: 11px; color: #9ca3af; letter-spacing: 3px; text-transform: uppercase; }

  /* ============ 일반 본문 페이지 ============ */
  .pdf-header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 16px; margin-bottom: 32px; border-bottom: 1.5px solid #F4A7B9; }
  .pdf-logo { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; color: #F4A7B9; letter-spacing: 0.5px; }
  .pdf-logo-sub { font-family: 'Cormorant Garamond', serif; font-size: 9px; color: #9ca3af; letter-spacing: 2px; text-transform: uppercase; margin-top: -3px; }
  .pdf-date { font-size: 10px; color: #9ca3af; font-family: 'Cormorant Garamond', serif; letter-spacing: 0.5px; }
  .pdf-couple-tag { font-size: 11px; color: #1f2937; font-weight: 600; margin-bottom: 3px; font-family: 'Cormorant Garamond', serif; letter-spacing: 0.5px; }

  /* Page title (under header) */
  .pdf-title { font-family: 'Noto Serif KR', serif; font-size: 26px; font-weight: 700; color: #1f2937; margin-bottom: 6px; letter-spacing: -0.5px; }
  .pdf-subtitle { font-size: 12px; color: #6b7280; margin-bottom: 26px; line-height: 1.6; }
  .pdf-style-pill { display: inline-block; vertical-align: middle; margin-left: 10px; padding: 3px 11px; background: linear-gradient(135deg, #fce4ec, #fff0f3); color: #be185d; font-size: 11px; font-weight: 600; border-radius: 11px; letter-spacing: 0.2px; }

  /* Sections */
  .pdf-section { margin-bottom: 26px; }
  .pdf-section-title { font-family: 'Noto Serif KR', serif; font-size: 15px; font-weight: 700; color: #1f2937; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1.5px solid #F4A7B9; letter-spacing: -0.3px; display: flex; align-items: center; gap: 6px; }
  .pdf-section-title::before { content: ''; display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #F4A7B9; flex-shrink: 0; }

  /* Tables */
  .pdf-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 11.5px; margin-bottom: 8px; border-radius: 8px; overflow: hidden; border: 1px solid #f3f4f6; }
  .pdf-table th { background: linear-gradient(135deg, #fce4ec, #fff0f3); color: #831843; font-weight: 700; padding: 11px 12px; text-align: left; border-bottom: 1px solid #f8bbd0; }
  .pdf-table td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; }
  .pdf-table tr:last-child td { border-bottom: 0; }
  .pdf-table tr:nth-child(even) td { background: #fafafa; }
  .pdf-table .total-row td { font-weight: 700; background: #fff0f3 !important; border-top: 2px solid #F4A7B9; }

  /* Info grid */
  .pdf-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px; }
  .pdf-info-item { background: linear-gradient(135deg, #ffffff, #fafafa); border: 1px solid #f3f4f6; border-radius: 12px; padding: 13px 15px; }
  .pdf-info-label { font-size: 9.5px; color: #9ca3af; margin-bottom: 4px; letter-spacing: 0.5px; text-transform: uppercase; font-family: 'Cormorant Garamond', serif; }
  .pdf-info-value { font-size: 14px; font-weight: 600; color: #1f2937; }

  /* Timeline */
  .pdf-timeline { position: relative; padding-left: 8px; }
  .pdf-timeline-item { position: relative; padding-bottom: 16px; padding-left: 22px; border-left: 2px solid #fce4ec; }
  .pdf-timeline-item:last-child { border-left-color: transparent; padding-bottom: 0; }
  .pdf-timeline-dot { position: absolute; left: -8px; top: 4px; width: 14px; height: 14px; border-radius: 50%; background: linear-gradient(135deg, #F4A7B9, #ec4899); border: 3px solid #fff; box-shadow: 0 0 0 1px #f8bbd0; }
  .pdf-timeline-time { font-size: 12px; font-weight: 700; color: #be185d; font-family: 'Cormorant Garamond', serif; letter-spacing: 0.5px; }
  .pdf-timeline-event { font-size: 12.5px; font-weight: 600; color: #1f2937; margin-top: 3px; }
  .pdf-timeline-note { font-size: 10.5px; color: #9ca3af; margin-top: 3px; line-height: 1.6; }

  /* Lists / Checklist */
  .pdf-checklist { list-style: none; padding: 0; margin: 0; }
  .pdf-checklist li { font-size: 12px; padding: 6px 0; padding-left: 26px; position: relative; line-height: 1.65; color: #374151; }
  .pdf-checklist li::before { content: ''; position: absolute; left: 0; top: 8px; width: 14px; height: 14px; border: 1.5px solid #F4A7B9; border-radius: 3px; background: #fff; }

  .pdf-bullet-list { list-style: none; padding: 0; margin: 0; }
  .pdf-bullet-list li { font-size: 12px; padding: 4px 0; padding-left: 16px; position: relative; line-height: 1.65; color: #374151; }
  .pdf-bullet-list li::before { content: '•'; position: absolute; left: 2px; top: 4px; color: #F4A7B9; font-weight: 700; font-size: 16px; line-height: 1; }

  /* Callouts */
  .pdf-tip { background: linear-gradient(135deg, #fff8e1, #fffaf0); border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 0 10px 10px 0; font-size: 11.5px; color: #78350f; margin: 10px 0; line-height: 1.65; }
  .pdf-warning { background: linear-gradient(135deg, #fef2f2, #fff5f5); border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 0 10px 10px 0; font-size: 11.5px; color: #7f1d1d; margin: 10px 0; line-height: 1.65; }
  .pdf-note { background: linear-gradient(135deg, #eff6ff, #f5f9ff); border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 0 10px 10px 0; font-size: 11.5px; color: #1e3a8a; margin: 10px 0; line-height: 1.65; }
  .pdf-highlight { background: linear-gradient(135deg, #fff0f3, #fef8fa); border: 1px solid #fce4ec; padding: 14px 18px; border-radius: 12px; margin: 12px 0; font-size: 12px; color: #374151; line-height: 1.65; }

  /* Misc visual */
  .pdf-divider { height: 1px; background: linear-gradient(90deg, transparent, #fce4ec 30%, #F4A7B9 50%, #fce4ec 70%, transparent); margin: 22px 0; position: relative; }
  .pdf-divider::after { content: '◆'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #ffffff; padding: 0 10px; color: #F4A7B9; font-size: 10px; }

  /* Stat row */
  .pdf-stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 10px 0 18px; }
  .pdf-stat-item { text-align: center; padding: 14px 8px; background: linear-gradient(135deg, #ffffff, #fef8fa); border-radius: 12px; border: 1px solid #fce4ec; }
  .pdf-stat-value { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 700; color: #be185d; letter-spacing: -0.5px; }
  .pdf-stat-label { font-size: 10px; color: #6b7280; margin-top: 4px; letter-spacing: 0.3px; }

  /* Bar chart */
  .pdf-bar-chart { margin: 12px 0 14px; }
  .pdf-bar-row { display: grid; grid-template-columns: 100px 1fr 80px; gap: 10px; align-items: center; margin-bottom: 8px; font-size: 11px; }
  .pdf-bar-label { color: #374151; font-weight: 500; }
  .pdf-bar-track { height: 10px; background: #f9fafb; border-radius: 5px; overflow: hidden; position: relative; border: 1px solid #f3f4f6; }
  .pdf-bar-fill { height: 100%; background: linear-gradient(90deg, #F4A7B9, #ec4899); border-radius: 5px; }
  .pdf-bar-value { text-align: right; font-weight: 600; color: #be185d; font-family: 'Cormorant Garamond', serif; font-size: 12px; }

  /* Donut chart - SVG inline */
  .pdf-donut-wrap { display: flex; align-items: center; gap: 18px; margin: 10px 0 14px; }
  .pdf-donut { width: 130px; height: 130px; flex-shrink: 0; }
  .pdf-donut-legend { flex: 1; }
  .pdf-donut-legend-item { display: flex; align-items: center; gap: 8px; font-size: 11px; padding: 3px 0; color: #374151; }
  .pdf-donut-legend-dot { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }
  .pdf-donut-legend-label { flex: 1; }
  .pdf-donut-legend-value { font-weight: 600; color: #be185d; font-family: 'Cormorant Garamond', serif; }

  /* Footer */
  .pdf-footer { text-align: center; font-size: 9.5px; color: #9ca3af; padding-top: 22px; border-top: 1px solid #f3f4f6; margin-top: 32px; line-height: 1.7; }
  .pdf-footer-brand { font-family: 'Playfair Display', serif; color: #F4A7B9; font-weight: 700; letter-spacing: 0.5px; }

  /* ============ Dashboard layout (one-page infographic) ============ */
  .pdf-dash { width: 595px; min-height: 842px; margin: 0 auto; background: #ffffff; display: grid; grid-template-columns: 120px 1fr; }

  /* Sidebar with vertical branding */
  .pdf-dash-side { background: linear-gradient(180deg, #fef8fa 0%, #fff5f7 100%); padding: 36px 18px; display: flex; flex-direction: column; justify-content: space-between; position: relative; border-right: 1px solid #fce4ec; }
  .pdf-dash-side-top { }
  .pdf-dash-brand-name { font-family: 'Cormorant Garamond', serif; font-size: 30px; font-weight: 600; color: #1f2937; line-height: 1.05; letter-spacing: -0.5px; }
  .pdf-dash-brand-tag { font-family: 'Cormorant Garamond', serif; font-size: 10.5px; color: #9ca3af; letter-spacing: 2.5px; text-transform: uppercase; margin-top: 22px; }
  .pdf-dash-side-bottom { font-family: 'Cormorant Garamond', serif; font-size: 10px; color: #9ca3af; letter-spacing: 2px; line-height: 1.6; font-style: italic; }
  .pdf-dash-side-deco { position: absolute; right: 14px; top: 50%; width: 1px; height: 80px; background: linear-gradient(180deg, transparent, #F4A7B9, transparent); transform: translateY(-50%); }

  /* Main content area */
  .pdf-dash-main { padding: 30px 32px 24px; }

  /* Top meta row (dates) */
  .pdf-dash-meta { display: flex; justify-content: flex-end; align-items: center; gap: 14px; font-family: 'Cormorant Garamond', serif; font-size: 11px; color: #9ca3af; letter-spacing: 1.5px; margin-bottom: 18px; }
  .pdf-dash-meta-strong { color: #6b7280; font-weight: 600; }

  /* Title section */
  .pdf-dash-title { font-family: 'Noto Serif KR', serif; font-size: 22px; font-weight: 700; color: #1f2937; margin: 0 0 6px; letter-spacing: -0.5px; }
  .pdf-dash-desc { font-size: 11px; color: #6b7280; line-height: 1.6; margin: 0 0 18px; }

  /* Info pills row */
  .pdf-dash-pills { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; margin-bottom: 16px; }
  .pdf-dash-pill { background: linear-gradient(135deg, #fef8fa, #ffffff); border: 1px solid #fce4ec; border-radius: 10px; padding: 9px 10px; display: flex; align-items: center; gap: 7px; }
  .pdf-dash-pill-icon { width: 22px; height: 22px; border-radius: 50%; background: #fce4ec; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; }
  .pdf-dash-pill-text { display: flex; flex-direction: column; min-width: 0; }
  .pdf-dash-pill-label { font-size: 8px; color: #9ca3af; letter-spacing: 0.3px; text-transform: uppercase; font-family: 'Cormorant Garamond', serif; line-height: 1; margin-bottom: 2px; }
  .pdf-dash-pill-value { font-size: 11px; font-weight: 700; color: #1f2937; line-height: 1.1; }

  /* Stat cards row (3 big colored cards) */
  .pdf-dash-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; margin-bottom: 18px; }
  .pdf-dash-stat { padding: 14px 12px; border-radius: 12px; position: relative; overflow: hidden; }
  .pdf-dash-stat-pink { background: linear-gradient(135deg, #fde2e9 0%, #fbcfd8 100%); }
  .pdf-dash-stat-amber { background: linear-gradient(135deg, #fff4d6 0%, #ffe7a8 100%); }
  .pdf-dash-stat-mint { background: linear-gradient(135deg, #d4f4e2 0%, #b6ecd0 100%); }
  .pdf-dash-stat-icon { width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.7); display: flex; align-items: center; justify-content: center; font-size: 16px; margin-bottom: 8px; }
  .pdf-dash-stat-value { font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 700; color: #1f2937; line-height: 1; margin-bottom: 3px; letter-spacing: -0.5px; }
  .pdf-dash-stat-label { font-size: 10px; color: #6b7280; font-weight: 500; }

  /* Two-column grid card area */
  .pdf-dash-row { display: grid; gap: 10px; margin-bottom: 12px; }
  .pdf-dash-row-2 { grid-template-columns: 1fr 1fr; }
  .pdf-dash-row-3 { grid-template-columns: 2fr 1fr; }

  .pdf-dash-card { background: #ffffff; border: 1px solid #f3f4f6; border-radius: 12px; padding: 14px 14px 12px; }
  .pdf-dash-card-title { font-family: 'Noto Serif KR', serif; font-size: 12px; font-weight: 700; color: #1f2937; margin: 0 0 9px; padding-bottom: 6px; border-bottom: 1px solid #fce4ec; display: flex; align-items: center; gap: 6px; }
  .pdf-dash-card-title::before { content: ''; width: 4px; height: 12px; background: linear-gradient(180deg, #F4A7B9, #ec4899); border-radius: 2px; }

  /* Compact table inside dashboard cards */
  .pdf-dash-table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
  .pdf-dash-table th { padding: 6px 6px; text-align: left; font-weight: 600; color: #9ca3af; font-size: 8.5px; letter-spacing: 0.3px; text-transform: uppercase; border-bottom: 1px solid #f3f4f6; font-family: 'Cormorant Garamond', serif; }
  .pdf-dash-table td { padding: 7px 6px; font-size: 10px; color: #374151; border-bottom: 1px solid #fafafa; }
  .pdf-dash-table .total td { font-weight: 700; color: #1f2937; background: #fef8fa; border-top: 1.5px solid #F4A7B9; }
  .pdf-dash-table .diff-pos { color: #ef4444; font-weight: 600; }
  .pdf-dash-table .diff-neg { color: #10b981; font-weight: 600; }

  /* Category share bars (compact horizontal) */
  .pdf-dash-share { padding: 2px 0; }
  .pdf-dash-share-row { display: grid; grid-template-columns: 76px 1fr 44px; gap: 8px; align-items: center; margin-bottom: 7px; font-size: 10px; }
  .pdf-dash-share-label { color: #374151; font-weight: 500; }
  .pdf-dash-share-track { height: 7px; background: #f9fafb; border-radius: 4px; overflow: hidden; }
  .pdf-dash-share-fill { height: 100%; border-radius: 4px; }
  .pdf-dash-share-pct { text-align: right; font-family: 'Cormorant Garamond', serif; font-weight: 700; color: #be185d; font-size: 11px; }

  /* Big number block (예산 건강도 large display) */
  .pdf-dash-big { text-align: center; padding: 14px 8px 10px; }
  .pdf-dash-big-icon { width: 38px; height: 38px; border-radius: 50%; margin: 0 auto 6px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
  .pdf-dash-big-value { font-family: 'Cormorant Garamond', serif; font-size: 36px; font-weight: 700; color: #be185d; line-height: 1; letter-spacing: -1px; }
  .pdf-dash-big-suffix { font-size: 14px; color: #9ca3af; font-weight: 500; }
  .pdf-dash-big-label { font-size: 10px; color: #6b7280; margin-top: 4px; font-weight: 600; }

  /* Mini donut (smaller than regular) */
  .pdf-dash-mini-donut { display: flex; align-items: center; gap: 10px; }
  .pdf-dash-mini-donut svg { width: 80px; height: 80px; flex-shrink: 0; }
  .pdf-dash-mini-donut .legend { flex: 1; }
  .pdf-dash-mini-donut .legend-row { display: grid; grid-template-columns: 10px 1fr auto; gap: 6px; align-items: center; font-size: 10px; padding: 2px 0; }
  .pdf-dash-mini-donut .legend-dot { width: 9px; height: 9px; border-radius: 2px; }
  .pdf-dash-mini-donut .legend-label { color: #374151; }
  .pdf-dash-mini-donut .legend-pct { font-family: 'Cormorant Garamono', serif; font-weight: 700; color: #be185d; font-size: 11px; }

  /* Insight strip */
  .pdf-dash-insight { background: linear-gradient(135deg, #fff8e1, #fffaf0); border: 1px solid #fde68a; border-radius: 12px; padding: 12px 16px; margin-bottom: 14px; }
  .pdf-dash-insight-title { font-size: 11px; font-weight: 700; color: #92400e; margin: 0 0 6px; display: flex; align-items: center; gap: 4px; }
  .pdf-dash-insight-body { font-size: 10.5px; color: #78350f; line-height: 1.6; }

  /* Dashboard footer (full width) */
  .pdf-dash-footer { padding: 14px 32px 20px 152px; border-top: 1px solid #f3f4f6; font-size: 9px; color: #9ca3af; display: flex; justify-content: space-between; align-items: center; background: #ffffff; }
  .pdf-dash-footer-brand { font-family: 'Playfair Display', serif; color: #F4A7B9; font-weight: 700; }
`;

// ---------------------------------------------------------------------------
// Cover page (인쇄물 첫인상)
// ---------------------------------------------------------------------------
export interface PdfCoverOptions {
  docType: string;        // "맞춤 웨딩 견적서" / "사회자 큐시트" 등
  docSub?: string;        // 한 줄 설명
  couple?: string;        // "지유 ♥ 도현"
  groomName?: string;
  brideName?: string;
  weddingDate?: string;
  styleLabel?: string;
}

export function generatePdfCover(opts: PdfCoverOptions): string {
  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;

  const coupleDisplay = opts.groomName && opts.brideName
    ? `<span>${opts.groomName}</span><span class="pdf-cover-couple-amp">&amp;</span><span>${opts.brideName}</span>`
    : opts.couple
      ? opts.couple.replace(/\s*♥\s*/, '<span class="pdf-cover-couple-amp">&amp;</span>')
      : `<span class="pdf-cover-couple-amp">&amp;</span>`;

  const weddingDateLine = opts.weddingDate
    ? opts.weddingDate.replace(/-/g, ".")
    : "";

  return `
    <style>${PDF_STYLES}</style>
    <div class="pdf-cover">
      <div class="pdf-cover-top">
        <div>
          <div class="pdf-cover-logo">Dewy</div>
          <div class="pdf-cover-logo-sub">Wedding Planner</div>
        </div>
        <div class="pdf-cover-meta">${dateStr}</div>
      </div>

      <div class="pdf-cover-center">
        <div class="pdf-cover-eyebrow">Wedding Document</div>
        <div class="pdf-cover-couple">${coupleDisplay}</div>
        ${weddingDateLine ? `<div class="pdf-cover-date">${weddingDateLine}</div>` : ""}
        <div class="pdf-cover-doc-type">${opts.docType}</div>
        ${opts.docSub ? `<div class="pdf-cover-doc-sub">${opts.docSub}</div>` : ""}
        ${opts.styleLabel ? `<div class="pdf-cover-style-badge">${opts.styleLabel}</div>` : ""}
      </div>

      <div class="pdf-cover-bottom">
        <div class="pdf-cover-bottom-text">For the most precious day</div>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// 본문 헤더 (Cover 이후 페이지 시작점)
// ---------------------------------------------------------------------------
export interface PdfHeaderOptions {
  couple?: string;
  weddingDate?: string;
  styleLabel?: string;
  /** Cover 페이지 옵션을 함께 전달하면 자동으로 cover + header 모두 렌더 */
  cover?: PdfCoverOptions;
}

export function generatePdfHeader(title: string, subtitle?: string, opts: PdfHeaderOptions = {}): string {
  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;
  const coupleLine = opts.couple || opts.weddingDate
    ? `<div class="pdf-couple-tag">${opts.couple ?? ""}${opts.couple && opts.weddingDate ? " · " : ""}${opts.weddingDate ?? ""}</div>`
    : "";

  const coverHtml = opts.cover ? generatePdfCover(opts.cover) : `<style>${PDF_STYLES}</style>`;

  return `
    ${coverHtml}
    <div class="pdf-page">
      <div class="pdf-header">
        <div>
          <div class="pdf-logo">Dewy</div>
          <div class="pdf-logo-sub">Wedding Planner</div>
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
        <span class="pdf-footer-brand">Dewy</span> Wedding Planner · 본 문서는 참고용 자료이며, 실제 진행 시 업체 안내를 우선해주세요.<br/>
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

export function pdfDivider(): string {
  return `<div class="pdf-divider"></div>`;
}

// ---------------------------------------------------------------------------
// Bar Chart (가로 막대) - 예산 카테고리별 비교 등
// ---------------------------------------------------------------------------
export interface BarChartItem {
  label: string;
  value: number;       // 표시할 숫자(만원 등)
  ratio?: number;      // 0~1, 막대 채움 비율. 없으면 value/max로 자동 계산
  displayValue?: string; // "1,200만원" 같은 포매팅된 값
}

export function pdfBarChart(items: BarChartItem[]): string {
  const maxVal = Math.max(...items.map((i) => i.value), 1);
  const rows = items
    .map((it) => {
      const ratio = it.ratio ?? Math.min(1, it.value / maxVal);
      const fillPct = Math.round(ratio * 100);
      const display = it.displayValue ?? `${it.value.toLocaleString()}만원`;
      return `<div class="pdf-bar-row">
        <div class="pdf-bar-label">${it.label}</div>
        <div class="pdf-bar-track"><div class="pdf-bar-fill" style="width:${fillPct}%;"></div></div>
        <div class="pdf-bar-value">${display}</div>
      </div>`;
    })
    .join("");
  return `<div class="pdf-bar-chart">${rows}</div>`;
}

// ---------------------------------------------------------------------------
// Donut Chart (SVG 인라인) - 양가 분담·카테고리 비율 등
// ---------------------------------------------------------------------------
export interface DonutItem {
  label: string;
  value: number;       // 절대값
  color?: string;      // hex
}

const DONUT_DEFAULT_COLORS = [
  "#F4A7B9", "#ec4899", "#fb7185", "#fda4af",
  "#f59e0b", "#fbbf24", "#fcd34d", "#fde68a",
  "#10b981", "#34d399", "#6ee7b7", "#a7f3d0",
];

export function pdfDonut(items: DonutItem[]): string {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total <= 0) return "";

  const cx = 65, cy = 65, r = 48, strokeWidth = 22;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const segments = items.map((it, idx) => {
    const color = it.color ?? DONUT_DEFAULT_COLORS[idx % DONUT_DEFAULT_COLORS.length];
    const portion = it.value / total;
    const dash = circumference * portion;
    const gap = circumference - dash;
    const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="transparent" stroke="${color}" stroke-width="${strokeWidth}" stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" />`;
    offset += dash;
    return { seg, color, portion };
  });

  const svg = `<svg class="pdf-donut" viewBox="0 0 130 130">
    ${segments.map((s) => s.seg).join("")}
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="14" fill="#9ca3af">TOTAL</text>
    <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-family="Cormorant Garamond, serif" font-weight="700" font-size="18" fill="#1f2937">${total.toLocaleString()}</text>
  </svg>`;

  const legend = items
    .map((it, idx) => {
      const color = it.color ?? DONUT_DEFAULT_COLORS[idx % DONUT_DEFAULT_COLORS.length];
      const portion = Math.round((it.value / total) * 100);
      return `<div class="pdf-donut-legend-item">
        <span class="pdf-donut-legend-dot" style="background:${color};"></span>
        <span class="pdf-donut-legend-label">${it.label}</span>
        <span class="pdf-donut-legend-value">${portion}%</span>
      </div>`;
    })
    .join("");

  return `<div class="pdf-donut-wrap">${svg}<div class="pdf-donut-legend">${legend}</div></div>`;
}

// ---------------------------------------------------------------------------
// Dashboard Layout — 한 페이지 인포그래픽
// 좌측 세로 브랜딩 + 우측 다단 그리드 (예산 리포트·견적서용)
// ---------------------------------------------------------------------------
export interface DashboardOptions {
  brandName?: string[];          // ["Dewy", "Wedding", "Planner"] 같이 줄별 분리
  brandTag?: string;             // "Wedding Document"
  brandBottom?: string;          // "For the most precious day"
  publishDate?: string;          // 발행일 (YYYY.MM.DD)
  weddingDate?: string;          // 예식일 (YYYY.MM.DD)
  title: string;                 // "웨딩 예산 분석 리포트"
  description?: string;          // 한 줄 설명
  pills?: { icon: string; label: string; value: string }[];     // 상단 정보 칩 (4개 권장)
  stats?: { tone: "pink" | "amber" | "mint"; icon: string; value: string; label: string }[];   // 큰 컬러 카드 (3개 권장)
  body: string;                  // 본문 카드들 (pdfDashRow + pdfDashCard로 구성)
  insight?: { title: string; body: string };
}

export const pdfDashCard = (title: string, body: string): string =>
  `<div class="pdf-dash-card"><div class="pdf-dash-card-title">${title}</div>${body}</div>`;

export const pdfDashRow = (cards: string[], variant: 2 | 3 = 2): string =>
  `<div class="pdf-dash-row pdf-dash-row-${variant}">${cards.join("")}</div>`;

/** 컴팩트 카테고리 비중 막대 (대시보드용) */
export const pdfDashShareBars = (
  items: { label: string; pct: number; color?: string }[],
): string => {
  const palette = ["#F4A7B9", "#ec4899", "#fb7185", "#f59e0b", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#fda4af", "#fcd34d"];
  return `<div class="pdf-dash-share">${items
    .map((it, idx) => {
      const color = it.color ?? palette[idx % palette.length];
      const pct = Math.max(0, Math.min(100, it.pct));
      return `<div class="pdf-dash-share-row">
        <div class="pdf-dash-share-label">${it.label}</div>
        <div class="pdf-dash-share-track"><div class="pdf-dash-share-fill" style="width:${pct}%;background:linear-gradient(90deg,${color},${color}cc);"></div></div>
        <div class="pdf-dash-share-pct">${pct.toFixed(1)}%</div>
      </div>`;
    })
    .join("")}</div>`;
};

/** 대시보드용 미니 도넛 (작은 사이즈 + 우측 범례) */
export const pdfDashMiniDonut = (items: DonutItem[]): string => {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total <= 0) return "";
  const cx = 40, cy = 40, r = 28, stroke = 14;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const segs: string[] = [];
  items.forEach((it, idx) => {
    const color = it.color ?? DONUT_DEFAULT_COLORS[idx % DONUT_DEFAULT_COLORS.length];
    const portion = it.value / total;
    const dash = circ * portion;
    segs.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="transparent" stroke="${color}" stroke-width="${stroke}" stroke-dasharray="${dash} ${circ - dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" />`);
    offset += dash;
  });
  const svg = `<svg viewBox="0 0 80 80">${segs.join("")}</svg>`;
  const legend = items
    .map((it, idx) => {
      const color = it.color ?? DONUT_DEFAULT_COLORS[idx % DONUT_DEFAULT_COLORS.length];
      const pct = Math.round((it.value / total) * 100);
      return `<div class="legend-row">
        <span class="legend-dot" style="background:${color};"></span>
        <span class="legend-label">${it.label}</span>
        <span class="legend-pct">${pct}%</span>
      </div>`;
    })
    .join("");
  return `<div class="pdf-dash-mini-donut">${svg}<div class="legend">${legend}</div></div>`;
};

/** 큰 숫자 디스플레이 (예산 건강도 등) */
export const pdfDashBigNumber = (opts: {
  icon: string;
  iconBg: string;
  value: string;
  suffix?: string;
  label: string;
}): string => {
  return `<div class="pdf-dash-big">
    <div class="pdf-dash-big-icon" style="background:${opts.iconBg};">${opts.icon}</div>
    <div class="pdf-dash-big-value">${opts.value}${opts.suffix ? `<span class="pdf-dash-big-suffix">${opts.suffix}</span>` : ""}</div>
    <div class="pdf-dash-big-label">${opts.label}</div>
  </div>`;
};

export function generatePdfDashboard(opts: DashboardOptions): string {
  const today = new Date();
  const todayStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;
  const pubDate = opts.publishDate || todayStr;

  const brandLines = opts.brandName || ["Dewy", "Wedding", "Planner"];
  const brandHtml = brandLines.map((l) => `<div class="pdf-dash-brand-name">${l}</div>`).join("");

  const pillsHtml = opts.pills && opts.pills.length > 0
    ? `<div class="pdf-dash-pills">${opts.pills.map((p) => `
        <div class="pdf-dash-pill">
          <div class="pdf-dash-pill-icon">${p.icon}</div>
          <div class="pdf-dash-pill-text">
            <div class="pdf-dash-pill-label">${p.label}</div>
            <div class="pdf-dash-pill-value">${p.value}</div>
          </div>
        </div>`).join("")}</div>`
    : "";

  const statsHtml = opts.stats && opts.stats.length > 0
    ? `<div class="pdf-dash-stats">${opts.stats.map((s) => `
        <div class="pdf-dash-stat pdf-dash-stat-${s.tone}">
          <div class="pdf-dash-stat-icon">${s.icon}</div>
          <div class="pdf-dash-stat-value">${s.value}</div>
          <div class="pdf-dash-stat-label">${s.label}</div>
        </div>`).join("")}</div>`
    : "";

  const insightHtml = opts.insight
    ? `<div class="pdf-dash-insight">
        <div class="pdf-dash-insight-title">💡 ${opts.insight.title}</div>
        <div class="pdf-dash-insight-body">${opts.insight.body}</div>
      </div>`
    : "";

  return `
    <style>${PDF_STYLES}</style>
    <div class="pdf-dash">
      <aside class="pdf-dash-side">
        <div class="pdf-dash-side-top">
          ${brandHtml}
          ${opts.brandTag ? `<div class="pdf-dash-brand-tag">${opts.brandTag}</div>` : ""}
        </div>
        <div class="pdf-dash-side-bottom">${opts.brandBottom || "For the most precious day"}</div>
        <div class="pdf-dash-side-deco"></div>
      </aside>
      <main class="pdf-dash-main">
        <div class="pdf-dash-meta">
          <span>${pubDate}</span>
          ${opts.weddingDate ? `<span>·</span><span class="pdf-dash-meta-strong">${opts.weddingDate}</span>` : ""}
        </div>
        <h1 class="pdf-dash-title">${opts.title}</h1>
        ${opts.description ? `<p class="pdf-dash-desc">${opts.description}</p>` : ""}
        ${pillsHtml}
        ${statsHtml}
        ${opts.body}
        ${insightHtml}
      </main>
    </div>
    <div class="pdf-dash-footer">
      <span><span class="pdf-dash-footer-brand">Dewy</span> Wedding Planner</span>
      <span>dewywedding.com · 본 문서는 참고용 자료입니다</span>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// PDF 렌더링 (품질 개선)
// - scale 3 (이전 2)
// - PNG (JPEG 압축 아티팩트 제거)
// - useCORS + allowTaint false 유지
// ---------------------------------------------------------------------------
export async function downloadPdf(htmlContent: string, filename: string): Promise<void> {
  const container = document.createElement("div");
  container.innerHTML = DOMPurify.sanitize(htmlContent);
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "595px";
  container.style.background = "#ffffff";
  document.body.appendChild(container);

  try {
    // 폰트 로딩 대기 — 임베드된 Google Fonts가 적용되어야 글자가 깨끗하게 캡처됨
    if ((document as any).fonts?.ready) {
      try { await (document as any).fonts.ready; } catch { /* noop */ }
    }
    // 두 번째 안전망: 짧은 대기로 폰트 페인트 완료 보장
    await new Promise((r) => setTimeout(r, 150));

    const canvas = await html2canvas(container, {
      scale: 3,                     // 2 → 3, 글자 선명도 대폭 향상
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      letterRendering: true,        // 한글 자모 결합 정확도 향상
      imageTimeout: 8000,
    } as any);

    // PNG로 변경 — 글자/표 라인 아티팩트 제거 (파일 용량 약간 증가)
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = pdfWidth / imgWidth;
    const scaledHeight = imgHeight * ratio;

    let heightLeft = scaledHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, pdfWidth, scaledHeight, undefined, "FAST");
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position -= pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, scaledHeight, undefined, "FAST");
      heightLeft -= pdfHeight;
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}
