// 내 업체 보드 택소노미 — 예비신부가 쓰레드처럼 "결혼 준비에 필요한 모든 업체 카테고리"를
// 한 화면에 슬롯으로 펼쳐두고 각 슬롯을 선택 업체/견적중/미정으로 채우는 정리 도구의 단일 소스.
//
// 슬롯은 places.category(10종)보다 더 세분(제주스냅·승마스냅·아이폰스냅·사회자·본식DVD·
// 본식부케·혼주 한복/메이크업 등)이다. Dewy 공급(매칭 가능)이 있는 슬롯에만 quoteCategory 를
// 두어 견적 매칭으로 보낸다. 공급이 없는 슬롯은 "둘러보기(기타)" 또는 "직접 기록"만 제공해
// 죽은(toast-only) CTA 를 만들지 않는다.
//
// 라벨(표시) ↔ quoteCategory(매칭 키)는 분리된 책임이다. quoteCategory 값은 반드시
// categoryLabels.PLACE_CATEGORY_LABEL 의 키여야 견적 매칭이 동작한다.

export type VendorSlotStatus = "undecided" | "quoting" | "booked";

export interface VendorSlot {
  key: string;
  label: string;
  group: string;
  /** Dewy 입점·매칭 가능한 슬롯만 — 견적 요청 카테고리(place enum). 없으면 견적 CTA 미노출. */
  quoteCategory?: string;
  /** 카테고리별 업체 둘러보기용 한국어 라벨(useVendors.categoryRouteMap 키). */
  browseLabel?: string;
  /** 앱 내부 기능으로 바로 연결(예: 모바일 청첩장 → Dewy 청첩장 제작). */
  internalLink?: string;
  /** quoteCategory 가 같은 슬롯이 여럿일 때(예: 본식/혼주 메이크업) 예약 자동반영의 대표 슬롯. */
  primaryForQuoteCategory?: boolean;
}

export const VENDOR_SLOT_GROUPS: string[] = ["예식", "촬영·영상", "의상·뷰티", "예물·소품", "초대·기타"];

// 쓰레드 신부 체크리스트(19개)를 그대로 반영한 순서/구성.
export const VENDOR_SLOTS: VendorSlot[] = [
  // ── 예식 ──
  { key: "venue", label: "베뉴(웨딩홀)", group: "예식", quoteCategory: "wedding_hall", browseLabel: "웨딩홀", primaryForQuoteCategory: true },
  { key: "planner", label: "플래너", group: "예식", browseLabel: "웨딩플래너" },
  { key: "mc", label: "사회자", group: "예식", browseLabel: "기타" },

  // ── 촬영·영상 ──
  { key: "studio", label: "스튜디오 촬영", group: "촬영·영상", quoteCategory: "studio", browseLabel: "스드메", primaryForQuoteCategory: true },
  { key: "main_snap", label: "본식 스냅", group: "촬영·영상", browseLabel: "기타" },
  { key: "main_dvd", label: "본식 DVD", group: "촬영·영상", browseLabel: "기타" },
  { key: "iphone_snap", label: "아이폰 스냅", group: "촬영·영상", browseLabel: "기타" },
  { key: "jeju_snap", label: "제주 스냅", group: "촬영·영상", browseLabel: "기타" },
  { key: "horse_snap", label: "승마 스냅", group: "촬영·영상", browseLabel: "기타" },

  // ── 의상·뷰티 ──
  { key: "dress", label: "드레스", group: "의상·뷰티", quoteCategory: "dress_shop", browseLabel: "스드메", primaryForQuoteCategory: true },
  { key: "makeup", label: "본식 메이크업", group: "의상·뷰티", quoteCategory: "makeup_shop", browseLabel: "스드메", primaryForQuoteCategory: true },
  { key: "suit", label: "예복", group: "의상·뷰티", quoteCategory: "tailor_shop", browseLabel: "예복", primaryForQuoteCategory: true },
  { key: "parent_hanbok", label: "혼주 한복", group: "의상·뷰티", quoteCategory: "hanbok", browseLabel: "한복", primaryForQuoteCategory: true },
  // 혼주 메이크업 = 메이크업샵이 담당 → 기존 makeup_shop 견적에 연결(이미 있는 걸 연결, S0.5-a).
  // 본식 메이크업(makeup)이 primary 라 견적 부킹 자동반영은 본식만, 혼주는 수동(중복 부킹 방지).
  { key: "parent_makeup", label: "혼주 메이크업", group: "의상·뷰티", quoteCategory: "makeup_shop", browseLabel: "스드메" },

  // ── 예물·소품 ──
  { key: "ring", label: "예물·웨딩밴드", group: "예물·소품", quoteCategory: "jewelry", primaryForQuoteCategory: true },
  { key: "bouquet", label: "본식 부케", group: "예물·소품", browseLabel: "기타" },

  // ── 초대·기타 ──
  { key: "invitation", label: "청첩장", group: "초대·기타", quoteCategory: "invitation_venue", browseLabel: "청첩장", primaryForQuoteCategory: true },
  { key: "mobile_invitation", label: "모바일 청첩장", group: "초대·기타", internalLink: "/invitation/new" },
  { key: "honeymoon", label: "신혼여행", group: "초대·기타", quoteCategory: "honeymoon", browseLabel: "허니문", primaryForQuoteCategory: true },
];

export const VENDOR_SLOT_BY_KEY: Record<string, VendorSlot> = Object.fromEntries(
  VENDOR_SLOTS.map((s) => [s.key, s]),
);

// 견적 예약 성사 시 어느 보드 슬롯을 '예약완료'로 자동 표시할지 — quoteCategory(place enum)의
// 대표 슬롯 1개. makeup_shop 처럼 슬롯이 둘이면 본식 메이크업(primary)만 자동 반영(혼주는 수동).
export function primarySlotForQuoteCategory(category: string | null | undefined): VendorSlot | undefined {
  if (!category) return undefined;
  return VENDOR_SLOTS.find((s) => s.quoteCategory === category && s.primaryForQuoteCategory);
}

export const VENDOR_STATUS_META: Record<VendorSlotStatus, { label: string; chip: string; dot: string }> = {
  undecided: { label: "미정", chip: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/40" },
  quoting: { label: "견적중", chip: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  booked: { label: "예약완료", chip: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
};
