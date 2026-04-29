import type { Venue, VendorInfoLine } from "@/lib/placeMappers";
import { formatWon } from "@/lib/vendorInfoLines";
import type { VendorMediaCardData } from "@/components/home/VendorMediaCard";
import type { CategoryItem } from "@/hooks/useCategoryData";
import type { CategoryType } from "@/stores/useCategoryFilterStore";

const CATEGORY_LABEL: Record<CategoryType, string> = {
  venues: "웨딩홀",
  studios: "스튜디오",
  dress_shops: "드레스",
  makeup_shops: "메이크업",
  hanbok: "한복",
  suits: "예복",
  honeymoon: "신혼여행",
  honeymoon_gifts: "예물·예단",
  appliances: "혼수·가전",
  invitation_venues: "청첩장",
};

const formatGuests = (min?: number | null, max?: number | null): string | null => {
  const lo = min ?? 0;
  const hi = max ?? 0;
  if (!lo && !hi) return null;
  if (lo && hi) return `${lo}~${hi}명`;
  return `${hi || lo}명`;
};

const buildCategoryItemInfoLines = (
  item: CategoryItem,
  category: CategoryType
): VendorInfoLine[] => {
  const lines: VendorInfoLine[] = [];
  const price = item.price_per_person ?? null;

  switch (category) {
    case "venues": {
      lines.push({
        label: "대관비",
        value: "업체문의",
        isPrice: true,
        pair: {
          label: "식대",
          value: price ? formatWon(price) : "업체문의",
          isPrice: true,
        },
      });
      const guests = formatGuests(item.min_guarantee, item.max_guarantee as number | undefined);
      if (guests) lines.push({ label: "보증", value: guests });
      break;
    }
    case "studios": {
      if (price) lines.push({ label: "패키지", value: formatWon(price), isPrice: true });
      break;
    }
    case "dress_shops": {
      if (price) lines.push({ label: "기본", value: formatWon(price), isPrice: true });
      break;
    }
    case "makeup_shops": {
      if (price) lines.push({ label: "신부", value: formatWon(price), isPrice: true });
      break;
    }
    case "suits": {
      lines.push({
        label: "국내",
        value: price ? formatWon(price) : "업체문의",
        isPrice: true,
        pair: { label: "수입", value: "업체문의", isPrice: true },
      });
      if (item.custom_available) lines.push({ label: "맞춤", value: "가능" });
      break;
    }
    case "hanbok": {
      if (price) lines.push({ label: "기본", value: formatWon(price), isPrice: true });
      if (item.custom_available) lines.push({ label: "맞춤", value: "가능" });
      break;
    }
    case "honeymoon": {
      if (price) lines.push({ label: "패키지", value: formatWon(price), isPrice: true });
      if (item.duration) lines.push({ label: "기간", value: item.duration });
      break;
    }
    case "honeymoon_gifts":
    case "appliances": {
      if (item.brand) lines.push({ label: "판매처", value: item.brand });
      if (price) lines.push({ label: "최저", value: formatWon(price), isPrice: true });
      break;
    }
    case "invitation_venues": {
      if (price) lines.push({ label: "1인", value: formatWon(price), isPrice: true });
      const guests = formatGuests(item.min_guarantee, (item as { max_guarantee?: number }).max_guarantee);
      if (guests) lines.push({ label: "정원", value: guests });
      break;
    }
  }
  return lines.slice(0, 3);
};

export const categoryItemToCardData = (
  item: CategoryItem,
  category: CategoryType
): VendorMediaCardData => {
  const region = item.address || item.destination || item.brand || null;
  const keywords = item.keywords ?? [];
  return {
    id: item.id,
    thumbnail_url: item.thumbnail_url,
    region,
    name: item.name,
    category: CATEGORY_LABEL[category],
    concept: keywords[0] ?? null,
    mood: keywords[1] ?? null,
    strength: keywords[2] ?? null,
    is_partner: item.is_partner,
    info_lines: buildCategoryItemInfoLines(item, category),
  };
};

export const venueToCardData = (venue: Venue): VendorMediaCardData => {
  const info_lines: VendorInfoLine[] = [
    {
      label: "대관비",
      value: "업체문의",
      isPrice: true,
      pair: {
        label: "식대",
        value: venue.price_per_person ? formatWon(venue.price_per_person) : "업체문의",
        isPrice: true,
      },
    },
  ];
  if (venue.min_guarantee) {
    info_lines.push({ label: "보증", value: `${venue.min_guarantee}명` });
  }
  return {
    id: venue.id,
    thumbnail_url: venue.thumbnail_url,
    region: venue.address || null,
    name: venue.name,
    category: "웨딩홀",
    concept: venue.hall_types?.[0] ?? null,
    mood: venue.meal_options?.[0] ?? null,
    strength: venue.event_options?.[0] ?? null,
    is_partner: venue.is_partner,
    info_lines,
  };
};
