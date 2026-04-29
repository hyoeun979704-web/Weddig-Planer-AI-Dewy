import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Single round-trip for the entire detail page payload:
 *   places (*) + place_details (*) + place_<category> (*).
 * Returns a flat LegacyDetail synthesized from all three. Section-hide rules
 * stay in the UI layer — this hook never inserts placeholder/mock values.
 */

export type PriceCurrency = "KRW" | "USD";
export type PriceUnit =
  | "per_person"
  | "per_event"
  | "per_package"
  | "per_set"
  | "per_couple"
  | "per_rental"
  | "per_custom"
  | "per_session";

export interface PricePackage {
  name: string;
  price_min: number | null;
  price_max: number | null;
  currency: PriceCurrency | null;
  unit: PriceUnit | null;
  includes: string[] | null;
  notes: string | null;
}

export interface AdvantagePoint {
  title: string;
  content: string | null;
}

export interface LegacyDetail {
  // Core (places)
  id: string;
  name: string;
  category: string;
  address: string;
  thumbnail_url: string | null;
  rating: number;
  review_count: number;
  is_partner: boolean;
  description: string | null;
  tags: string[];
  price_per_person: number | null;
  price_range: string;

  // place_details — sparse contact / venue info
  tel: string | null;
  website_url: string | null;
  instagram_url: string | null;
  naver_blog_url: string | null;
  naver_place_url: string | null;
  facebook_url: string | null;
  youtube_url: string | null;
  kakao_channel_url: string | null;
  hours: { mon: string | null; tue: string | null; wed: string | null; thu: string | null; fri: string | null; sat: string | null; sun: string | null } | null;
  closed_days: string | null;
  holiday_notice: string | null;
  subway_line: string | null;
  subway_station: string | null;
  walk_minutes: number | null;
  parking_capacity: number | null;
  parking_location: string | null;
  parking_free_guest: string | null;
  parking_free_parents: string | null;
  shuttle_bus_available: boolean | null;
  shuttle_bus_info: string | null;

  // Marketing / consumer-facing
  advantages: AdvantagePoint[];
  image_urls: string[];
  price_packages: PricePackage[];
  amenities: string[];
  basic_services: string[];
  event_info: string | null;
  contract_policy: string | null;
  wedding_count: number | null;
  consultation_required: boolean | null;

  // Analyzer output (optional)
  pros: string[];
  cons: string[];
  atmosphere: string[];
  hidden_costs: string[];
  recommended_for: string[];

  // Category-specific (any one will be populated based on category)
  // Wedding hall
  min_guarantee: number | null;
  max_guarantee: number | null;
  hall_styles: string[];
  meal_types: string[];
  food_tasting_available: boolean | null;
  outdoor_available: boolean | null;
  ceremony_only_available: boolean | null;
  dress_code: string | null;
  hall_count: number | null;
  // Studio
  shoot_styles: string[];
  total_photos: number | null;
  retouching_included: boolean | null;
  original_count: number | null;
  dress_provided: boolean | null;
  shoot_locations: string[];
  includes_originals: boolean | null;
  // Dress / tailor
  dress_styles: string[];
  suit_styles: string[];
  rental_only: boolean | null;
  fitting_count: number | null;
  rental_includes_alterations: boolean | null;
  designer_brands: string[];
  custom_available: boolean | null;
  // Makeup
  makeup_styles: string[];
  includes_rehearsal: boolean | null;
  hair_makeup_separate: boolean | null;
  rehearsal_count: number | null;
  // Hanbok
  hanbok_types: string[];
  // Honeymoon (product-based: 한 행 = 여행 상품 1개)
  agency_name: string | null;
  agency_product_url: string | null;
  product_type: string | null; // package | free_travel | flight | pass
  product_code: string | null;
  departure_type: string | null;
  countries: string[];
  cities: string[];
  representative_city: string | null;
  region_group: string | null;
  nights: number | null;
  days: number | null;
  itinerary_summary: string | null;
  itinerary_highlights: string[];
  avg_budget: number | null;
  single_supplement: number | null;
  child_price: number | null;
  infant_price: number | null;
  price_includes: string[];
  price_excludes: string[];
  promotion_text: string | null;
  airline: string | null;
  direct_flight: boolean | null;
  departure_airport: string | null;
  layover_cities: string[];
  flight_hours: number | null;
  hotel_grade: string | null;
  room_type: string | null;
  hotel_names: string[];
  meal_plan: string | null;
  themes: string[];
  honeymoon_perks: string[];
  shopping_required: boolean | null;
  guide_included: boolean | null;
  visa_required: boolean | null;
  validity_days: number | null;
  usage_count: number | null;
  // Appliance
  product_categories: string[];
  brand_options: string[];
  // Invitation venue
  venue_types: string[];
  capacity_min: number | null;
  capacity_max: number | null;

  // ── Back-compat aliases ──
  // Earlier detail pages reference these names; aliasing here lets us keep
  // them working while the renames trickle through.
  suit_types: string[];        // → suit_styles
  package_types: string[];     // → shoot_styles
  style_options: string[];     // → category-relevant styles
  service_options: string[];   // → empty (deprecated)
  category_types: string[];    // → product_categories / venue_types
  feature_options: string[];   // → empty (deprecated)
  delivery_options: string[];  // → empty (deprecated)
  included_services: string[]; // → empty (deprecated)
  accommodation_types: string[]; // → empty (deprecated)
  trip_types: string[];        // → countries (legacy alias)
  destination: string;         // → "{country} · {cities.join(', ')}"
  duration: string;            // → "{nights}박{days}일"
  brand: string;               // → brand_options.join(", ") | agency_name
}

const CARD_KEY: Record<string, string> = {
  wedding_hall: "place_wedding_halls",
  studio: "place_studios",
  dress_shop: "place_dress_shops",
  makeup_shop: "place_makeup_shops",
  hanbok: "place_hanboks",
  tailor_shop: "place_tailor_shops",
  honeymoon: "place_honeymoons",
  appliance: "place_appliances",
  invitation_venue: "place_invitation_venues",
};

const SELECT = [
  "*",
  "place_details(*)",
  "place_wedding_halls(*)",
  "place_studios(*)",
  "place_dress_shops(*)",
  "place_makeup_shops(*)",
  "place_hanboks(*)",
  "place_tailor_shops(*)",
  "place_honeymoons(*)",
  "place_appliances(*)",
  "place_invitation_venues(*)",
].join(",");

const fmtPrice = (min: number | null): string =>
  min != null ? `${(min / 10000).toFixed(0)}만원~` : "가격 문의";

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  return [];
}

function asAdvantages(d: Record<string, unknown> | null): AdvantagePoint[] {
  if (!d) return [];
  const out: AdvantagePoint[] = [];
  for (let i = 1; i <= 3; i++) {
    const title = d[`advantage_${i}_title`];
    const content = d[`advantage_${i}_content`];
    if (typeof title === "string" && title.trim()) {
      out.push({
        title: title.trim(),
        content: typeof content === "string" ? content : null,
      });
    }
  }
  return out;
}

function asPricePackages(v: unknown): PricePackage[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null)
    .map((p) => ({
      name: typeof p.name === "string" ? p.name : "패키지",
      price_min: typeof p.price_min === "number" ? p.price_min : null,
      price_max: typeof p.price_max === "number" ? p.price_max : null,
      currency: p.currency === "USD" ? "USD" : p.currency === "KRW" ? "KRW" : null,
      unit: typeof p.unit === "string" && /^per_/.test(p.unit) ? (p.unit as PriceUnit) : null,
      includes: asStringArray(p.includes),
      notes: typeof p.notes === "string" ? p.notes : null,
    }));
}

export const usePlaceDetail = (placeId: string | undefined) => {
  return useQuery({
    queryKey: ["place_detail", placeId],
    queryFn: async (): Promise<LegacyDetail | null> => {
      if (!placeId) return null;
      const { data, error } = await supabase
        .from("places")
        .select(SELECT)
        .eq("place_id", placeId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const p = data as any;
      const d = (p.place_details ?? null) as Record<string, unknown> | null;
      const cardKey = CARD_KEY[p.category];
      const card = (cardKey ? p[cardKey] : null) as Record<string, unknown> | null;
      const address = [p.city, p.district].filter(Boolean).join(" ");
      const cardPrice = (card?.price_per_person as number | undefined) ?? null;
      const price = cardPrice ?? p.min_price ?? null;

      const hours = d
        ? {
            mon: (d.hours_mon as string | null) ?? null,
            tue: (d.hours_tue as string | null) ?? null,
            wed: (d.hours_wed as string | null) ?? null,
            thu: (d.hours_thu as string | null) ?? null,
            fri: (d.hours_fri as string | null) ?? null,
            sat: (d.hours_sat as string | null) ?? null,
            sun: (d.hours_sun as string | null) ?? null,
          }
        : null;
      const hasAnyHour = hours && Object.values(hours).some((v) => v && v !== "");

      // Image gallery: prefer the explicit jsonb array; fall back to the
      // place's main_image_url when the gallery isn't populated yet.
      const galleryFromJsonb = asStringArray(d?.image_urls);
      const gallery = galleryFromJsonb.length
        ? galleryFromJsonb
        : p.main_image_url
          ? [p.main_image_url as string]
          : [];

      return {
        id: p.place_id,
        name: p.name,
        category: p.category,
        address,
        thumbnail_url: p.main_image_url ?? null,
        rating: p.avg_rating ?? 0,
        review_count: p.review_count ?? 0,
        is_partner: p.is_partner ?? false,
        description: p.description ?? null,
        tags: asStringArray(p.tags),
        price_per_person: price,
        price_range: fmtPrice(price ?? null),

        tel: (d?.tel as string) ?? null,
        website_url: (d?.website_url as string) ?? null,
        instagram_url: (d?.instagram_url as string) ?? null,
        naver_blog_url: (d?.naver_blog_url as string) ?? null,
        naver_place_url: (d?.naver_place_url as string) ?? null,
        facebook_url: (d?.facebook_url as string) ?? null,
        youtube_url: (d?.youtube_url as string) ?? null,
        kakao_channel_url: (d?.kakao_channel_url as string) ?? null,
        hours: hasAnyHour ? hours : null,
        closed_days: (d?.closed_days as string) ?? null,
        holiday_notice: (d?.holiday_notice as string) ?? null,
        subway_line: (d?.subway_line as string) ?? null,
        subway_station: (d?.subway_station as string) ?? null,
        walk_minutes: (d?.walk_minutes as number) ?? null,
        parking_capacity: (d?.parking_capacity as number) ?? null,
        parking_location: (d?.parking_location as string) ?? null,
        parking_free_guest: (d?.parking_free_guest as string) ?? null,
        parking_free_parents: (d?.parking_free_parents as string) ?? null,
        shuttle_bus_available: (d?.shuttle_bus_available as boolean) ?? null,
        shuttle_bus_info: (d?.shuttle_bus_info as string) ?? null,

        advantages: asAdvantages(d),
        image_urls: gallery,
        price_packages: asPricePackages(d?.price_packages),
        amenities: asStringArray(d?.amenities),
        basic_services: asStringArray(d?.basic_services),
        event_info: (d?.event_info as string) ?? null,
        contract_policy: (d?.contract_policy as string) ?? null,
        wedding_count: (d?.wedding_count as number) ?? null,
        consultation_required: (d?.consultation_required as boolean) ?? null,

        pros: asStringArray(d?.pros),
        cons: asStringArray(d?.cons),
        atmosphere: asStringArray(d?.atmosphere),
        hidden_costs: asStringArray(d?.hidden_costs),
        recommended_for: asStringArray(d?.recommended_for),

        // Category-specific (only the matching card has values)
        min_guarantee: (card?.min_guarantee as number) ?? null,
        max_guarantee: (card?.max_guarantee as number) ?? null,
        hall_styles: asStringArray(card?.hall_styles),
        meal_types: asStringArray(card?.meal_types),
        food_tasting_available: (card?.food_tasting_available as boolean) ?? null,
        outdoor_available: (card?.outdoor_available as boolean) ?? null,
        ceremony_only_available: (card?.ceremony_only_available as boolean) ?? null,
        dress_code: (card?.dress_code as string) ?? null,
        hall_count: (card?.hall_count as number) ?? null,
        shoot_styles: asStringArray(card?.shoot_styles),
        total_photos: (card?.total_photos as number) ?? null,
        retouching_included: (card?.retouching_included as boolean) ?? null,
        original_count: (card?.original_count as number) ?? null,
        dress_provided: (card?.dress_provided as boolean) ?? null,
        shoot_locations: asStringArray(card?.shoot_locations),
        includes_originals: (card?.includes_originals as boolean) ?? null,
        dress_styles: asStringArray(card?.dress_styles),
        suit_styles: asStringArray(card?.suit_styles),
        rental_only: (card?.rental_only as boolean) ?? null,
        fitting_count: (card?.fitting_count as number) ?? null,
        rental_includes_alterations:
          (card?.rental_includes_alterations as boolean) ?? null,
        designer_brands: asStringArray(card?.designer_brands),
        custom_available: (card?.custom_available as boolean) ?? null,
        makeup_styles: asStringArray(card?.makeup_styles),
        includes_rehearsal: (card?.includes_rehearsal as boolean) ?? null,
        hair_makeup_separate: (card?.hair_makeup_separate as boolean) ?? null,
        rehearsal_count: (card?.rehearsal_count as number) ?? null,
        hanbok_types: asStringArray(card?.hanbok_types),
        agency_name: (card?.agency_name as string) ?? null,
        agency_product_url: (card?.agency_product_url as string) ?? null,
        product_type: (card?.product_type as string) ?? null,
        product_code: (card?.product_code as string) ?? null,
        departure_type: (card?.departure_type as string) ?? null,
        countries: asStringArray(card?.countries),
        cities: asStringArray(card?.cities),
        representative_city: (card?.representative_city as string) ?? null,
        region_group: (card?.region_group as string) ?? null,
        nights: (card?.nights as number) ?? null,
        days: (card?.days as number) ?? null,
        itinerary_summary: (card?.itinerary_summary as string) ?? null,
        itinerary_highlights: asStringArray(card?.itinerary_highlights),
        avg_budget: (card?.avg_budget as number) ?? null,
        single_supplement: (card?.single_supplement as number) ?? null,
        child_price: (card?.child_price as number) ?? null,
        infant_price: (card?.infant_price as number) ?? null,
        price_includes: asStringArray(card?.price_includes),
        price_excludes: asStringArray(card?.price_excludes),
        promotion_text: (card?.promotion_text as string) ?? null,
        airline: (card?.airline as string) ?? null,
        direct_flight: (card?.direct_flight as boolean) ?? null,
        departure_airport: (card?.departure_airport as string) ?? null,
        layover_cities: asStringArray(card?.layover_cities),
        flight_hours: (card?.flight_hours as number) ?? null,
        hotel_grade: (card?.hotel_grade as string) ?? null,
        room_type: (card?.room_type as string) ?? null,
        hotel_names: asStringArray(card?.hotel_names),
        meal_plan: (card?.meal_plan as string) ?? null,
        themes: asStringArray(card?.themes),
        honeymoon_perks: asStringArray(card?.honeymoon_perks),
        shopping_required: (card?.shopping_required as boolean) ?? null,
        guide_included: (card?.guide_included as boolean) ?? null,
        visa_required: (card?.visa_required as boolean) ?? null,
        validity_days: (card?.validity_days as number) ?? null,
        usage_count: (card?.usage_count as number) ?? null,
        product_categories: asStringArray(card?.product_categories),
        brand_options: asStringArray(card?.brand_options),
        venue_types: asStringArray(card?.venue_types),
        capacity_min: (card?.capacity_min as number) ?? null,
        capacity_max: (card?.capacity_max as number) ?? null,

        // ── Back-compat aliases ──
        suit_types: asStringArray(card?.suit_styles),
        package_types: asStringArray(card?.shoot_styles),
        style_options:
          asStringArray(card?.hall_styles).length > 0 ? asStringArray(card?.hall_styles) :
          asStringArray(card?.shoot_styles).length > 0 ? asStringArray(card?.shoot_styles) :
          asStringArray(card?.dress_styles).length > 0 ? asStringArray(card?.dress_styles) :
          asStringArray(card?.suit_styles).length > 0 ? asStringArray(card?.suit_styles) :
          asStringArray(card?.makeup_styles).length > 0 ? asStringArray(card?.makeup_styles) :
          asStringArray(card?.hanbok_types),
        service_options: [],
        category_types:
          asStringArray(card?.product_categories).length > 0
            ? asStringArray(card?.product_categories)
            : asStringArray(card?.venue_types),
        feature_options: [],
        delivery_options: [],
        included_services: [],
        accommodation_types: [],
        trip_types: asStringArray(card?.countries),
        destination: (() => {
          const c0 = asStringArray(card?.countries)[0];
          const cities = asStringArray(card?.cities).join(", ");
          if (c0 && cities) return `${c0} · ${cities}`;
          return c0 ?? cities ?? "";
        })(),
        duration:
          (card?.nights as number | undefined) != null && (card?.days as number | undefined) != null
            ? `${card!.nights}박${card!.days}일`
            : "",
        brand: (card?.agency_name as string) ?? asStringArray(card?.brand_options).join(", "),
      };
    },
    enabled: !!placeId,
  });
};
