// 마크다운 가이드 → PDF 생성기 (한글 폰트 + 이미지 포함).
// 사용: PW_CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
//        node scripts/md-to-pdf.cjs docs/business-onboarding-guide.md docs/business-onboarding-guide.pdf
// 도구: marked(GFM→HTML) + Playwright chromium(page.pdf). 한글은 시스템 폰트(Nanum/Noto CJK) 사용.
// 사전조건(한글 깨짐 방지): 한글 폰트 설치 — apt-get install -y fonts-nanum fonts-noto-cjk && fc-cache -f
//   (없으면 두부(□) 현상). chromium 경로는 PW_CHROME_PATH 또는 /opt/pw-browsers 자동탐지.
// <img src="assets/..."> 상대경로는 <base href="file://<md 디렉토리>/"> 로 해석.

const { chromium } = require("playwright");
const { readFileSync, writeFileSync, existsSync, readdirSync } = require("node:fs");
const path = require("node:path");
const { marked } = require("marked");

const [, , mdArg, outArg] = process.argv;
if (!mdArg || !outArg) { console.error("usage: node md-to-pdf.cjs <in.md> <out.pdf>"); process.exit(1); }
const mdPath = path.resolve(mdArg);
const outPath = path.resolve(outArg);
const baseDir = path.dirname(mdPath);

marked.setOptions({ gfm: true, breaks: false });
const bodyHtml = marked.parse(readFileSync(mdPath, "utf8"));

// 인쇄용 스타일 — 한글 폰트 스택, 표 테두리, 이미지 폭 제한, 페이지 여백.
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<base href="file://${baseDir}/">
<style>
  * { box-sizing: border-box; }
  body { font-family: 'NanumGothic','Noto Sans CJK KR','Noto Sans KR',sans-serif;
         color: #1f2937; line-height: 1.7; font-size: 13px; margin: 0; padding: 0; }
  h1 { font-size: 26px; border-bottom: 3px solid #ec7fa6; padding-bottom: 8px; margin: 0 0 16px; color:#be185d; }
  h2 { font-size: 19px; margin: 28px 0 10px; color:#be185d; border-left: 5px solid #ec7fa6; padding-left: 10px; }
  h3 { font-size: 15px; margin: 20px 0 8px; color:#9d174d; }
  p, li { font-size: 13px; }
  a { color: #db2777; text-decoration: none; }
  code { background:#fce7f3; color:#9d174d; padding:1px 5px; border-radius:4px; font-size:12px;
         font-family:'NanumGothicCoding',monospace; }
  pre { background:#1f2937; color:#f9fafb; padding:14px; border-radius:8px; overflow:auto; font-size:12px; }
  pre code { background:none; color:inherit; padding:0; }
  blockquote { background:#fdf2f8; border-left:4px solid #f9a8d4; margin:12px 0; padding:8px 14px; border-radius:0 8px 8px 0; }
  blockquote p { margin:4px 0; }
  table { border-collapse: collapse; width:100%; margin:12px 0; font-size:12px; }
  th, td { border:1px solid #f3c6dd; padding:7px 9px; text-align:left; vertical-align:top; }
  th { background:#fce7f3; color:#9d174d; font-weight:700; }
  tr:nth-child(even) td { background:#fdf6fa; }
  img { max-width: 280px; height:auto; display:block; margin:12px auto; border:1px solid #f3c6dd; border-radius:12px; }
  hr { border:none; border-top:1px solid #f3c6dd; margin:24px 0; }
  sub { color:#9ca3af; font-size:11px; }
  h1,h2,h3 { page-break-after: avoid; }
  table, img, blockquote { page-break-inside: avoid; }
</style></head><body>${bodyHtml}</body></html>`;

const tmpHtml = path.join(baseDir, ".__md2pdf_tmp.html");
writeFileSync(tmpHtml, html);

function resolveChrome() {
  if (process.env.PW_CHROME_PATH && existsSync(process.env.PW_CHROME_PATH)) return process.env.PW_CHROME_PATH;
  const dir = "/opt/pw-browsers";
  try {
    const hit = readdirSync(dir).find((d) => d.startsWith("chromium-") && !d.includes("headless"));
    const ep = hit && `${dir}/${hit}/chrome-linux/chrome`;
    if (ep && existsSync(ep)) return ep;
  } catch { /* */ }
  return undefined;
}

(async () => {
  const browser = await chromium.launch({ executablePath: resolveChrome(), headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.goto(`file://${tmpHtml}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(800);
  await page.pdf({
    path: outPath, format: "A4", printBackground: true,
    margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
  });
  await browser.close();
  require("node:fs").unlinkSync(tmpHtml);
  console.log(`✓ PDF 생성: ${outPath}`);
})();
