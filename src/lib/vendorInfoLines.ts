import type { Database } from "@/integrations/supabase/types";

type PlaceRow = Database["public"]["Tables"]["places"]["Row"];

type WeddingHallRow = Database["public"]["Tables"]["place_wedding_halls"]["Row"];
type StudioRow = Database["public"]["Tables"]["place_studios"]["Row"];
type DressShopRow = Database["public"]["Tables"]["place_dress_shops"]["Row"];
type MakeupShopRow = Database["public"]["Tables"]["place_makeup_shops"]["Row"];
type TailorShopRow = Database["public"]["Tables"]["place_tailor_shops"]["Row"];
type HanbokRow = Database["public"]["Tables"]["place_hanboks"]["Row"];
type InvitationVenueRow = Database["public"]["Tables"]["place_invitation_venues"]["Row"];
type ApplianceRow = Database["public"]["Tables"]["place_appliances"]["Row"];
type HoneymoonRow = Database["public"]["Tables"]["place_honeymoons"]["Row"];

export interface PlaceWithCategory extends PlaceRow {
  place_wedding_halls?: WeddingHallRow | null;
  place_studios?: StudioRow | null;
  place_dress_shops?: DressShopRow | null;
  place_makeup_shops?: MakeupShopRow | null;
  place_tailor_shops?: TailorShopRow | null;
  place_hanboks?: HanbokRow | null;
  place_invitation_venues?: InvitationVenueRow | null;
  place_appliances?: ApplianceRow | null;
  place_honeymoons?: HoneymoonRow | null;
}

export interface VendorInfoLine {
  label: string;
  value: string;
  isPrice?: boolean;
}

const formatWon = (won: number): string => {
  if (won >= 100000000) return `${(won / 100000000).toFixed(1).replace(/\.0$/, "")}억원~`;
  if (won >= 10000) return `${(won / 10000).toFixed(0)}만원~`;
  return `${won.toLocaleString()}원~`;
};

const formatGuests = (min?: number | null, max?: number | null): string | null => {
  const lo = min ?? 0;
  const hi = max ?? 0;
  if (!lo && !hi) return null;
  if (lo && hi) return `${lo}~${hi}명`;
  return `${hi || lo}명`;
};

// Per-category caption lines. Skips lines whose backing data is missing.
// Cap at 3 lines per card to keep the layout predictable.
export const buildVendorInfoLines = (p: PlaceWithCategory): VendorInfoLine[] => {
  const lines: VendorInfoLine[] = [];

  switch (p.category) {
    case "wedding_hall": {
      const wh = p.place_wedding_halls ?? null;
      if (wh?.price_per_person) {
        lines.push({ label: "식대", value: formatWon(wh.price_per_person), isPrice: true });
      }
      const guests = formatGuests(wh?.min_guarantee, wh?.max_guarantee);
      if (guests) lines.push({ label: "보증", value: guests });
      break;
    }
    case "studio": {
      const st = p.place_studios ?? null;
      if (st?.price_per_person) {
        lines.push({ label: "촬영", value: formatWon(st.price_per_person), isPrice: true });
      }
      if (st?.raw_file_extra_cost) {
        lines.push({ label: "원본", value: formatWon(st.raw_file_extra_cost), isPrice: true });
      }
      if (st?.album_extra_cost) {
        lines.push({ label: "앨범", value: formatWon(st.album_extra_cost), isPrice: true });
      }
      break;
    }
    case "dress_shop": {
      const ds = p.place_dress_shops ?? null;
      if (ds?.price_per_person) {
        const label = ds.rental_only ? "대여" : "본식";
        lines.push({ label, value: formatWon(ds.price_per_person), isPrice: true });
      }
      break;
    }
    case "makeup_shop": {
      const mk = p.place_makeup_shops ?? null;
      if (mk?.price_per_person) {
        lines.push({ label: "신부", value: formatWon(mk.price_per_person), isPrice: true });
      }
      if (mk?.includes_rehearsal) {
        lines.push({ label: "리허설", value: "포함" });
      }
      break;
    }
    case "tailor_shop": {
      const tl = p.place_tailor_shops ?? null;
      if (tl?.price_per_person) {
        const label = tl.custom_available ? "맞춤" : "대여";
        lines.push({ label, value: formatWon(tl.price_per_person), isPrice: true });
      }
      break;
    }
    case "hanbok": {
      const hb = p.place_hanboks ?? null;
      if (hb?.price_per_person) {
        const label = hb.custom_available ? "맞춤" : "대여";
        lines.push({ label, value: formatWon(hb.price_per_person), isPrice: true });
      }
      break;
    }
    case "invitation_venue": {
      const iv = p.place_invitation_venues ?? null;
      if (iv?.price_per_person) {
        lines.push({ label: "1인", value: formatWon(iv.price_per_person), isPrice: true });
      }
      const guests = formatGuests(iv?.capacity_min, iv?.capacity_max);
      if (guests) lines.push({ label: "정원", value: guests });
      break;
    }
    case "appliance": {
      const ap = p.place_appliances ?? null;
      const brand = ap?.brand_options?.[0];
      if (brand) lines.push({ label: "판매처", value: brand });
      if (ap?.price_per_person) {
        lines.push({ label: "최저가", value: formatWon(ap.price_per_person), isPrice: true });
      }
      break;
    }
    case "honeymoon": {
      const hm = p.place_honeymoons ?? null;
      if (hm?.price_per_person) {
        lines.push({ label: "패키지", value: formatWon(hm.price_per_person), isPrice: true });
      }
      if (hm?.duration_days) {
        lines.push({ label: "기간", value: `${hm.duration_days}일` });
      }
      const dest = hm?.destinations?.[0];
      if (dest) lines.push({ label: "지역", value: dest });
      break;
    }
    default: {
      if (p.min_price) {
        lines.push({ label: "최저", value: formatWon(p.min_price), isPrice: true });
      }
      break;
    }
  }

  return lines.slice(0, 3);
};

// Aggregated style/keyword tags shown above the price block
export const collectKeywordTags = (p: PlaceWithCategory): string[] => {
  const lists: Array<string[] | null | undefined> = [
    p.place_wedding_halls?.hall_styles,
    p.place_studios?.shoot_styles,
    p.place_dress_shops?.dress_styles,
    p.place_makeup_shops?.makeup_styles,
    p.place_tailor_shops?.suit_styles,
    p.place_hanboks?.hanbok_types,
    p.place_invitation_venues?.venue_types,
    p.place_appliances?.product_categories,
    p.place_honeymoons?.destinations,
    p.tags,
  ];
  const flat = lists
    .filter((x): x is string[] => Array.isArray(x))
    .flat()
    .filter(Boolean);
  // De-dupe preserving order
  return Array.from(new Set(flat)).slice(0, 2);
};
