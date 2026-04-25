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
  naver_place_url?: string | null;
  address?: string | null; // road address

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
  min_price?: number | null; // KRW per_person; only for wedding_hall categories
  min_guarantee?: number | null;
  max_guarantee?: number | null;

  // Category-specific (hanbok)
  hanbok_types?: string[] | null;
  custom_available?: boolean | null;
}
