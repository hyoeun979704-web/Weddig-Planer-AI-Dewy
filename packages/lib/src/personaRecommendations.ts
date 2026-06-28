import type { WeddingPersonaMode } from "@/lib/weddingPersona";
import { PLACE_CATEGORY_LABEL } from "@/lib/categoryLabels";

// 홈 "맞춤 추천"(Netflix식 행 스택)에서 각 페르소나에게 어떤 카테고리를 어떤 순서로
// 보여줄지 정의하는 단일 소스. 슬러그는 실제 places.category 값 + CATEGORY_CARD_TABLE
// 키와 동일(types.ts 로 검증). '더보기' 경로(SLUG_TO_LIST_PATH)가 있는 카테고리만
// 사용한다(죽은 링크 방지) — 그래서 jewelry/etc 는 제외.
export type RecCategorySlug =
  | "wedding_hall"
  | "studio"
  | "dress_shop"
  | "makeup_shop"
  | "hanbok"
  | "tailor_shop"
  | "honeymoon"
  | "appliance"
  | "invitation_venue";

// 표준(신부) 기본 묶음 — 대부분 페르소나의 공통 코어.
const CORE: RecCategorySlug[] = ["wedding_hall", "studio", "dress_shop", "makeup_shop"];

// 페르소나 → 추천 행 카테고리 순서. 페르소나의 우선 관심사를 앞쪽 행으로 끌어올린다
// (예: 신랑 주도=예복 강조, 셀프/스냅=식장 대신 스튜디오·드레스 우선, 노웨딩=허니문 먼저).
export const PERSONA_REC_CATEGORIES: Record<WeddingPersonaMode, RecCategorySlug[]> = {
  standard_bride: CORE,
  standard_groom: ["wedding_hall", "tailor_shop", "studio", "honeymoon"],
  // 호텔 웨딩 — 식장이 중심이고 격식 있는 드레스·메이크업 비중이 큼(예복은 별도 관심).
  luxury_hotel: ["wedding_hall", "dress_shop", "studio", "makeup_shop"],
  budget_analytic: ["wedding_hall", "studio", "dress_shop", "appliance"],
  designer_late: ["dress_shop", "studio", "wedding_hall", "makeup_shop"],
  first_timer: CORE,
  regional: CORE,
  remarriage: ["wedding_hall", "studio", "dress_shop", "honeymoon"],
  remarriage_with_children: ["wedding_hall", "studio", "dress_shop", "honeymoon"],
  remote_overseas: ["studio", "dress_shop", "invitation_venue", "honeymoon"],
  single_household: ["wedding_hall", "studio", "dress_shop", "honeymoon"],
  small_intimate: ["wedding_hall", "studio", "dress_shop", "hanbok"],
  // 야외 가든 — 촬영·드레스 비중이 크고 한복(혼주·가족) 수요도 있어 makeup 대신 hanbok.
  small_outdoor: ["wedding_hall", "studio", "dress_shop", "hanbok"],
  // 프라이빗 호텔 스몰 — 드레스·메이크업 완성도 중시(소수 정예).
  small_luxury: ["wedding_hall", "dress_shop", "studio", "makeup_shop"],
  // 알뜰 스몰 — 혼수(가전)까지 합리적으로 챙기는 성향이 강해 makeup 대신 appliance.
  small_budget: ["wedding_hall", "studio", "dress_shop", "appliance"],
  self_no_ceremony: ["studio", "dress_shop", "makeup_shop", "hanbok"],
  no_wedding_travel: ["honeymoon", "studio", "dress_shop", "appliance"],
  snap_only: ["studio", "dress_shop", "makeup_shop", "honeymoon"],
  pregnancy: ["studio", "dress_shop", "makeup_shop", "wedding_hall"],
  international: ["studio", "dress_shop", "invitation_venue", "honeymoon"],
};

// 슬러그 → 카테고리 목록('더보기') 경로. categoryRouteMap(한글 라벨 키)의 listPath 와
// 일치시킨다. 스튜디오·드레스·메이크업은 스드메 통합 목록(/vendors/스드메)으로 보낸다.
export const SLUG_TO_LIST_PATH: Record<RecCategorySlug, string> = {
  wedding_hall: "/vendors/웨딩홀",
  studio: "/vendors/스드메",
  dress_shop: "/vendors/스드메",
  makeup_shop: "/vendors/스드메",
  hanbok: "/vendors/한복",
  tailor_shop: "/vendors/예복",
  honeymoon: "/vendors/허니문",
  appliance: "/vendors/혼수",
  invitation_venue: "/vendors/청첩장",
};

// 행 제목 — 짧은 카테고리 라벨 단일 소스(categoryLabels) 재사용(드리프트 차단).
export const recRowTitle = (slug: RecCategorySlug): string =>
  `추천 ${PLACE_CATEGORY_LABEL[slug] ?? ""}`.trim();
