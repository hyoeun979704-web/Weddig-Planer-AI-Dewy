// ───────────────────────────────────────────────────────────────────────────
// 도메인 타입 뷰 — 공유(마켓플레이스·결제·인프라) 도메인
// 소비자↔사업자가 주고받는 마켓플레이스(견적·업체·리뷰·배송)+결제/커머스+계정/인프라. 분리 금지.
//
// 단일 소스 = packages/db/src/supabase/types.ts(실 DB 생성). 이 파일은 그 전체에서
// 이 도메인 테이블만 골라 re-export 하는 "뷰"다(소유권 분류 근거: docs/260625_backend_domain_map.md §3).
// 목적: 각 feature 가 자기 도메인 표면만 보게 해 ergonomics 개선. 인가는 RLS 가 책임(이 분류 ≠ 권한).
// Insert/Update 가 필요하면 types.ts 의 TablesInsert<"x">/TablesUpdate<"x"> 를 직접 쓴다.
// 네이밍: 테이블명 PascalCase(단수화 안 함 — 기계적·드리프트 방지). 예: community_posts → CommunityPosts.
// ───────────────────────────────────────────────────────────────────────────
import type { Tables } from "@/integrations/supabase/types";

/** 이 도메인이 주로 소유하는 테이블명 union (도메인 스코프 .from() 타이핑용). */
export type SharedTable =
  | "places"
  | "place_details"
  | "place_gallery_images"
  | "place_halls"
  | "place_wedding_halls"
  | "place_studios"
  | "place_studio_products"
  | "place_dress_shops"
  | "place_makeup_shops"
  | "place_hanboks"
  | "place_jewelry"
  | "place_tailor_shops"
  | "place_honeymoons"
  | "place_appliances"
  | "place_invitation_venues"
  | "place_media"
  | "place_media_albums"
  | "place_sources"
  | "place_reviews"
  | "place_inquiries"
  | "inquiries"
  | "products"
  | "favorites"
  | "quote_requests"
  | "quote_request_targets"
  | "quote_responses"
  | "quote_messages"
  | "payments"
  | "subscriptions"
  | "billing_attempts"
  | "orders"
  | "order_items"
  | "cart_items"
  | "point_transactions"
  | "heart_transactions"
  | "user_hearts"
  | "user_points"
  | "profiles"
  | "user_roles"
  | "user_consents"
  | "user_consents_canonical"
  | "app_config"
  | "app_notifications"
  | "client_error_logs"
  | "dress_fittings"
  | "dress_samples"
  | "hair_samples"
  | "makeup_samples"
  | "invitation_assets"
  | "invitation_templates"
  | "business_products"
  | "business_coupons"
  | "business_events"
  | "vendor_deliveries"
  | "admin_reports_overview";

// ── 각 테이블 Row 타입 ──
export type Places = Tables<"places">;
export type PlaceDetails = Tables<"place_details">;
export type PlaceGalleryImages = Tables<"place_gallery_images">;
export type PlaceHalls = Tables<"place_halls">;
export type PlaceWeddingHalls = Tables<"place_wedding_halls">;
export type PlaceStudios = Tables<"place_studios">;
export type PlaceStudioProducts = Tables<"place_studio_products">;
export type PlaceDressShops = Tables<"place_dress_shops">;
export type PlaceMakeupShops = Tables<"place_makeup_shops">;
export type PlaceHanboks = Tables<"place_hanboks">;
export type PlaceJewelry = Tables<"place_jewelry">;
export type PlaceTailorShops = Tables<"place_tailor_shops">;
export type PlaceHoneymoons = Tables<"place_honeymoons">;
export type PlaceAppliances = Tables<"place_appliances">;
export type PlaceInvitationVenues = Tables<"place_invitation_venues">;
export type PlaceMedia = Tables<"place_media">;
export type PlaceMediaAlbums = Tables<"place_media_albums">;
export type PlaceSources = Tables<"place_sources">;
export type PlaceReviews = Tables<"place_reviews">;
export type PlaceInquiries = Tables<"place_inquiries">;
export type Inquiries = Tables<"inquiries">;
export type Products = Tables<"products">;
export type Favorites = Tables<"favorites">;
export type QuoteRequests = Tables<"quote_requests">;
export type QuoteRequestTargets = Tables<"quote_request_targets">;
export type QuoteResponses = Tables<"quote_responses">;
export type QuoteMessages = Tables<"quote_messages">;
export type Payments = Tables<"payments">;
export type Subscriptions = Tables<"subscriptions">;
export type BillingAttempts = Tables<"billing_attempts">;
export type Orders = Tables<"orders">;
export type OrderItems = Tables<"order_items">;
export type CartItems = Tables<"cart_items">;
export type PointTransactions = Tables<"point_transactions">;
export type HeartTransactions = Tables<"heart_transactions">;
export type UserHearts = Tables<"user_hearts">;
export type UserPoints = Tables<"user_points">;
export type Profiles = Tables<"profiles">;
export type UserRoles = Tables<"user_roles">;
export type UserConsents = Tables<"user_consents">;
export type UserConsentsCanonical = Tables<"user_consents_canonical">;
export type AppConfig = Tables<"app_config">;
export type AppNotifications = Tables<"app_notifications">;
export type ClientErrorLogs = Tables<"client_error_logs">;
export type DressFittings = Tables<"dress_fittings">;
export type DressSamples = Tables<"dress_samples">;
export type HairSamples = Tables<"hair_samples">;
export type MakeupSamples = Tables<"makeup_samples">;
export type InvitationAssets = Tables<"invitation_assets">;
export type InvitationTemplates = Tables<"invitation_templates">;
export type BusinessProducts = Tables<"business_products">;
export type BusinessCoupons = Tables<"business_coupons">;
export type BusinessEvents = Tables<"business_events">;
export type VendorDeliveries = Tables<"vendor_deliveries">;
export type AdminReportsOverview = Tables<"admin_reports_overview">;
