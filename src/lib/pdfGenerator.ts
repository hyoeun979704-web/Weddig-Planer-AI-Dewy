import DOMPurify from "dompurify";

// jspdf(~129kB gz)·html2canvas(~48kB gz)는 실제 PDF 생성 시에만 필요하다.
// top-level import 하면 이 모듈을 정적으로 쓰는 모든 경로(Budget/Premium 시트
// + Vite preload 헬퍼 동거 청크)가 eager 로드해 버린다. downloadPdf 내부에서
// 동적 import 해 다운로드를 누르는 순간에만 받아오도록 한다.

/**
 * HTML 특수문자 이스케이프.
 * 사용자 자유입력(이름, 메모, 장소명 등)을 PDF용 HTML 문자열에 삽입할 때
 * 반드시 통과시켜야 한다. splitAndSanitize()가 <style> 블록을 분리 보존하므로
 * 사용자 입력의 `<style>...</style>`가 정화를 우회할 수 있으나, 스타일은 호출부
 * 에서 textContent 로 주입해 태그 breakout(XSS)을 막는다.
 */
export const esc = (value: string | number | undefined | null): string => {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

// ---------------------------------------------------------------------------
// 단정하고 부드러운 인쇄물 톤.
// - 본문/숫자/라벨: Noto Sans KR (산세리프 — 단정한 가독성)
// - 헤딩: Noto Serif KR (절제된 serif, 한국어 우아함)
// - 브랜드 로고에만 Cormorant Garamond 한정 사용 (식별성)
// ---------------------------------------------------------------------------
const PDF_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&family=Noto+Serif+KR:wght@600;700&family=Cormorant+Garamond:wght@500;600&display=swap');

  /* 디자인 토큰 — 컬러 한 곳에서 관리 */
  :root {
    --c-text: #1f2937;
    --c-text-muted: #6b7280;
    --c-text-faint: #9ca3af;
    --c-text-strong: #111827;
    --c-bg: #ffffff;
    --c-bg-soft: #fafafa;
    --c-border: #f3f4f6;
    --c-border-soft: #fafafa;
    --c-brand: #F4A7B9;
    --c-brand-strong: #be185d;
    --c-brand-soft: #fce4ec;
    --c-brand-tint: #fef8fa;
    --c-brand-bg: #fff0f3;
    --c-success: #059669;
    --c-warning: #f59e0b;
    --c-error: #dc2626;
    --c-info: #3b82f6;
    --c-stat-pink-bg: #fde8ee;
    --c-stat-amber-bg: #fff5dc;
    --c-stat-mint-bg: #dcf5e8;
    --c-tip-bg: #fff8e1;
    --c-warning-bg: #fef2f2;
    --c-note-bg: #eff6ff;
    --f-sans: 'Noto Sans KR', sans-serif;
    --f-serif: 'Noto Serif KR', serif;
    --f-display: 'Cormorant Garamond', serif;
  }

  * { box-sizing: border-box; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  body { margin: 0; padding: 0; color: var(--c-text); background: var(--c-bg); font-family: var(--f-sans); font-feature-settings: "tnum"; }

  .pdf-page { padding: 48px 44px 44px; max-width: 595px; margin: 0 auto; background: #ffffff; }

  /* ============ 일반 본문 페이지 ============ */
  .pdf-header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 16px; margin-bottom: 32px; border-bottom: 1.5px solid #F4A7B9; }
  .pdf-logo { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 700; color: #F4A7B9; letter-spacing: 0.5px; }
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
  .pdf-footer-brand { font-family: 'Cormorant Garamond', serif; color: #F4A7B9; font-weight: 700; letter-spacing: 0.5px; }

  /* ============ Dashboard layout (one-page infographic) ============ */
  .pdf-dash { width: 595px; min-height: 842px; margin: 0 auto; background: #ffffff; display: block; }

  /* 가로 헤더 (브랜드 + 발행일) */
  .pdf-dash-topbar { display: flex; justify-content: space-between; align-items: center; padding: 22px 36px 14px; border-bottom: 1px solid #fce4ec; }
  .pdf-dash-brand { display: flex; align-items: baseline; gap: 10px; }
  .pdf-dash-brand-name { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 600; color: #1f2937; line-height: 1; letter-spacing: -0.2px; }
  .pdf-dash-brand-tag { font-size: 9px; color: #9ca3af; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 500; }
  .pdf-dash-topbar-meta { display: flex; gap: 16px; align-items: center; font-size: 10.5px; color: #4b5563; font-weight: 500; }
  .pdf-dash-topbar-meta .item { display: flex; gap: 6px; align-items: baseline; }
  .pdf-dash-topbar-meta .label { color: #9ca3af; font-size: 8.5px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
  .pdf-dash-topbar-meta .value { color: #1f2937; font-weight: 600; }

  /* Main content area (사이드바 제거 → 전체 폭 사용) */
  .pdf-dash-main { padding: 22px 36px 24px; }

  /* Title section */
  .pdf-dash-title { font-family: 'Noto Serif KR', serif; font-size: 24px; font-weight: 700; color: #1f2937; margin: 0 0 6px; letter-spacing: -0.5px; line-height: 1.2; }
  .pdf-dash-desc { font-size: 11.5px; color: #6b7280; line-height: 1.6; margin: 0 0 22px; }

  /* Info pills row */
  .pdf-dash-pills { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
  .pdf-dash-pill { background: #fafafa; border: 1px solid #f3f4f6; border-radius: 10px; padding: 11px 13px; display: flex; flex-direction: column; gap: 3px; }
  .pdf-dash-pill-icon { display: none; }
  .pdf-dash-pill-text { display: flex; flex-direction: column; min-width: 0; }
  .pdf-dash-pill-label { font-size: 9px; color: #9ca3af; line-height: 1; margin-bottom: 4px; font-weight: 500; letter-spacing: 0.2px; }
  .pdf-dash-pill-value { font-size: 13px; font-weight: 700; color: #1f2937; line-height: 1.2; }

  /* Stat cards row (3 big colored cards) */
  .pdf-dash-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
  .pdf-dash-stat { padding: 16px 14px 14px; border-radius: 14px; position: relative; overflow: hidden; text-align: center; }
  .pdf-dash-stat-pink { background: #fde8ee; }
  .pdf-dash-stat-amber { background: #fff5dc; }
  .pdf-dash-stat-mint { background: #dcf5e8; }
  .pdf-dash-stat-icon { width: 28px; height: 28px; border-radius: 50%; background: rgba(255,255,255,0.7); display: flex; align-items: center; justify-content: center; font-size: 14px; margin: 0 auto 6px; }
  .pdf-dash-stat-value { font-family: 'Noto Sans KR', sans-serif; font-size: 26px; font-weight: 700; color: #1f2937; line-height: 1; margin-bottom: 5px; letter-spacing: -0.6px; }
  .pdf-dash-stat-label { font-size: 10.5px; color: #6b7280; font-weight: 500; letter-spacing: 0.1px; }

  /* Two-column grid card area */
  .pdf-dash-row { display: grid; gap: 10px; margin-bottom: 12px; }
  .pdf-dash-row-1 { grid-template-columns: 1fr; }
  .pdf-dash-row-2 { grid-template-columns: 1fr 1fr; }
  .pdf-dash-row-3 { grid-template-columns: 2fr 1fr; }

  /* Payment timeline table (full-width) + status badges */
  .pdf-tl-table { width: 100%; border-collapse: collapse; font-size: 10px; table-layout: fixed; }
  .pdf-tl-table td { padding: 7px 6px; border-bottom: 1px solid #fafafa; vertical-align: top; }
  .pdf-tl-table tr:last-child td { border-bottom: 0; }
  .pdf-tl-date { color: #9ca3af; white-space: nowrap; font-family: 'Cormorant Garamond', serif; font-size: 11px; width: 52px; }
  .pdf-tl-title { font-weight: 600; color: #1f2937; line-height: 1.3; }
  .pdf-tl-meta { font-size: 8.5px; color: #9ca3af; margin-top: 2px; }
  .pdf-tl-amount { text-align: right; font-weight: 700; color: #1f2937; white-space: nowrap; width: 72px; }
  .pdf-tl-amount.pending { color: #be185d; }
  .pdf-tl-status { text-align: right; width: 56px; }
  .pdf-badge { display: inline-block; padding: 2px 7px; border-radius: 8px; font-size: 8.5px; font-weight: 700; white-space: nowrap; }
  .pdf-badge-paid { background: #dcf5e8; color: #059669; }
  .pdf-badge-imminent { background: #fff5dc; color: #b45309; }
  .pdf-badge-waiting { background: #f3f4f6; color: #6b7280; }
  .pdf-badge-cash { background: #fde8ee; color: #be185d; }

  /* Numbered section header (마스터 리포트 차용 — 문서 구조감) */
  .pdf-dash-section { display: flex; align-items: center; gap: 8px; margin: 16px 0 9px; }
  .pdf-dash-section-num { width: 19px; height: 19px; border-radius: 6px; background: #be185d; color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-family: 'Cormorant Garamond', serif; }
  .pdf-dash-section-title { font-family: 'Noto Serif KR', serif; font-size: 13.5px; font-weight: 700; color: #1f2937; letter-spacing: -0.3px; }
  .pdf-dash-section-line { flex: 1; height: 1px; background: linear-gradient(90deg, #fce4ec, transparent); }

  /* Payer badge (공동/신랑/신부 — 마스터 차용) */
  .pdf-payer-badge { display: inline-block; padding: 2px 8px; border-radius: 7px; font-size: 9px; font-weight: 700; white-space: nowrap; }
  .pdf-payer-shared { background: #fde8ee; color: #be185d; }
  .pdf-payer-groom { background: #e0edff; color: #1d4ed8; }
  .pdf-payer-bride { background: #ffe4e9; color: #e11d48; }

  .pdf-dash-card { background: #ffffff; border: 1px solid #f3f4f6; border-radius: 12px; padding: 14px 14px 12px; }
  .pdf-dash-card-title { font-family: 'Noto Sans KR', sans-serif; font-size: 12.5px; font-weight: 700; color: #1f2937; margin: 0 0 10px; padding-bottom: 7px; border-bottom: 1px solid #f3f4f6; display: flex; align-items: center; gap: 7px; letter-spacing: -0.2px; }
  .pdf-dash-card-title::before { content: ''; width: 3px; height: 12px; background: #F4A7B9; border-radius: 2px; }

  /* Compact table inside dashboard cards */
  .pdf-dash-table { width: 100%; border-collapse: collapse; font-size: 10.5px; table-layout: auto; }
  .pdf-dash-table th { padding: 7px 5px; text-align: left; font-weight: 500; color: #9ca3af; font-size: 9.5px; letter-spacing: 0.2px; border-bottom: 1px solid #f3f4f6; white-space: nowrap; }
  .pdf-dash-table td { padding: 8px 5px; font-size: 10.5px; color: #374151; border-bottom: 1px solid #fafafa; white-space: nowrap; font-weight: 500; }
  .pdf-dash-table .total td { font-weight: 700; color: #1f2937; background: #fef8fa; border-top: 1.5px solid #F4A7B9; }
  .pdf-dash-table .diff-pos { color: #dc2626; font-weight: 600; }
  .pdf-dash-table .diff-neg { color: #059669; font-weight: 600; }

  /* Category share bars (compact horizontal) */
  .pdf-dash-share { padding: 2px 0; }
  .pdf-dash-share-row { display: grid; grid-template-columns: 60px 1fr 44px; gap: 8px; align-items: center; margin-bottom: 10px; font-size: 10.5px; }
  .pdf-dash-share-label { color: #374151; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pdf-dash-share-track { height: 9px; background: #f3f4f6; border-radius: 4.5px; overflow: hidden; }
  .pdf-dash-share-fill { height: 100%; border-radius: 4.5px; }
  .pdf-dash-share-pct { text-align: right; font-weight: 700; color: #be185d; font-size: 11px; white-space: nowrap; }

  /* Big number block (예산 건강도 large display) */
  .pdf-dash-big { text-align: center; padding: 14px 8px 10px; }
  .pdf-dash-big-icon { width: 38px; height: 38px; border-radius: 50%; margin: 0 auto 6px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
  .pdf-dash-big-value { font-family: 'Noto Sans KR', sans-serif; font-size: 36px; font-weight: 700; color: #be185d; line-height: 1; letter-spacing: -1.2px; }
  .pdf-dash-big-suffix { font-size: 14px; color: #9ca3af; font-weight: 500; margin-left: 2px; }
  .pdf-dash-big-label { font-size: 10.5px; color: #6b7280; margin-top: 6px; font-weight: 500; }

  /* Mini donut (smaller than regular) */
  .pdf-dash-mini-donut { display: flex; align-items: center; gap: 10px; }
  .pdf-dash-mini-donut svg { width: 80px; height: 80px; flex-shrink: 0; }
  .pdf-dash-mini-donut .legend { flex: 1; }
  .pdf-dash-mini-donut .legend-row { display: grid; grid-template-columns: 10px 1fr auto; gap: 6px; align-items: center; font-size: 10px; padding: 2px 0; }
  .pdf-dash-mini-donut .legend-dot { width: 9px; height: 9px; border-radius: 2px; }
  .pdf-dash-mini-donut .legend-label { color: #374151; }
  .pdf-dash-mini-donut .legend-pct { font-weight: 700; color: #be185d; font-size: 11px; }

  /* Insight strip */
  .pdf-dash-insight { background: linear-gradient(135deg, #fff8e1, #fffaf0); border: 1px solid #fde68a; border-radius: 12px; padding: 12px 16px; margin-bottom: 14px; }
  .pdf-dash-insight-title { font-size: 11px; font-weight: 700; color: #92400e; margin: 0 0 6px; display: flex; align-items: center; gap: 4px; }
  .pdf-dash-insight-body { font-size: 10.5px; color: #78350f; line-height: 1.6; }

  /* Dashboard footer (full width) */
  .pdf-dash-footer { padding: 14px 36px 18px; border-top: 1px solid #f3f4f6; font-size: 9px; color: #9ca3af; display: flex; justify-content: space-between; align-items: center; background: #ffffff; }
  .pdf-dash-footer-brand { font-family: 'Cormorant Garamond', serif; color: #F4A7B9; font-weight: 600; letter-spacing: 0.3px; }
`;

// ---------------------------------------------------------------------------
// 본문 헤더
// ---------------------------------------------------------------------------
export interface PdfHeaderOptions {
  couple?: string;
  weddingDate?: string;
  styleLabel?: string;
}

export function generatePdfHeader(title: string, subtitle?: string, opts: PdfHeaderOptions = {}): string {
  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;
  const coupleLine = opts.couple || opts.weddingDate
    ? `<div class="pdf-couple-tag">${esc(opts.couple ?? "")}${opts.couple && opts.weddingDate ? " · " : ""}${esc(opts.weddingDate ?? "")}</div>`
    : "";

  const coverHtml = `<style>${PDF_STYLES}</style>`;

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
      <div class="pdf-title">${esc(title)}${opts.styleLabel ? ` <span class="pdf-style-pill">${esc(opts.styleLabel)}</span>` : ""}</div>
      ${subtitle ? `<div class="pdf-subtitle">${esc(subtitle)}</div>` : ""}
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
        `<div class="pdf-info-item"><div class="pdf-info-label">${esc(it.label)}</div><div class="pdf-info-value">${esc(it.value)}</div></div>`,
    )
    .join("")}</div>`;
}

export function pdfStatRow(items: { value: string; label: string }[]): string {
  return `<div class="pdf-stat-row">${items
    .map(
      (it) =>
        `<div class="pdf-stat-item"><div class="pdf-stat-value">${esc(it.value)}</div><div class="pdf-stat-label">${esc(it.label)}</div></div>`,
    )
    .join("")}</div>`;
}

export function pdfSection(title: string, body: string): string {
  return `<div class="pdf-section"><div class="pdf-section-title">${esc(title)}</div>${body}</div>`;
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
        <div class="pdf-bar-label">${esc(it.label)}</div>
        <div class="pdf-bar-track"><div class="pdf-bar-fill" style="width:${fillPct}%;"></div></div>
        <div class="pdf-bar-value">${esc(display)}</div>
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

  const svg = `<svg class="pdf-donut" width="130" height="130" viewBox="0 0 130 130">
    ${segments.map((s) => s.seg).join("")}
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-family="Noto Sans KR, sans-serif" font-size="11" fill="#9ca3af">TOTAL</text>
    <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-family="Noto Sans KR, sans-serif" font-weight="700" font-size="18" fill="#1f2937">${esc(total.toLocaleString())}</text>
  </svg>`;

  const legend = items
    .map((it, idx) => {
      const color = it.color ?? DONUT_DEFAULT_COLORS[idx % DONUT_DEFAULT_COLORS.length];
      const portion = Math.round((it.value / total) * 100);
      return `<div class="pdf-donut-legend-item">
        <span class="pdf-donut-legend-dot" style="background:${color};"></span>
        <span class="pdf-donut-legend-label">${esc(it.label)}</span>
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
  brandName?: string;            // "Dewy Wedding Planner" — 가로 헤더에 한 줄 표시
  brandTag?: string;             // "Wedding Document"
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
  `<div class="pdf-dash-card"><div class="pdf-dash-card-title">${esc(title)}</div>${body}</div>`;

export const pdfDashRow = (cards: string[], variant: 1 | 2 | 3 = 2): string =>
  `<div class="pdf-dash-row pdf-dash-row-${variant}">${cards.join("")}</div>`;

/** 번호 섹션 헤더 (마스터 리포트 차용 — 카드 묶음 위 문서 구조감). */
export const pdfDashSectionHead = (num: number | string, title: string): string =>
  `<div class="pdf-dash-section"><span class="pdf-dash-section-num">${esc(num)}</span><span class="pdf-dash-section-title">${esc(title)}</span><span class="pdf-dash-section-line"></span></div>`;

const PAYER_BADGE_CLASS: Record<string, string> = {
  shared: "pdf-payer-shared",
  groom: "pdf-payer-groom",
  bride: "pdf-payer-bride",
};

/** 결제 주체 컬러 배지 (공동/신랑/신부). 미상 key 는 공동(shared) 색으로. */
export const pdfPayerBadge = (label: string, key: string): string =>
  `<span class="pdf-payer-badge ${PAYER_BADGE_CLASS[key] ?? "pdf-payer-shared"}">${esc(label)}</span>`;

/** 결제 타임라인 표 (전폭 카드 본문용). 상태 배지 + 단계/수단/주체 메타 한 줄. */
export interface PdfTimelineRow {
  date: string;        // 표시용 (예: "26.06.15" 또는 "미정")
  title: string;       // 항목명 (사용자 입력 — 헬퍼가 esc 처리)
  meta: string;        // "정계약 · 카드 · 신부측" 보조 라인
  amount: string;      // 포맷된 금액 (예: "3,000만원")
  status: "paid" | "imminent" | "waiting" | "cash";
  isPending: boolean;
}

const TIMELINE_STATUS_LABEL: Record<PdfTimelineRow["status"], string> = {
  paid: "완료",
  imminent: "임박",
  waiting: "대기",
  cash: "현금필수",
};

export const pdfDashTimeline = (rows: PdfTimelineRow[]): string => {
  if (rows.length === 0) {
    return `<div style="font-size:10.5px;color:#9ca3af;text-align:center;padding:20px 0;">결제 내역이 없어요.</div>`;
  }
  const body = rows
    .map(
      (r) => `<tr>
        <td class="pdf-tl-date">${esc(r.date)}</td>
        <td><div class="pdf-tl-title">${esc(r.title)}</div>${r.meta ? `<div class="pdf-tl-meta">${esc(r.meta)}</div>` : ""}</td>
        <td class="pdf-tl-amount${r.isPending ? " pending" : ""}">${esc(r.amount)}</td>
        <td class="pdf-tl-status"><span class="pdf-badge pdf-badge-${r.status}">${esc(TIMELINE_STATUS_LABEL[r.status])}</span></td>
      </tr>`,
    )
    .join("");
  return `<table class="pdf-tl-table"><tbody>${body}</tbody></table>`;
};

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
        <div class="pdf-dash-share-label">${esc(it.label)}</div>
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
  const svg = `<svg width="80" height="80" viewBox="0 0 80 80" style="flex-shrink:0;">${segs.join("")}</svg>`;
  const legend = items
    .map((it, idx) => {
      const color = it.color ?? DONUT_DEFAULT_COLORS[idx % DONUT_DEFAULT_COLORS.length];
      const pct = Math.round((it.value / total) * 100);
      return `<div class="legend-row">
        <span class="legend-dot" style="background:${color};"></span>
        <span class="legend-label">${esc(it.label)}</span>
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
    ${opts.icon ? `<div class="pdf-dash-big-icon" style="background:${opts.iconBg};">${esc(opts.icon)}</div>` : ""}
    <div class="pdf-dash-big-value">${esc(opts.value)}${opts.suffix ? `<span class="pdf-dash-big-suffix">${esc(opts.suffix)}</span>` : ""}</div>
    <div class="pdf-dash-big-label">${esc(opts.label)}</div>
  </div>`;
};

export function generatePdfDashboard(opts: DashboardOptions): string {
  const today = new Date();
  const todayStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;
  const pubDate = opts.publishDate || todayStr;

  const brandInline = opts.brandName || "Dewy Wedding Planner";

  const pillsHtml = opts.pills && opts.pills.length > 0
    ? `<div class="pdf-dash-pills">${opts.pills.map((p) => `
        <div class="pdf-dash-pill">
          ${p.icon ? `<div class="pdf-dash-pill-icon">${esc(p.icon)}</div>` : ""}
          <div class="pdf-dash-pill-text">
            <div class="pdf-dash-pill-label">${esc(p.label)}</div>
            <div class="pdf-dash-pill-value">${esc(p.value)}</div>
          </div>
        </div>`).join("")}</div>`
    : "";

  const statsHtml = opts.stats && opts.stats.length > 0
    ? `<div class="pdf-dash-stats">${opts.stats.map((s) => `
        <div class="pdf-dash-stat pdf-dash-stat-${s.tone}">
          ${s.icon ? `<div class="pdf-dash-stat-icon">${esc(s.icon)}</div>` : ""}
          <div class="pdf-dash-stat-value">${esc(s.value)}</div>
          <div class="pdf-dash-stat-label">${esc(s.label)}</div>
        </div>`).join("")}</div>`
    : "";

  // insight.title은 호출 측이 자유롭게 결정 (이모지/아이콘은 호출 측이 prefix할지 결정).
  // body는 사용자 입력이 섞일 수 있어 escape. title도 동일.
  const insightHtml = opts.insight
    ? `<div class="pdf-dash-insight">
        <div class="pdf-dash-insight-title">${esc(opts.insight.title)}</div>
        <div class="pdf-dash-insight-body">${esc(opts.insight.body)}</div>
      </div>`
    : "";

  return `
    <style>${PDF_STYLES}</style>
    <div class="pdf-dash">
      <header class="pdf-dash-topbar">
        <div class="pdf-dash-brand">
          <div class="pdf-dash-brand-name">${esc(brandInline)}</div>
          ${opts.brandTag ? `<div class="pdf-dash-brand-tag">${esc(opts.brandTag)}</div>` : ""}
        </div>
        <div class="pdf-dash-topbar-meta">
          <div class="item"><span class="label">발행</span><span class="value">${esc(pubDate)}</span></div>
          ${opts.weddingDate ? `<div class="item"><span class="label">예식</span><span class="value">${esc(opts.weddingDate)}</span></div>` : ""}
        </div>
      </header>
      <main class="pdf-dash-main">
        <h1 class="pdf-dash-title">${esc(opts.title)}</h1>
        ${opts.description ? `<p class="pdf-dash-desc">${esc(opts.description)}</p>` : ""}
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
// CRITICAL: DOMPurify가 `<style>` 태그를 ADD_TAGS 옵션을 줘도 끈질기게 제거하는
// 케이스가 있다. 우리 PDF는 inline <style>에 grid·flex·색상·SVG 사이즈가 전부
// 들어있어서 잘리면 레이아웃이 통째로 무너진다. 그래서 sanitize 전에 <style>을
// 추출해두고, 본문만 sanitize한 뒤 다시 합쳐 안전성과 스타일을 모두 유지한다.
// <style> 블록을 분리해 본문만 DOMPurify로 정화하고, CSS 텍스트는 따로 돌려준다.
// 스타일을 raw 문자열로 innerHTML에 다시 합치면 `</style><img onerror=...>` 같은
// breakout 으로 정화를 우회당할 수 있으므로, 호출부에서 <style> 노드의 textContent
// 로 주입한다(HTML 파싱이 일어나지 않아 breakout 무력화). 입력이 사용자 본인 문서라
// 영향은 낮지만 defense-in-depth.
export const splitAndSanitize = (html: string): { body: string; styles: string[] } => {
  const styles: string[] = [];
  const bodyOnly = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_match, css) => {
    styles.push(String(css ?? ""));
    return "";
  });
  const body = DOMPurify.sanitize(bodyOnly, {
    ADD_TAGS: ["svg", "circle", "text", "g", "path", "rect", "line", "defs", "linearGradient", "stop"],
    ADD_ATTR: [
      "viewBox", "stroke", "stroke-width", "stroke-dasharray", "stroke-dashoffset",
      "fill", "transform", "cx", "cy", "r", "x", "y", "x1", "y1", "x2", "y2",
      "text-anchor", "font-family", "font-size", "font-weight", "width", "height",
      "preserveAspectRatio", "offset", "stop-color",
    ],
  });
  return { body, styles };
};

export async function downloadPdf(htmlContent: string, filename: string): Promise<void> {
  const container = document.createElement("div");
  const { body, styles } = splitAndSanitize(htmlContent);
  container.innerHTML = body;
  // <style> 은 textContent 로 주입 — HTML 파싱이 없어 태그 breakout(XSS) 불가.
  for (const css of styles) {
    const styleEl = document.createElement("style");
    styleEl.textContent = css;
    container.appendChild(styleEl);
  }
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "595px";
  container.style.background = "#ffffff";
  document.body.appendChild(container);

  try {
    // 무거운 PDF 라이브러리는 이 시점에만 로드 (on-demand 청크).
    const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
      import("jspdf"),
      import("html2canvas"),
    ]);

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
