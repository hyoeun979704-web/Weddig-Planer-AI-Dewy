// 범용 문서 PDF 빌더 — 마크다운(docs/*.md) → 제출용 A4 PDF.
// marked 로 md→HTML 변환 후, 한글폰트(Nanum/Noto CJK) 스타일을 입혀 Chromium 으로 인쇄.
//
// 실행: node scripts/build-doc-pdf.cjs <input.md> [output.pdf] [문서제목]
//   예: node scripts/build-doc-pdf.cjs docs/260619_gov_funding_strategy.md
// 사전조건:
//   - 한글폰트: apt-get install -y fonts-nanum fonts-noto-cjk && fc-cache -f
//   - 마크다운 파서: npm install marked  (없으면 자동 안내)
//   - Chromium: /opt/pw-browsers/chromium-*/chrome-linux/chrome (또는 CHROME_PATH 환경변수)
//
// 헤더/푸터 없는 깔끔한 본문 인쇄. 표·콜아웃(blockquote)·코드 스타일 포함.

const { execFileSync } = require("node:child_process");
const { writeFileSync, existsSync, readdirSync, unlinkSync, mkdtempSync } = require("node:fs");
const path = require("node:path");
const os = require("node:os");

let marked;
try { ({ marked } = require("marked")); }
catch { console.error("✗ 'marked' 가 없습니다. 먼저: npm install marked"); process.exit(1); }

const inArg = process.argv[2];
if (!inArg) { console.error("사용법: node scripts/build-doc-pdf.cjs <input.md> [output.pdf] [제목]"); process.exit(1); }
const inPath = path.resolve(inArg);
if (!existsSync(inPath)) { console.error(`✗ 입력 파일 없음: ${inPath}`); process.exit(1); }
const outPath = path.resolve(process.argv[3] || inPath.replace(/\.md$/i, ".pdf"));
const title = process.argv[4] || path.basename(inPath).replace(/\.md$/i, "");

const md = require("node:fs").readFileSync(inPath, "utf8");
// 첫 H1(# ...) 은 표지 제목으로 쓰므로 본문에서 그대로 두되, marked 가 렌더.
marked.setOptions({ gfm: true, breaks: false });
const bodyHtml = marked.parse(md);

const html = `<!doctype html><html lang=ko><head><meta charset=utf-8>
<style>
  @page { size: A4; margin: 16mm 14mm 16mm 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'NanumSquareRound','Noto Sans CJK KR','Noto Sans KR','NanumGothic',sans-serif;
    color: #1f2937; font-size: 10.5pt; line-height: 1.65; margin: 0;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  h1 { font-size: 20pt; color: #be185d; font-weight: 800; letter-spacing: -.3px; margin: 0 0 4px; line-height: 1.3; }
  h2 { font-size: 14pt; color: #9d174d; font-weight: 800; border-left: 5px solid #ec7fa6;
       padding-left: 10px; margin: 22px 0 10px; page-break-after: avoid; }
  h3 { font-size: 11.5pt; color: #be185d; font-weight: 700; margin: 16px 0 8px; page-break-after: avoid; }
  p { margin: 7px 0; }
  strong { color: #9d174d; }
  a { color: #be185d; text-decoration: none; word-break: break-all; }
  ul, ol { margin: 7px 0; padding-left: 20px; }
  li { margin: 4px 0; }
  code { background: #fce7f3; color: #9d174d; padding: 1px 5px; border-radius: 4px;
         font-size: 9pt; font-family: 'D2Coding','NanumGothicCoding',monospace; }
  hr { border: 0; border-top: 1px solid #f3c6dd; margin: 18px 0; }
  blockquote { background: #fdf2f8; border: 1px solid #f9cfe2; border-left: 4px solid #ec4899;
    border-radius: 8px; padding: 9px 14px; margin: 10px 0; color: #831843; font-size: 10pt;
    page-break-inside: avoid; }
  blockquote p { margin: 3px 0; }
  table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 9.3pt;
    page-break-inside: avoid; }
  th, td { border: 1px solid #f0c9dc; padding: 5px 8px; text-align: left; vertical-align: top; }
  th { background: #fce7f3; color: #9d174d; font-weight: 700; }
  tr:nth-child(even) td { background: #fffafc; }
  .cover-meta { color: #6b7280; font-size: 9pt; border-bottom: 2px solid #f3c6dd;
    padding-bottom: 10px; margin-bottom: 8px; }
</style></head>
<body>${bodyHtml}
<p class=cover-meta style="margin-top:24px;border-bottom:0;border-top:1px solid #f3c6dd;padding-top:8px">
  ${title} · 생성 ${new Date().toISOString().slice(0,10)} · Dewy</p>
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

const tmpDir = mkdtempSync(path.join(os.tmpdir(), "docpdf-"));
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
