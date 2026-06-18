// 기업 온보딩 PDF 빌더 — 원본 "2단 단계별 매뉴얼" 디자인 재현 + 2026.06 개편 업데이트 반영.
// 좌: 모바일 캡처 카드 / 우: 번호 배지 + 제목(+상태 pill) + 불릿. A4, 한글 시스템폰트.
// 실행: PW_CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node scripts/build-onboarding-pdf.cjs
// 사전조건: 한글 폰트(apt-get install -y fonts-nanum fonts-noto-cjk && fc-cache -f).
// 캡처 소스: docs/assets/business-guide/*.png (상세페이지 캡처는 business-detail-redesign.png).

const { chromium } = require("playwright");
const { writeFileSync, existsSync, readdirSync } = require("node:fs");
const path = require("node:path");

const ASSET = "assets/business-guide";
const baseDir = path.resolve(__dirname, "../docs");
const out = path.resolve(__dirname, "../docs/business-onboarding-guide.pdf");

// 섹션 헤더("N단계 · …")와 스텝을 순서대로. pill: {t,kind} kind=now(즉시)|review(검토후)|new(개편)
const SECTIONS = [
  { header: "1단계 · 기업회원 가입", steps: [
    { img: "business-landing.png", n: 1, title: "입점 안내 페이지 열기", bullets: [
      "앱/웹에서 <b>입점 안내</b>(<code>/business</code>) 페이지로 들어갑니다.",
      "입점비·수수료 0원 등 혜택을 확인하고, 맨 아래 <b class=k>「기업회원 가입하고 입점하기」</b>를 누릅니다.",
      "이미 개인회원이면 마이페이지 → <b class=k>기업회원 전환</b>으로도 진입할 수 있어요.",
    ]},
    { img: "auth-business.png", n: 2, title: "기업회원으로 가입", bullets: [
      "회원가입 화면에서 오른쪽 <b class=k>「기업회원(웨딩 업체)」</b> 카드를 꼭 선택하세요(분홍 테두리).",
      "이메일·비밀번호·생년월일 입력 후 약관에 동의하고 <b class=k>「기업회원 가입」</b>.",
      "카카오·구글·애플 계정으로도 가능합니다.",
      "⚠️ 개인회원으로 가입하면 업체 관리 기능이 안 보여요.",
    ]},
    { img: "business-onboard.png", n: 3, title: "사업자 정보 입력 (국세청 자동 인증)", bullets: [
      "사업자등록번호·상호명·대표자명·개업일자를 <b class=k>사업자등록증과 똑같이</b> 입력합니다.",
      "글자 하나라도 다르면 인증이 실패할 수 있어요 — 등록증을 옆에 두고 그대로 옮겨 적으세요.",
      "이미 듀이에 우리 업체가 있다면, 새로 만들지 말고 <b class=k>「관리권한 요청」</b>으로 인수하세요.",
    ]},
    { img: "business-onboard-step2.png", n: 4, title: "카테고리 선택 + 제휴 신청(선택)", bullets: [
      "우리 업종 카테고리를 고릅니다(웨딩홀·스드메 … 기타).",
      "<b class=k>제휴업체(프렌즈) 함께 신청</b> 체크는 선택 — 나중에 대시보드에서도 신청할 수 있어요.",
      "<b class=k>「등록 신청」</b>으로 접수합니다.",
    ]},
    { img: "business-pending.png", n: 5, title: "승인 대기 — 진행 단계 확인", bullets: [
      "신청 후 <b class=k>「등록을 검토하고 있어요」</b> 화면이 나옵니다. 정상이에요.",
      "<b class=k>진행 단계</b>(① 가입 승인 → ② 정보 등록 → ③ 노출)로 현재 위치를 확인하세요.",
      "보통 <b class=k>1~2영업일</b> 내 승인되며, 승인되면 알림으로 안내드려요.",
    ]},
  ]},
  { header: "2단계 · 대시보드 둘러보기", steps: [
    { img: "business-dashboard.png", n: 6, title: "대시보드 — 업체 관리의 중심", bullets: [
      "상단에 업체 프로필과 <b class=k>통계</b>(조회수·찜·쿠폰·사진)가 보입니다.",
      "<b class=k>제휴(프렌즈) 신청 카드</b>: 업체 정보 6개 필수항목을 모두 채우면 신청 버튼이 활성화돼요.",
      "아래 <b class=k>관리 메뉴</b>에서 정보수정·사진·쿠폰·이벤트·상품·문의·견적·<b class=k>결과물 보내기</b>·후기로 이동합니다.",
    ]},
  ]},
  { header: "3단계 · 업체 정보 등록", steps: [
    { img: "business-edit.png", n: 7, title: "업체 정보 등록·수정", bullets: [
      "업체명·소개·지역·대표 사진·키워드를 입력합니다.",
      "<b class=k>「최소가·시작가」</b>는 <b class=k>목록·추천 카드의 <code>최저가~</code> 미리보기</b>와 검색·필터에 쓰여요.",
      "<b class=k>문의 받는 방법</b>(앱 내 문의 / 외부 링크 / 전화)을 선택하세요.",
      "저장하면 <b class=k>운영자 검토 후 반영</b>됩니다. <b class=k>「상세페이지 미리보기」</b>로 고객 화면을 확인하세요.",
    ]},
    { img: "business-detail-redesign.png", n: 8, title: "고객에게는 이렇게 보여요 (상세페이지)", pill: { t: "2026.06 개편", kind: "new" }, bullets: [
      "첫 화면에 <b class=k>이름 → 평점·지역 → <code>최저 OOO만원~</code> → 대표 사진</b>이 한눈에 들어와요.",
      "💰 첫 화면 대표 가격은 <b class=k>[상품 관리]의 패키지 가격</b>에서 나옵니다(최소가·시작가 칸이 아님).",
      "<b class=k>쿠폰</b>은 첫 화면 혜택군에 바로 노출, 사진은 탭하면 <b class=k>풀스크린</b>으로 크게 보여요.",
      "직접 정보를 채우고 검토를 통과하면 <b class=k>「✓ 업체가 직접 작성·검수」</b> 신뢰 배지가 붙어요.",
    ]},
  ]},
  { header: "4단계 · 세부 기능 사용", steps: [
    { img: "business-gallery.png", n: 9, title: "사진 / 메뉴 관리", pill: { t: "즉시 노출", kind: "now" }, bullets: [
      "사진을 업로드(드래그&드롭 또는 외부 URL)하면 <b class=k>검토 없이 즉시 노출</b>됩니다.",
      "대표 사진 외 갤러리를 채울수록 고객 신뢰도가 올라가고, 고객은 풀스크린으로 크게 봅니다.",
    ]},
    { img: "business-products.png", n: 10, title: "상품 / 패키지 관리", pill: { t: "검토 후", kind: "review" }, bullets: [
      "가격을 넣은 상품/패키지를 등록하면 상세 첫 화면·하단바에 <b class=k><code>최저 OOO만원~</code></b>으로 노출돼요.",
      "하나도 없으면 <code>가격은 문의로 안내해드려요</code>로 표시됩니다 → 꼭 1개 이상 등록하세요.",
    ]},
    { img: "business-coupons.png", n: 11, title: "쿠폰 발행", pill: { t: "검토 후", kind: "review" }, bullets: [
      "쿠폰명·할인 내용·최소 주문·만료일을 입력해 발행합니다.",
      "<b class=k>운영자 검토 후 노출</b>(보통 1영업일) — 첫 화면 혜택군에 떠서 강력한 고객 유인책이에요.",
    ]},
  ]},
];

const FAQ = [
  ["업체 관리 메뉴가 안 보여요", "개인회원으로 가입했을 가능성 → 마이페이지 <b class=k>기업회원 전환</b>. 또는 아직 가입 승인 전."],
  ["가입했는데 상세페이지가 안 보여요", "승인은 2단계예요(가입 승인 + 정보 <b class=k>검토 후 노출</b>). 정보 저장 후 검토를 기다리세요."],
  ["사업자 인증이 자꾸 실패해요", "상호·대표자명·<b class=k>개업일자</b>를 사업자등록증과 글자 하나까지 동일하게(띄어쓰기·㈜ 표기 포함)."],
  ["첫 화면 가격이 ‘문의로 안내’로만 떠요", "첫 화면 가격은 <b class=k>[상품 관리] 패키지 가격</b>에서 나와요 → 1개 이상 등록. ‘최소가·시작가’ 칸은 목록 카드·검색용."],
  ["‘✓ 직접 작성·검수’ 배지가 안 붙어요", "사장님이 <b class=k>직접 정보를 채우고</b> 운영자 검토를 통과해야 붙습니다."],
];

const pillCss = { now: "background:#dcfce7;color:#15803d;", review: "background:#fef3c7;color:#b45309;", new: "background:#fce7f3;color:#be185d;" };
const pill = (p) => p ? `<span class=pill style="${pillCss[p.kind]}">${p.t}</span>` : "";

const stepHtml = (s) => `
  <div class=step>
    <div class=shot><img src="${ASSET}/${s.img}" alt=""></div>
    <div class=desc>
      <div class=sttl><span class=badge>${s.n}</span><span class=ttltxt>${s.title}</span>${pill(s.pill)}</div>
      <ul>${s.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>
    </div>
  </div>`;

const sectionHtml = (sec) => `<h2>${sec.header}</h2>${sec.steps.map(stepHtml).join("")}`;

const body = `
  <h1>Dewy 사업자 사용 설명서</h1>
  <p class=sub>가입부터 대시보드·세부 기능까지 — 웨딩 업체 사장님을 위한 단계별 안내서</p>
  <div class=flow><b>전체 흐름</b><br>① 기업회원 가입 &nbsp;→&nbsp; ② 대시보드 &nbsp;→&nbsp; ③ 업체 정보 등록 &nbsp;→&nbsp; ④ 세부 기능(사진·쿠폰·문의·견적)</div>
  <div class=callout>💡 <b>승인은 2단계예요.</b> 가입하면 바로 노출되는 게 아니라, ⓐ 기업회원 <b class=k>가입 승인</b> → ⓑ 업체 정보 <b class=k>검토 후 노출</b> 두 관문을 거칩니다. "가입했는데 왜 안 보이지?"는 정상이에요.</div>
  ${SECTIONS.map(sectionHtml).join("")}
  <h2>자주 묻는 질문</h2>
  <div class=faq>${FAQ.map(([q, a]) => `<div class=qa><div class=q>${q}</div><div class=a>${a}</div></div>`).join("")}</div>
  <p class=foot>※ 화면은 실제 앱 캡처이며 일부는 데모용 샘플 데이터입니다. 실제 사장님 화면에는 본인 업체 데이터가 나타납니다.</p>`;

const html = `<!doctype html><html lang=ko><head><meta charset=utf-8><base href="file://${baseDir}/">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'NanumGothic','Noto Sans CJK KR','Noto Sans KR',sans-serif;color:#374151;font-size:13.5px;line-height:1.7;padding:6mm 2mm}
  h1{font-size:27px;color:#be185d;font-weight:800;letter-spacing:-.5px}
  .sub{color:#9ca3af;font-size:13px;margin:6px 0 16px;border-bottom:2.5px solid #f3c6dd;padding-bottom:14px}
  h2{font-size:17px;color:#be185d;font-weight:800;border-left:5px solid #ec7fa6;padding-left:11px;margin:26px 0 14px}
  .flow{background:#fdf2f8;border:1px solid #f9cfe2;border-radius:12px;padding:12px 16px;font-size:13px;color:#9d174d}
  .flow b{color:#be185d}
  .callout{background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:11px 16px;margin:12px 0 4px;font-size:12.5px;color:#7c2d12}
  .k{color:#db2777}
  code{background:#fce7f3;color:#9d174d;padding:1px 6px;border-radius:5px;font-size:12px;font-family:'NanumGothicCoding',monospace}
  .step{display:flex;gap:20px;align-items:flex-start;border:1px solid #f5d6e5;border-radius:16px;padding:16px 18px;margin:12px 0;background:#fffdfe;page-break-inside:avoid}
  .shot{flex:0 0 240px}
  .shot img{width:240px;border:1px solid #efd0e0;border-radius:16px;box-shadow:0 2px 10px rgba(190,24,93,.08);display:block}
  .desc{flex:1;padding-top:4px}
  .sttl{display:flex;align-items:center;gap:9px;margin-bottom:10px;flex-wrap:wrap}
  .badge{flex:0 0 auto;width:26px;height:26px;border-radius:50%;background:#ec4899;color:#fff;font-weight:800;font-size:14px;display:inline-flex;align-items:center;justify-content:center}
  .ttltxt{font-size:16.5px;font-weight:800;color:#9d174d}
  .pill{font-size:11px;font-weight:700;padding:2px 9px;border-radius:999px}
  ul{padding-left:4px;list-style:none}
  li{position:relative;padding-left:16px;margin:7px 0;font-size:13.5px}
  li:before{content:"•";position:absolute;left:0;color:#ec7fa6;font-weight:800}
  .faq{display:flex;flex-direction:column;gap:8px}
  .qa{border:1px solid #f5d6e5;border-radius:12px;padding:10px 14px;background:#fffdfe;page-break-inside:avoid}
  .q{font-weight:800;color:#9d174d;font-size:13.5px;margin-bottom:3px}
  .q:before{content:"Q. ";color:#ec4899}
  .a{font-size:12.8px;color:#4b5563}
  .foot{color:#9ca3af;font-size:11px;margin-top:18px;border-top:1px solid #f3c6dd;padding-top:10px}
</style></head><body>${body}</body></html>`;

function resolveChrome() {
  if (process.env.PW_CHROME_PATH && existsSync(process.env.PW_CHROME_PATH)) return process.env.PW_CHROME_PATH;
  try {
    const hit = readdirSync("/opt/pw-browsers").find((d) => d.startsWith("chromium-") && !d.includes("headless"));
    const ep = hit && `/opt/pw-browsers/${hit}/chrome-linux/chrome`;
    if (ep && existsSync(ep)) return ep;
  } catch { /* */ }
  return undefined;
}

(async () => {
  const tmp = path.join(baseDir, ".__onboarding_tmp.html");
  writeFileSync(tmp, html);
  const browser = await chromium.launch({ executablePath: resolveChrome(), headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.goto(`file://${tmp}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(900);
  await page.pdf({ path: out, format: "A4", printBackground: true, margin: { top: "12mm", bottom: "12mm", left: "11mm", right: "11mm" } });
  await browser.close();
  require("node:fs").unlinkSync(tmp);
  console.log(`✓ ${out}`);
})();
