// 공공기관 제출용 문서 PDF 빌더 — 마크다운(docs/*.md) → 관공서 양식 A4 PDF.
// build-doc-pdf.cjs(브랜드 핑크)와 달리 정부·공공기관 표준 무채색+남색(navy) 팔레트를 사용한다.
// 정부지원사업 사업계획서·제출 문서 등 격식 문서 전용.
//
// 실행: node scripts/build-gov-pdf.cjs <input.md> [output.pdf] [문서제목]
// 사전조건: 한글폰트(fonts-nanum/fonts-noto-cjk), marked, Chromium(/opt/pw-browsers/chromium-*).

const { execFileSync } = require("node:child_process");
const { writeFileSync, existsSync, readdirSync, unlinkSync, mkdtempSync, readFileSync } = require("node:fs");
const path = require("node:path");
const os = require("node:os");

let marked;
try { ({ marked } = require("marked")); }
catch { console.error("✗ 'marked' 가 없습니다. 먼저: npm install marked"); process.exit(1); }

const inArg = process.argv[2];
if (!inArg) { console.error("사용법: node scripts/build-gov-pdf.cjs <input.md> [output.pdf] [제목]"); process.exit(1); }
const inPath = path.resolve(inArg);
if (!existsSync(inPath)) { console.error(`✗ 입력 파일 없음: ${inPath}`); process.exit(1); }
const outPath = path.resolve(process.argv[3] || inPath.replace(/\.md$/i, ".pdf"));
const title = process.argv[4] || path.basename(inPath).replace(/\.md$/i, "");

const md = readFileSync(inPath, "utf8");
marked.setOptions({ gfm: true, breaks: false });
const bodyHtml = marked.parse(md);

// 공공기관 표준 팔레트: 본문 먹색(#222), 제목 남색(#1f3864/#2e5496), 표는 무채 회색 테두리 + 연회색 헤더.
const html = `<!doctype html><html lang=ko><head><meta charset=utf-8>
<style>
  @page { size: A4; margin: 18mm 16mm 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Noto Sans CJK KR','Noto Sans KR','NanumGothic','NanumSquareRound',sans-serif;
    color: #222222; font-size: 10.5pt; line-height: 1.7; margin: 0;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  h1 { font-size: 19pt; color: #1f3864; font-weight: 800; letter-spacing: -.3px;
       margin: 0 0 6px; line-height: 1.35; text-align: center;
       padding-bottom: 12px; border-bottom: 2.5px solid #1f3864; }
  h2 { font-size: 13.5pt; color: #1f3864; font-weight: 800; border-left: 5px solid #1f3864;
       padding-left: 10px; margin: 24px 0 11px; page-break-after: avoid; }
  h3 { font-size: 11.5pt; color: #2e5496; font-weight: 700; margin: 17px 0 8px;
       page-break-after: avoid; }
  h4 { font-size: 10.8pt; color: #2e5496; font-weight: 700; margin: 13px 0 6px; }
  p { margin: 7px 0; }
  strong { color: #1a1a1a; font-weight: 800; }
  a { color: #1f3864; text-decoration: none; word-break: break-all; }
  ul, ol { margin: 7px 0; padding-left: 20px; }
  li { margin: 4px 0; }
  code { background: #eef1f5; color: #1f3864; padding: 1px 5px; border-radius: 3px;
         font-size: 9pt; font-family: 'D2Coding','NanumGothicCoding',monospace; }
  hr { border: 0; border-top: 1px solid #c9cdd4; margin: 18px 0; }
  blockquote { background: #f5f6f8; border: 1px solid #d4d9e0; border-left: 4px solid #2e5496;
    border-radius: 4px; padding: 9px 14px; margin: 11px 0; color: #33373d; font-size: 9.8pt;
    page-break-inside: avoid; }
  blockquote p { margin: 3px 0; }
  table { border-collapse: collapse; width: 100%; margin: 11px 0; font-size: 9.3pt;
    page-break-inside: avoid; }
  th, td { border: 1px solid #b6bcc6; padding: 6px 9px; text-align: left; vertical-align: top; }
  th { background: #e7ecf3; color: #1f3864; font-weight: 700; }
  tr:nth-child(even) td { background: #f7f8fa; }
  .cover-meta { color: #6b7280; font-size: 9pt; border-top: 1px solid #c9cdd4;
    padding-top: 8px; margin-top: 26px; text-align: right; }
</style></head>
<body>${bodyHtml}
<p class=cover-meta>${title} · ${new Date().toISOString().slice(0,10)}</p>
</body></html>`;

function resolveChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  try {
    const hit = readdirSync("/opt/pw-browsers").find((d) => d.startsWith("chromium-") && !d.includes("headless"));
    const ep = hit && `/opt/pw-browsers/${hit}/chrome-linux/chrome`;
    if (ep && existsSync(ep)) return ep;
  } catch { /* */ }
  return "chromium";
}

const tmpDir = mkdtempSync(path.join(os.tmpdir(), "govpdf-"));
const tmpHtml = path.join(tmpDir, "doc.html");
writeFileSync(tmpHtml, html);

try {
  execFileSync(resolveChrome(), [
    "--headless=new", "--disable-gpu", "--no-sandbox",
    "--no-pdf-header-footer",
    `--print-to-pdf=${outPath}`,
    `file://${tmpHtml}`,
  ], { stdio: "pipe" });
  console.log(`✓ ${outPath}`);
} finally {
  try { unlinkSync(tmpHtml); } catch { /* */ }
}
