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
  raw_file_extra_cost: number | null;
  per_retouch_cost: number | null;
  album_extra_cost: number | null;
  base_shoot_hours: number | null;
  base_retouch_count: number | null;
  author_tiers: string[];
  frame_included: boolean | null;
  photobook_pages: number | null;
  editing_days: number | null;
  // Dress / tailor
  dress_styles: string[];
  suit_styles: string[];
  rental_only: boolean | null;
  fitting_count: number | null;
  rental_includes_alterations: boolean | null;
  designer_brands: string[];
  custom_available: boolean | null;
  helper_included: boolean | null;
  inner_included: boolean | null;
  dress_count_included: number | null;
  accessories_included: boolean | null;
  // Makeup
  makeup_styles: string[];
  includes_rehearsal: boolean | null;
  hair_makeup_separate: boolean | null;
  rehearsal_count: number | null;
  travel_fee_included: boolean | null;
  director_level: string | null;
  early_morning_fee: number | null;
  // Hanbok
  hanbok_types: string[];
  delivery_available: boolean | null;
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
  // Appliance (hybrid: store/package/single)
  product_categories: string[];
  brand_options: string[];
  installment_months: number | null;
  warranty_years: number | null;
  free_delivery: boolean | null;
  free_installation: boolean | null;
  old_appliance_pickup: boolean | null;
  card_discount_available: boolean | null;
  appliance_product_type: string | null; // store | package | single
  appliance_product_url: string | null;
  appliance_product_code: string | null;
  store_chain: string | null;
  specialties: string[];
  package_items: string[];
  package_set_price: number | null;
  appliance_promotion_text: string | null;
  // Appliance v2 — 비교사이트 표준 필드
  energy_rating: string | null;
  model_release_year: number | null;
  capacity_text: string | null;
  card_partners: string[];
  total_discount_percent: number | null;
  gift_items: string[];
  payment_options: string[];
  negotiable: boolean | null;
  quote_request_url: string | null;
  floor_location: string | null;
  home_visit_quote: boolean | null;
  is_bestseller: boolean | null;
  is_new_model: boolean | null;
  target_household: string | null;
  // Invitation venue
  venue_types: string[];
  capacity_min: number | null;
  capacity_max: number | null;
  room_charge_separate: boolean | null;
  drinks_included: boolean | null;
  venue_atmosphere: string[];          // place_invitation_venues.atmosphere (place_details.atmosphere와 별도)
  valet_parking: boolean | null;
  signature_dishes: string[];
  corkage_fee_won: number | null;
  private_room_count: number | null;
  // Jewelry (한 행 = 브랜드 베스트셀러 컬렉션)
  brand_name: string | null;
  brand_tier: string | null;
  product_url: string | null;
  product_code_jewelry: string | null;
  jewelry_product_type: string | null;
  sub_category: string | null;
  store_type: string | null;
  metals: string[];
  gold_karat: string | null;
  price_couple_set: number | null;
  carat_diamond: number | null;
  diamond_certified: boolean | null;
  diamond_cert_org: string | null;
  diamond_color: string | null;
  diamond_clarity: string | null;
  diamond_cut: string | null;
  diamond_shape: string | null;
  diamond_origin: string | null;
  side_stones_count: number | null;
  side_stones_total_carat: number | null;
  band_design: string | null;
  band_width_mm: number | null;
  band_thickness_mm: number | null;
  band_profile: string | null;
  band_finishing: string | null;
  stone_setting: string | null;
  engraving_available: boolean | null;
  size_resize_free: boolean | null;
  custom_design_available: boolean | null;
  delivery_days: number | null;
  lifetime_warranty: boolean | null;
  couple_set_available: boolean | null;
  aftercare_includes: string[];
  package_includes: string[];
  brand_origin: string | null;
  brand_history_year: number | null;
  showroom_count: number | null;
  partnership_dept_stores: string[];
  signature_collection: string | null;
  jewelry_promotion_text: string | null;

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
  jewelry: "place_jewelry",
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
  "place_jewelry(*)",
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
        raw_file_extra_cost: (card?.raw_file_extra_cost as number) ?? null,
        per_retouch_cost: (card?.per_retouch_cost as number) ?? null,
        album_extra_cost: (card?.album_extra_cost as number) ?? null,
        base_shoot_hours: (card?.base_shoot_hours as number) ?? null,
        base_retouch_count: (card?.base_retouch_count as number) ?? null,
        author_tiers: asStringArray(card?.author_tiers),
        frame_included: (card?.frame_included as boolean) ?? null,
        photobook_pages: (card?.photobook_pages as number) ?? null,
        editing_days: p.category === "studio" ? ((card?.editing_days as number) ?? null) : null,
        dress_styles: asStringArray(card?.dress_styles),
        suit_styles: asStringArray(card?.suit_styles),
        rental_only: (card?.rental_only as boolean) ?? null,
        fitting_count: (card?.fitting_count as number) ?? null,
        rental_includes_alterations:
          (card?.rental_includes_alterations as boolean) ?? null,
        designer_brands: asStringArray(card?.designer_brands),
        custom_available: (card?.custom_available as boolean) ?? null,
        helper_included: (card?.helper_included as boolean) ?? null,
        inner_included: (card?.inner_included as boolean) ?? null,
        dress_count_included: (card?.dress_count_included as number) ?? null,
        accessories_included: (card?.accessories_included as boolean) ?? null,
        makeup_styles: asStringArray(card?.makeup_styles),
        includes_rehearsal: (card?.includes_rehearsal as boolean) ?? null,
        hair_makeup_separate: (card?.hair_makeup_separate as boolean) ?? null,
        rehearsal_count: (card?.rehearsal_count as number) ?? null,
        travel_fee_included: (card?.travel_fee_included as boolean) ?? null,
        director_level: (card?.director_level as string) ?? null,
        early_morning_fee: (card?.early_morning_fee as number) ?? null,
        hanbok_types: asStringArray(card?.hanbok_types),
        delivery_available: (card?.delivery_available as boolean) ?? null,
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
        installment_months: (card?.installment_months as number) ?? null,
        warranty_years: (card?.warranty_years as number) ?? null,
        free_delivery: (card?.free_delivery as boolean) ?? null,
        free_installation: (card?.free_installation as boolean) ?? null,
        old_appliance_pickup: (card?.old_appliance_pickup as boolean) ?? null,
        card_discount_available: (card?.card_discount_available as boolean) ?? null,
        appliance_product_type: p.category === "appliance" ? ((card?.product_type as string) ?? null) : null,
        appliance_product_url: p.category === "appliance" ? ((card?.product_url as string) ?? null) : null,
        appliance_product_code: p.category === "appliance" ? ((card?.product_code as string) ?? null) : null,
        store_chain: (card?.store_chain as string) ?? null,
        specialties: asStringArray(card?.specialties),
        package_items: asStringArray(card?.package_items),
        package_set_price: (card?.package_set_price as number) ?? null,
        appliance_promotion_text: p.category === "appliance" ? ((card?.promotion_text as string) ?? null) : null,
        energy_rating: (card?.energy_rating as string) ?? null,
        model_release_year: (card?.model_release_year as number) ?? null,
        capacity_text: (card?.capacity_text as string) ?? null,
        card_partners: asStringArray(card?.card_partners),
        total_discount_percent: (card?.total_discount_percent as number) ?? null,
        gift_items: asStringArray(card?.gift_items),
        payment_options: asStringArray(card?.payment_options),
        negotiable: (card?.negotiable as boolean) ?? null,
        quote_request_url: (card?.quote_request_url as string) ?? null,
        floor_location: (card?.floor_location as string) ?? null,
        home_visit_quote: (card?.home_visit_quote as boolean) ?? null,
        is_bestseller: p.category === "appliance" ? ((card?.is_bestseller as boolean) ?? null) : null,
        is_new_model: (card?.is_new_model as boolean) ?? null,
        target_household: (card?.target_household as string) ?? null,
        venue_types: asStringArray(card?.venue_types),
        capacity_min: (card?.capacity_min as number) ?? null,
        capacity_max: (card?.capacity_max as number) ?? null,
        room_charge_separate: (card?.room_charge_separate as boolean) ?? null,
        drinks_included: (card?.drinks_included as boolean) ?? null,
        venue_atmosphere: p.category === "invitation_venue" ? asStringArray(card?.atmosphere) : [],
        valet_parking: (card?.valet_parking as boolean) ?? null,
        signature_dishes: asStringArray(card?.signature_dishes),
        corkage_fee_won: (card?.corkage_fee_won as number) ?? null,
        private_room_count: (card?.private_room_count as number) ?? null,

        // Jewelry (한 행 = 브랜드 베스트셀러 컬렉션)
        brand_name: (card?.brand_name as string) ?? null,
        brand_tier: (card?.brand_tier as string) ?? null,
        product_url: (card?.product_url as string) ?? null,
        product_code_jewelry: (card?.product_code as string) ?? null,
        jewelry_product_type: p.category === "jewelry" ? ((card?.product_type as string) ?? null) : null,
        sub_category: (card?.sub_category as string) ?? null,
        store_type: (card?.store_type as string) ?? null,
        metals: asStringArray(card?.metals),
        gold_karat: (card?.gold_karat as string) ?? null,
        price_couple_set: (card?.price_couple_set as number) ?? null,
        carat_diamond: (card?.carat_diamond as number) ?? null,
        diamond_certified: (card?.diamond_certified as boolean) ?? null,
        diamond_cert_org: (card?.diamond_cert_org as string) ?? null,
        diamond_color: (card?.diamond_color as string) ?? null,
        diamond_clarity: (card?.diamond_clarity as string) ?? null,
        diamond_cut: (card?.diamond_cut as string) ?? null,
        diamond_shape: (card?.diamond_shape as string) ?? null,
        diamond_origin: (card?.diamond_origin as string) ?? null,
        side_stones_count: (card?.side_stones_count as number) ?? null,
        side_stones_total_carat: (card?.side_stones_total_carat as number) ?? null,
        band_design: (card?.band_design as string) ?? null,
        band_width_mm: (card?.band_width_mm as number) ?? null,
        band_thickness_mm: (card?.band_thickness_mm as number) ?? null,
        band_profile: (card?.band_profile as string) ?? null,
        band_finishing: (card?.band_finishing as string) ?? null,
        stone_setting: (card?.stone_setting as string) ?? null,
        engraving_available: (card?.engraving_available as boolean) ?? null,
        size_resize_free: (card?.size_resize_free as boolean) ?? null,
        custom_design_available: (card?.custom_design_available as boolean) ?? null,
        delivery_days: p.category === "jewelry" ? ((card?.delivery_days as number) ?? null) : null,
        lifetime_warranty: (card?.lifetime_warranty as boolean) ?? null,
        couple_set_available: (card?.couple_set_available as boolean) ?? null,
        aftercare_includes: asStringArray(card?.aftercare_includes),
        package_includes: asStringArray(card?.package_includes),
        brand_origin: (card?.brand_origin as string) ?? null,
        brand_history_year: (card?.brand_history_year as number) ?? null,
        showroom_count: (card?.showroom_count as number) ?? null,
        partnership_dept_stores: asStringArray(card?.partnership_dept_stores),
        signature_collection: (card?.signature_collection as string) ?? null,
        jewelry_promotion_text: p.category === "jewelry" ? ((card?.promotion_text as string) ?? null) : null,

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
