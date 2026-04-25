import type { CategorySlug } from "./utils/categories";

export interface SourceRef {
  url: string;
  source_type: "blog" | "cafe" | "official" | "local";
  published_at: string | null; // ISO date or null
}

export interface PriceEstimate {
  min: number;
  max: number;
  currency: "KRW";
  unit: "per_person" | "per_event" | "per_set" | "per_day" | "per_package";
}

export interface CollectedPlace {
  name: string;
  category: CategorySlug;
  city: string | null;
  district: string | null;
  description: string | null;
  main_image_url: string | null;
  tags: string[];
  lat: number | null;
  lng: number | null;
  data_source: "blog" | "cafe" | "official" | "mixed" | "local";
  confidence: number; // 0-100
  last_source_date: string | null; // YYYY-MM-DD
  source_refs: SourceRef[];

  // From Naver Local API (Stage 1) — written to place_details
  tel?: string | null;
  address?: string | null; // road address
  // Naver "link" classified by hostname (only one of these is set per shop)
  naver_place_url?: string | null;
  naver_blog_url?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  youtube_url?: string | null;
  website_url?: string | null;

  // Deep analysis (filled by Gemini in Stage 3) — written to place_details
  price_tier?: string | null;
  atmosphere?: string[];
  pros?: string[];
  cons?: string[];
  hidden_costs?: string[];
  recommended_for?: string[];
  avg_price_estimate?: PriceEstimate | null;
  summary?: string | null;
  analyzed_at?: string | null; // ISO timestamp

  // Place_details extras extracted by Gemini (best effort, often null)
  subway_station?: string | null;
  subway_line?: string | null;
  walk_minutes?: number | null;
  parking_capacity?: number | null;
  parking_location?: string | null;

  // Derived from analysis for native columns
  min_price?: number | null; // KRW per_person, used by every card table

  // Category-specific card fields (only the ones matching p.category get written)
  // wedding_hall (venue-level summary → place_wedding_halls)
  hall_styles?: string[] | null;
  meal_types?: string[] | null;
  min_guarantee?: number | null;
  max_guarantee?: number | null;
  // wedding_hall (per-hall 1:N → place_halls)
  halls?: Array<{
    hall_name: string;
    hall_type?: string | null;
    capacity_seated?: number | null;
    capacity_standing?: number | null;
    min_guarantee?: number | null;
    max_guarantee?: number | null;
    meal_price?: number | null;
    meal_type?: string | null;
    floor?: string | null;
  }> | null;
  // studio
  shoot_styles?: string[] | null;
  includes_originals?: boolean | null;
  // dress_shop
  dress_styles?: string[] | null;
  rental_only?: boolean | null;
  // makeup_shop
  makeup_styles?: string[] | null;
  includes_rehearsal?: boolean | null;
  // hanbok
  hanbok_types?: string[] | null;
  custom_available?: boolean | null;
  // tailor_shop
  suit_styles?: string[] | null;
  // (custom_available reused)
  // honeymoon
  destinations?: string[] | null;
  duration_days?: number | null;
  // appliance
  brand_options?: string[] | null;
  product_categories?: string[] | null;
  // invitation_venue
  venue_types?: string[] | null;
  capacity_min?: number | null;
  capacity_max?: number | null;
}
