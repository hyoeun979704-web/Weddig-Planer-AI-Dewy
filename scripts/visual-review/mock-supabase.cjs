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

// ── 기업(business) 가이드 캡처용 데이터 (MOCK_BUSINESS=1 일 때만) ──────────────
// 사용법: MOCK_BUSINESS=1 [MOCK_APPROVAL=approved|pending|rejected] node ... mock-supabase.cjs
// scripts/capture-guide-shots.cjs 가 게이트된 업체 관리 페이지를 실계정 없이 렌더하기 위해 사용.
// 썸네일은 외부 네트워크 없이 보이도록 data-URI SVG 로 생성.
const PLACE_ID = "00000000-0000-0000-0000-0000000000b1";
const BP_ID = "00000000-0000-0000-0000-0000000000c1";
const CUST_ID = "00000000-0000-0000-0000-0000000000d1"; // 가짜 고객(견적·문의·채팅 상대)
const APPROVAL = process.env.MOCK_APPROVAL || "approved";

// 그라데이션 썸네일(라벨 옵션) — <img src> 에 그대로 들어가는 data-URI.
function thumb(label = "", from = "#fce7f3", to = "#fbcfe8") {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='800'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='${from}'/><stop offset='1' stop-color='${to}'/></linearGradient></defs>` +
    `<rect width='600' height='800' fill='url(#g)'/>` +
    (label
      ? `<text x='300' y='420' font-family='sans-serif' font-size='44' font-weight='700' fill='#be185d' text-anchor='middle'>${label}</text>`
      : "") +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// 업체 place 행 — 대시보드(get_my_listing)·공개 상세(usePlaceDetail → .from("places"))
// 양쪽에서 공용. usePlaceDetail 의 큰 SELECT 는 목이 컬럼 투영을 무시하고 행 전체를
// 돌려주므로 핵심 필드만 채우면 나머지는 undefined → 조건부 섹션이 자연 생략된다.
const PLACE_ROW = {
  place_id: PLACE_ID, name: "더위드 웨딩스튜디오 강남점", category: process.env.MOCK_CATEGORY || "studio",
  city: "서울특별시", district: "강남구", road_address: "서울 강남구 테헤란로 123",
  description: "자연광 가득한 단독 스튜디오. 본식스냅·한복화보 전문.",
  main_image_url: thumb("대표사진"), min_price: 890000,
  tags: ["강남", "자연광", "본식스냅"], moderation_status: "approved",
  view_count: 1542, owner_user_id: USER_ID, inquiry_channel: "chat",
  is_partner: true, avg_rating: 4.9, review_count: 17,
};

// 비교·찜·카테고리 화면이 비어 보이지 않게 추가 업체 2곳(가이드 캡처용).
const PLACE_ID2 = "00000000-0000-0000-0000-0000000000b2";
const PLACE_ID3 = "00000000-0000-0000-0000-0000000000b3";
const PLACE_ROW2 = {
  place_id: PLACE_ID2, name: "더채플 앳 청담", category: "wedding_hall",
  city: "서울특별시", district: "강남구", road_address: "서울 강남구 청담동 99",
  description: "채플형 단독 웨딩홀. 하객 동선·주차 편리.",
  main_image_url: thumb("더채플 청담", "#fde68a", "#fca5a5"), min_price: 12000000,
  tags: ["청담", "채플", "단독홀"], moderation_status: "approved",
  view_count: 2310, owner_user_id: null, inquiry_channel: "chat",
  is_partner: true, partner_rank: 2, avg_rating: 4.8, review_count: 42,
};
const PLACE_ID5 = "00000000-0000-0000-0000-0000000000b5";
const PLACE_ROW5 = {
  place_id: PLACE_ID5, name: "그랜드 컨벤션 삼성", category: "wedding_hall",
  city: "서울특별시", district: "강남구", road_address: "서울 강남구 삼성동 55",
  description: "대형 컨벤션 웨딩홀. 최대 400명 수용.",
  main_image_url: thumb("그랜드 컨벤션", "#cffafe", "#a5f3fc"), min_price: 9000000,
  tags: ["삼성동", "컨벤션", "대형홀"], moderation_status: "approved",
  view_count: 1760, owner_user_id: null, inquiry_channel: "chat",
  is_partner: false, partner_rank: 0, avg_rating: 4.5, review_count: 31,
};
const PLACE_ID4 = "00000000-0000-0000-0000-0000000000b4";
const PLACE_ROW4 = {
  place_id: PLACE_ID4, name: "위드유 스튜디오 분당", category: "studio",
  city: "경기도", district: "성남시 분당구", road_address: "경기 성남시 분당구 정자동 7",
  description: "감성 본식스냅·야외촬영 전문 스튜디오.",
  main_image_url: thumb("위드유 스튜디오", "#dcfce7", "#bbf7d0"), min_price: 1100000,
  tags: ["분당", "감성", "야외촬영"], moderation_status: "approved",
  view_count: 870, owner_user_id: null, inquiry_channel: "chat",
  is_partner: false, partner_rank: 0, avg_rating: 4.6, review_count: 15,
};
const PLACE_ROW3 = {
  place_id: PLACE_ID3, name: "라보떼 드레스 강남", category: "dress_shop",
  city: "서울특별시", district: "강남구", road_address: "서울 강남구 신사동 12",
  description: "수입·국내 디자이너 드레스 셀렉샵.",
  main_image_url: thumb("라보떼 드레스", "#ede9fe", "#ddd6fe"), min_price: 900000,
  tags: ["신사", "수입드레스", "맞춤"], moderation_status: "approved",
  view_count: 1180, owner_user_id: null, inquiry_channel: "chat",
  is_partner: false, partner_rank: 0, avg_rating: 4.7, review_count: 23,
};

if (process.env.MOCK_BUSINESS === "1") {
  Object.assign(ROWS, {
    places: [PLACE_ROW, PLACE_ROW2, PLACE_ROW3, PLACE_ROW4, PLACE_ROW5],
    user_roles: [{ user_id: USER_ID, role: "business" }],
    business_profiles: [{
      id: BP_ID, user_id: USER_ID,
      business_name: "더위드 웨딩스튜디오", business_number: "123-45-67890",
      representative_name: "김디지", service_category: "studio",
      is_verified: true, vendor_id: 9001,
      approval_status: APPROVAL, review_note: APPROVAL === "rejected" ? "사업자등록증 사진이 흐립니다. 다시 업로드해 주세요." : null,
      partner_tier: "bff",
    }],
    partnership_applications: [{ id: "pa1", business_profile_id: BP_ID, status: "interviewing", created_at: new Date().toISOString() }],
    place_media: [
      { id: "pm1", place_id: PLACE_ID, kind: "photo", image_url: thumb("스튜디오 A"), title: null, price: null, album_id: "alb1", display_order: 1 },
      { id: "pm2", place_id: PLACE_ID, kind: "photo", image_url: thumb("야외 촬영", "#ede9fe", "#ddd6fe"), title: null, price: null, album_id: "alb1", display_order: 2 },
      { id: "pm3", place_id: PLACE_ID, kind: "photo", image_url: thumb("한복 화보", "#fef3c7", "#fde68a"), title: null, price: null, album_id: "alb2", display_order: 3 },
      { id: "pm4", place_id: PLACE_ID, kind: "photo", image_url: thumb("커플 스냅", "#dcfce7", "#bbf7d0"), title: null, price: null, album_id: null, display_order: 4 },
    ],
    place_media_albums: [
      { id: "alb1", place_id: PLACE_ID, title: "260402_본식스냅", shoot_date: "2026-04-02", venue_name: "그랜드웨딩홀 강남", style_tags: ["내추럴", "필름"], product_id: "prod1" },
      { id: "alb2", place_id: PLACE_ID, title: "260315_한복화보", shoot_date: "2026-03-15", venue_name: "스튜디오 본점", style_tags: ["전통", "한복"], product_id: null },
    ],
    business_products: [
      { id: "prod1", place_id: PLACE_ID, name: "프리미엄 본식 패키지", price: 3500000, description: "원본 전체 + 수정본 50컷 + 액자", image_url: thumb("패키지"), moderation_status: "approved", moderation_note: null },
      { id: "prod2", place_id: PLACE_ID, name: "스냅 단독 촬영", price: 890000, description: "촬영 2시간 + 보정 30컷", image_url: thumb("스냅", "#e0f2fe", "#bae6fd"), moderation_status: "pending", moderation_note: null },
    ],
    business_coupons: [
      { id: "c1", place_id: PLACE_ID, title: "봄 시즌 얼리버드", discount_text: "15% 할인", min_order_won: 1000000, expires_at: "2026-12-31T23:59:59Z", is_active: true, moderation_status: "approved", moderation_note: null },
      { id: "c2", place_id: PLACE_ID, title: "주중 예약 특가", discount_text: "20만원 할인", min_order_won: 2000000, expires_at: "2026-09-30T23:59:59Z", is_active: true, moderation_status: "pending", moderation_note: null },
    ],
    place_reviews: [
      { review_id: "rv1", place_id: PLACE_ID, rating: 5, content: "사진이 정말 자연스럽게 나왔어요!", created_at: new Date().toISOString() },
      { review_id: "rv2", place_id: PLACE_ID, rating: 5, content: "친절하고 결과물도 만족스러웠습니다.", created_at: new Date().toISOString() },
    ],
    favorites: [],
    // ── 상세 가이드(견적·문의·이벤트·결과물)용 ──────────────────────────────
    business_events: [
      { id: "ev1", place_id: PLACE_ID, owner_user_id: USER_ID, title: "봄맞이 예약 할인",
        description: "4월 안에 예약하시면 촬영비 10% 할인해 드려요.", starts_at: "2026-04-01", ends_at: "2026-04-30",
        banner_image_url: thumb("이벤트 배너", "#fde68a", "#fca5a5"), detail_images: [],
        moderation_status: "approved", moderation_note: null, created_at: new Date().toISOString() },
    ],
    place_inquiries: [
      { id: "iq1", place_id: PLACE_ID, user_id: CUST_ID, title: "6월 마지막 주 촬영 가능한가요?",
        content: "신혼부부입니다. 6월 28일 본식스냅 예약 가능한지 문의드려요.", contact: "010-1234-5678",
        status: "open", answer: null, answered_at: null, created_at: new Date(Date.now() - 36e5).toISOString() },
      { id: "iq2", place_id: PLACE_ID, user_id: CUST_ID, title: "한복 화보 패키지 문의",
        content: "한복 화보도 진행하시나요? 가격이 궁금합니다.", contact: "010-2222-3333",
        status: "answered", answer: "네, 한복 화보 패키지 89만원부터 진행합니다!", answered_at: new Date().toISOString(),
        created_at: new Date(Date.now() - 72e5).toISOString() },
    ],
    quote_request_targets: [
      // 답변 전(none) — '견적 답변하기' 버튼 노출
      { request_id: "qr1", place_id: PLACE_ID, owner_user_id: USER_ID,
        quote_requests: { id: "qr1", user_id: CUST_ID, category: "studio", region_city: "서울", region_district: "강남",
          budget_min: 80, budget_max: 150, wedding_date: "2026-08-15", style: "natural",
          note: "본식스냅 + 원본 전체 받고 싶어요. 자연광 스튜디오 선호합니다.", image_paths: [],
          status: "open", created_at: new Date(Date.now() - 18e5).toISOString() } },
      // 수락됨(accepted) — '고객과 메시지' + 연락처 노출
      { request_id: "qr2", place_id: PLACE_ID, owner_user_id: USER_ID,
        quote_requests: { id: "qr2", user_id: CUST_ID, category: "studio", region_city: "서울", region_district: "송파",
          budget_min: 100, budget_max: 200, wedding_date: "2026-09-20", style: "modern",
          note: "한복 화보까지 함께 견적 부탁드려요.", image_paths: [],
          status: "open", created_at: new Date(Date.now() - 54e5).toISOString() } },
    ],
    quote_responses: [
      { id: "qrs1", request_id: "qr2", place_id: PLACE_ID, owner_user_id: USER_ID,
        message: "한복 화보 포함 패키지로 진행 가능합니다.", price_min: 120, price_max: 160,
        status: "accepted", created_at: new Date().toISOString() },
    ],
    quote_messages: [
      { id: "qm1", request_id: "qr2", place_id: PLACE_ID, sender_user_id: CUST_ID,
        body: "안녕하세요! 견적 보고 연락드려요. 9월 셋째 주 가능할까요?", created_at: new Date(Date.now() - 12e5).toISOString() },
      { id: "qm2", request_id: "qr2", place_id: PLACE_ID, sender_user_id: USER_ID,
        body: "안녕하세요 :) 9월 20일 토요일 오후 예약 가능합니다! 원하시는 컨셉 있으실까요?", created_at: new Date(Date.now() - 9e5).toISOString() },
      { id: "qm3", request_id: "qr2", place_id: PLACE_ID, sender_user_id: CUST_ID,
        body: "내추럴한 분위기로 부탁드려요. 한복 화보도 같이 하고 싶어요!", created_at: new Date(Date.now() - 6e5).toISOString() },
    ],
    // ── 소비자 개인 데이터 (가이드 캡처용 — 빈 화면 방지) ────────────────────
    favorites: [
      { id: "f1", user_id: USER_ID, item_id: PLACE_ID, item_type: "studio", created_at: new Date(Date.now() - 2 * 864e5).toISOString() },
      { id: "f2", user_id: USER_ID, item_id: PLACE_ID2, item_type: "venue", created_at: new Date(Date.now() - 5 * 864e5).toISOString() },
      { id: "f3", user_id: USER_ID, item_id: PLACE_ID3, item_type: "dress", created_at: new Date(Date.now() - 1 * 864e5).toISOString() },
      { id: "f4", user_id: USER_ID, item_id: PLACE_ID4, item_type: "studio", created_at: new Date(Date.now() - 3 * 864e5).toISOString() },
      { id: "f5", user_id: USER_ID, item_id: PLACE_ID5, item_type: "venue", created_at: new Date(Date.now() - 4 * 864e5).toISOString() },
    ],
    // 내 견적 요청(소비자 /quote 목록) — USER_ID 기준
    quote_requests: [
      { id: "myq1", user_id: USER_ID, category: "studio", region_city: "서울", region_district: "강남", budget_min: 100, budget_max: 200, wedding_date: "2026-09-20", style: "natural", note: "본식스냅 + 원본 전체 희망", image_paths: [], status: "open", created_at: new Date(Date.now() - 20 * 36e5).toISOString() },
      { id: "myq2", user_id: USER_ID, category: "wedding_hall", region_city: "서울", region_district: "강남", budget_min: 1000, budget_max: 1800, wedding_date: "2026-09-20", style: null, note: "200명 보증 가능한 채플홀 찾아요", image_paths: [], status: "open", created_at: new Date(Date.now() - 50 * 36e5).toISOString() },
    ],
    budget_settings: [
      { id: "bs1", user_id: USER_ID, region: "서울특별시", total_budget: 35000000, guest_count: 200, category_budgets: {}, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ],
    budget_items: [
      { id: "bi1", user_id: USER_ID, category: "웨딩홀", amount: 12000000, item_date: "2026-05-02", memo: "계약금+잔금", paid_by: "공동", has_balance: true, balance_amount: 9000000, balance_due_date: "2026-08-01", created_at: new Date().toISOString() },
      { id: "bi2", user_id: USER_ID, category: "스튜디오", amount: 1800000, item_date: "2026-05-10", memo: "본식+촬영", paid_by: "신부", has_balance: false, balance_amount: null, balance_due_date: null, created_at: new Date().toISOString() },
      { id: "bi3", user_id: USER_ID, category: "드레스", amount: 2400000, item_date: "2026-05-12", memo: "대여 3벌", paid_by: "신부", has_balance: false, balance_amount: null, balance_due_date: null, created_at: new Date().toISOString() },
      { id: "bi4", user_id: USER_ID, category: "예물", amount: 3000000, item_date: "2026-06-01", memo: "커플링", paid_by: "신랑", has_balance: false, balance_amount: null, balance_due_date: null, created_at: new Date().toISOString() },
    ],
    vendor_board_items: [
      { id: "vb1", user_id: USER_ID, slot_key: "venue", status: "booked", place_id: PLACE_ID2, vendor_name: "더채플 앳 청담", custom_label: null, memo: "5월 2일 계약", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "vb2", user_id: USER_ID, slot_key: "studio", status: "quoting", place_id: PLACE_ID, vendor_name: "더위드 웨딩스튜디오 강남점", custom_label: null, memo: "견적 대기 중", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "vb3", user_id: USER_ID, slot_key: "dress", status: "undecided", place_id: PLACE_ID3, vendor_name: "라보떼 드레스 강남", custom_label: null, memo: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ],
    community_posts: [
      { id: "cp1", user_id: CUST_ID, category: "review", title: "더위드 스튜디오 본식스냅 후기 (강남)", content: "자연광이 정말 예쁘게 나왔어요. 원본도 전부 주셔서 만족스러웠습니다!", like_count: 42, comment_count: 12, views: 530, has_image: true, image_urls: [thumb("후기 사진", "#fce7f3", "#fbcfe8")], wedding_style: null, created_at: new Date(Date.now() - 36e5).toISOString(), updated_at: new Date().toISOString() },
      { id: "cp2", user_id: CUST_ID, category: "tip", title: "스드메 견적 비교 꿀팁 정리", content: "견적 받을 때 원본/수정본 장수, 추가금, 헬퍼비 꼭 확인하세요. 표로 비교하면 편해요.", like_count: 88, comment_count: 25, views: 1200, has_image: false, image_urls: null, wedding_style: null, created_at: new Date(Date.now() - 72e5).toISOString(), updated_at: new Date().toISOString() },
      { id: "cp3", user_id: CUST_ID, category: "qna", title: "6월 웨딩홀 보증인원 협의 가능한가요?", content: "보증인원 200명인데 조정해보신 분 계신가요? 팁 부탁드려요!", like_count: 7, comment_count: 9, views: 210, has_image: false, image_urls: null, wedding_style: null, created_at: new Date(Date.now() - 108e5).toISOString(), updated_at: new Date().toISOString() },
    ],
    invitations: [
      { id: "inv1", user_id: USER_ID, status: "published", template_id: "tpl-natty", back_template_id: null, layout: {}, user_data: { groom: "민준", bride: "서연", date: "2026-09-20" }, ai_generated_text: null, preview_image_path: thumb("우리 청첩장", "#fee2e2", "#fecaca"), share_slug: "minjun-seoyeon", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ],
    user_points: [
      { id: "up1", user_id: USER_ID, balance: 3200, total_earned: 5000, total_points: 3200, total_spent: 1800, updated_at: new Date().toISOString() },
    ],
    orders: [
      { id: "o1", user_id: USER_ID, order_number: "DW260518ABC123", status: "paid", total_amount: 89000, payment_method: "kakaopay", paid_at: new Date(Date.now() - 4 * 864e5).toISOString(), shipping_name: "preview", shipping_phone: "010-1234-5678", shipping_address: "서울 강남구", shipping_memo: null, created_at: new Date(Date.now() - 4 * 864e5).toISOString(), updated_at: new Date().toISOString() },
    ],
  });
}

// count=exact 요청(.select(..,{count:'exact',head:true}))에 돌려줄 합계.
// 실제 행 수와 무관하게 그럴듯한 통계 숫자를 노출(대시보드).
const COUNTS = {
  favorites: 128, place_media: 24, place_reviews: 17,
};

// RPC 결과 — 이름별. 없는 RPC 는 {} (기본).
const RPC = {
  get_my_listings: () => [PLACE_ROW],
  get_my_listing: () => PLACE_ROW,
  get_my_coupon_download_count: () => 36,
  get_place_detail: () => PLACE_ROW,
  // 견적(리드) 가이드용
  get_business_quote_funnel: () => ({ leads: 2, responded: 1, accepted: 1, booked: 0 }),
  get_quote_lead_contact: () => ({ ok: true, name: "김신부", phone: "010-1234-5678" }),
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
// 기업 가이드 캡처 모드: account_type=business (needsOnboarding/전환 로직용).
if (process.env.MOCK_BUSINESS === "1") USER.user_metadata = { account_type: "business" };
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
  if (path.startsWith("/rest/v1/rpc/")) {
    const name = path.slice("/rest/v1/rpc/".length).split("?")[0];
    const fn = RPC[name];
    return send(res, 200, fn ? fn() : {});
  }
  if (path.startsWith("/rest/v1/")) {
    const table = path.slice("/rest/v1/".length).split("?")[0];
    const prefer = req.headers["prefer"] || "";
    const wantsCount = prefer.includes("count=");
    const rows = ROWS[table] || [];
    // count=exact + head:true → HEAD 요청. 본문 없이 Content-Range 로 합계 전달.
    if (method === "HEAD" || (wantsCount && method === "GET")) {
      const n = COUNTS[table] ?? rows.length;
      const extra = { "Content-Range": `0-${Math.max(0, n - 1)}/${n}` };
      if (method === "HEAD") {
        try { res.writeHead(200, { "Content-Type": "application/json", ...CORS, ...extra }); res.end(""); } catch { /* */ }
        return;
      }
      return send(res, 200, wantsObject ? (rows[0] ?? null) : rows, extra);
    }
    if (method === "GET") {
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
