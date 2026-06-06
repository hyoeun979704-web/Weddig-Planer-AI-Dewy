// 로컬 목(mock) Supabase — 로그인 이후 화면을 **실백엔드·실계정 없이** 비주얼 검토하기 위한
// 최소 스텁. 앱을 여기로 보내려면 dev 서버를 다음 env 로 띄운다:
//   VITE_SUPABASE_URL=http://127.0.0.1:9999 VITE_SUPABASE_ANON_KEY=mock \
//     npm run dev:vite -- --host 127.0.0.1 --port 5199
//
// 보안: 실데이터·실토큰 없음(전부 가짜 로컬). 검토 후 프로세스 종료하면 끝.
// 한계: 화면이 호출하는 테이블/RPC 응답을 "그럴듯하게" 돌려줄 뿐 — 새 화면을 검토하려면
//       MOCK_TABLES 에 케이스를 추가하면 된다.

const http = require("node:http");

// 크래시 방지 — 끊긴 소켓 EPIPE 등 비치명 오류로 프로세스가 죽지 않게.
process.on("uncaughtException", (e) => console.error("mock uncaught:", e.message));

const PORT = Number(process.env.MOCK_PORT || 9999);
const USER_ID = "00000000-0000-0000-0000-0000000000aa";
const EMAIL = "preview@mock.local";

// 검토할 페르소나 시나리오 — 필요 시 env 로 덮어쓴다.
//   MOCK_MARITAL=remarriage MOCK_HAS_CHILDREN=1 MOCK_PLANNING=budget_analytic
const SETTINGS = {
  user_id: USER_ID,
  wedding_date: null, partner_name: null, wedding_region: null, planning_stage: "just_started",
  wedding_date_tbd: false, wedding_region_tbd: false, wedding_style: null, excluded_categories: [],
  marital_history: process.env.MOCK_MARITAL || "remarriage",
  has_children: process.env.MOCK_HAS_CHILDREN === "1",
  planning_style: process.env.MOCK_PLANNING || null,
  pregnant: false, pregnancy_due_date: null, role: null, country: "KR", wedding_country: "KR",
  wedding_region_sigungu: null, has_parents_bride: true, has_parents_groom: true, ceremony_type: null,
  persona_mode: "remarriage", wedding_venue_place_id: null, wedding_venue_name: null,
  wedding_venue_address: null, wedding_venue_city: null, wedding_venue_district: null,
  wedding_venue_lat: null, wedding_venue_lng: null,
};

const CONSENT = {
  user_id: USER_ID, consent_type: "data_collection_v1", consent_version: 1,
  agreed: true, created_at: new Date().toISOString(),
};

// 테이블별 행. 없는 테이블은 빈 결과.
const ROWS = {
  user_wedding_settings: [SETTINGS],
  user_consents: [CONSENT],
};

function b64url(o) {
  return Buffer.from(JSON.stringify(o)).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function fakeJwt() {
  const now = Math.floor(Date.now() / 1000);
  return `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ sub: USER_ID, role: "authenticated", aud: "authenticated", email: EMAIL, exp: now + 3600, iat: now })}.mock-sig`;
}
const USER = {
  id: USER_ID, aud: "authenticated", role: "authenticated", email: EMAIL,
  email_confirmed_at: new Date().toISOString(), phone: "", confirmed_at: new Date().toISOString(),
  app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {},
  identities: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
};
function session() {
  const now = Math.floor(Date.now() / 1000);
  return { access_token: fakeJwt(), token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: "mock-refresh-token", user: USER };
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept, accept-profile, content-profile, prefer, x-supabase-api-version",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  "Access-Control-Expose-Headers": "content-range, content-profile",
};

function send(res, code, body, extra = {}) {
  try {
    res.writeHead(code, { "Content-Type": "application/json", ...CORS, ...extra });
    res.end(body == null ? "" : JSON.stringify(body));
  } catch { /* socket 끊김 무시 */ }
}

http.createServer((req, res) => {
  const { method } = req;
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const wantsObject = (req.headers["accept"] || "").includes("vnd.pgrst.object");

  if (method === "OPTIONS") return send(res, 204, null);

  // ── Auth (GoTrue) ──────────────────────────────────────────────
  if (path.startsWith("/auth/v1/token")) return send(res, 200, session());
  if (path === "/auth/v1/user") return send(res, 200, USER);
  if (path === "/auth/v1/logout") return send(res, 204, null);
  if (path.startsWith("/auth/v1/")) return send(res, 200, {});

  // ── PostgREST (REST API) ──────────────────────────────────────
  if (path.startsWith("/rest/v1/rpc/")) return send(res, 200, {});
  if (path.startsWith("/rest/v1/")) {
    const table = path.slice("/rest/v1/".length).split("?")[0];
    if (method === "GET") {
      const rows = ROWS[table] || [];
      // .single()/.maybeSingle() 은 object accept → 단일 객체(없으면 null).
      return send(res, 200, wantsObject ? (rows[0] ?? null) : rows);
    }
    // 쓰기(PATCH/POST/PUT) — 받은 걸 그대로 echo (저장 성공처럼).
    let buf = "";
    req.on("data", (c) => (buf += c));
    req.on("end", () => send(res, 200, wantsObject ? {} : []));
    return;
  }

  // 그 외(Storage/Functions 등) — 빈 성공.
  return send(res, 200, {});
}).listen(PORT, "127.0.0.1", () => {
  console.log(`mock-supabase on http://127.0.0.1:${PORT}  (user=${EMAIL}, marital=${SETTINGS.marital_history}, has_children=${SETTINGS.has_children}, planning_style=${SETTINGS.planning_style})`);
});
