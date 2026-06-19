import type { LegacyDetail } from "@/hooks/usePlaceDetail";

// 기본정보 탭의 '핵심 스펙 요약' — 카테고리별 결정요소 3~5개를 첫 화면에서 한눈에.
// 상세(CategoryExtras)의 풍부한 정보 중 의사결정 핵심만 추려 노출(가격은 상단 대표가에서 별도).
// 값이 없는 항목은 자동 생략 → 빈칸/빈 섹션 방지(데이터 빈약 카테고리도 안전).

interface Fact { label: string; value: string }

const yn = (b: boolean | null, t = "가능", f = "불가"): string | null => (b == null ? null : b ? t : f);
const join = (a: string[] | null | undefined, n = 3): string | null =>
  a && a.length ? a.slice(0, n).join(" · ") : null;
const num = (n: number | null, suffix: string): string | null => (n != null ? `${n}${suffix}` : null);

// 카테고리 → 핵심 스펙 추출. null/빈값은 호출부에서 걸러진다.
function buildFacts(p: LegacyDetail): (Fact | null)[] {
  switch (p.category) {
    case "wedding_hall":
      return [
        p.min_guarantee != null ? { label: "최소 보증", value: `${p.min_guarantee}명` } : null,
        join(p.meal_types) ? { label: "식사", value: join(p.meal_types)! } : null,
        join(p.hall_styles) ? { label: "홀 분위기", value: join(p.hall_styles)! } : null,
        yn(p.outdoor_available) ? { label: "야외 예식", value: yn(p.outdoor_available)! } : null,
      ];
    case "studio":
      return [
        num(p.original_count, "장") ? { label: "원본", value: num(p.original_count, "장")! } : null,
        num(p.base_shoot_hours, "시간") ? { label: "기본 촬영", value: num(p.base_shoot_hours, "시간")! } : null,
        num(p.base_retouch_count, "장") ? { label: "기본 보정", value: num(p.base_retouch_count, "장")! } : null,
        join(p.author_tiers, 2) ? { label: "작가 등급", value: join(p.author_tiers, 2)! } : null,
      ];
    case "dress_shop":
      return [
        join(p.dress_styles) ? { label: "스타일", value: join(p.dress_styles)! } : null,
        num(p.fitting_count, "회") ? { label: "피팅", value: num(p.fitting_count, "회")! } : null,
        num(p.dress_count_included, "벌") ? { label: "드레스", value: num(p.dress_count_included, "벌")! } : null,
        yn(p.custom_available, "맞춤 가능", "대여 전용") ? { label: "제작", value: yn(p.custom_available, "맞춤 가능", "대여 전용")! } : null,
      ];
    case "makeup_shop":
      return [
        join(p.makeup_styles) ? { label: "스타일", value: join(p.makeup_styles)! } : null,
        yn(p.includes_rehearsal, "포함", "별도") ? { label: "리허설", value: yn(p.includes_rehearsal, "포함", "별도")! } : null,
        p.director_level ? { label: "담당", value: p.director_level } : null,
        yn(p.travel_fee_included, "포함", "별도") ? { label: "출장비", value: yn(p.travel_fee_included, "포함", "별도")! } : null,
      ];
    case "hanbok":
      return [
        join(p.hanbok_types) ? { label: "종류", value: join(p.hanbok_types)! } : null,
        yn(p.custom_available, "맞춤 가능", "대여 전용") ? { label: "제작", value: yn(p.custom_available, "맞춤 가능", "대여 전용")! } : null,
        yn(p.accessories_included, "포함", "별도") ? { label: "액세서리", value: yn(p.accessories_included, "포함", "별도")! } : null,
        yn(p.delivery_available, "가능", "불가") ? { label: "지방 배송", value: yn(p.delivery_available)! } : null,
      ];
    case "tailor_shop":
      return [
        join(p.suit_styles) ? { label: "스타일", value: join(p.suit_styles)! } : null,
        num(p.fitting_count, "회") ? { label: "피팅", value: num(p.fitting_count, "회")! } : null,
        yn(p.custom_available, "맞춤 가능", "기성 위주") ? { label: "제작", value: yn(p.custom_available, "맞춤 가능", "기성 위주")! } : null,
      ];
    case "honeymoon":
      return [
        p.nights != null && p.days != null ? { label: "일정", value: `${p.nights}박 ${p.days}일` } : null,
        join(p.countries, 2) ? { label: "국가", value: join(p.countries, 2)! } : null,
        yn(p.direct_flight, "직항", "경유") ? { label: "항공", value: yn(p.direct_flight, "직항", "경유")! } : null,
        p.hotel_grade ? { label: "호텔", value: p.hotel_grade } : null,
      ];
    case "appliance":
      return [
        yn(p.card_discount_available, "가능", "불가") ? { label: "카드 할인", value: yn(p.card_discount_available)! } : null,
        p.free_delivery != null || p.free_installation != null
          ? { label: "배송·설치", value: p.free_delivery && p.free_installation ? "무료" : "유료" } : null,
        num(p.warranty_years, "년") ? { label: "보증", value: num(p.warranty_years, "년")! } : null,
        join(p.brand_options, 2) ? { label: "브랜드", value: join(p.brand_options, 2)! } : null,
      ];
    case "jewelry":
      return [
        join(p.metals, 2) || p.gold_karat ? { label: "금속", value: join(p.metals, 2) ?? p.gold_karat! } : null,
        p.carat_diamond != null ? { label: "다이아", value: `${p.carat_diamond}ct` } : null,
        yn(p.lifetime_warranty, "지원", null as unknown as string) ? { label: "평생 보증", value: "지원" } : null,
        p.brand_name ? { label: "브랜드", value: p.brand_name } : null,
      ];
    case "invitation_venue":
      return [
        p.capacity_min != null || p.capacity_max != null
          ? { label: "수용 인원", value: `${p.capacity_min ?? ""}${p.capacity_min && p.capacity_max ? "~" : ""}${p.capacity_max ?? ""}명` } : null,
        p.corkage_fee_won != null
          ? { label: "코키지", value: p.corkage_fee_won === 0 ? "무료" : `${p.corkage_fee_won.toLocaleString()}원` } : null,
        num(p.private_room_count, "개") ? { label: "룸", value: num(p.private_room_count, "개")! } : null,
        join(p.signature_dishes, 2) ? { label: "시그니처", value: join(p.signature_dishes, 2)! } : null,
      ];
    default:
      return [];
  }
}

const PlaceKeyFacts = ({ place }: { place: LegacyDetail }) => {
  const facts = buildFacts(place).filter((f): f is Fact => !!f);
  if (facts.length === 0) return null;
  return (
    <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {facts.map((f) => (
          <div key={f.label} className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-muted-foreground shrink-0">{f.label}</span>
            <span className="text-[13px] font-semibold text-foreground text-right truncate">{f.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlaceKeyFacts;
