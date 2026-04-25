import type { CategorySlug } from "./utils/categories";

export interface SourceRef {
  url: string;
  source_type: "blog" | "cafe" | "official" | "local";
  published_at: string | null; // ISO date or null
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
}
