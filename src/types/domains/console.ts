// ───────────────────────────────────────────────────────────────────────────
// 도메인 타입 뷰 — 운영/마케팅(Console) 도메인
// 운영자·service_role 전용. 모더레이션·콘텐츠 수집·마케팅 파이프라인·AI 운영.
//
// 단일 소스 = src/integrations/supabase/types.ts(실 DB 생성). 이 파일은 그 6,749줄에서
// 이 도메인 테이블만 골라 re-export 하는 "뷰"다(소유권 분류 근거: docs/260625_backend_domain_map.md §3).
// 목적: 각 feature 가 자기 도메인 표면만 보게 해 ergonomics 개선. 인가는 RLS 가 책임(이 분류 ≠ 권한).
// Insert/Update 가 필요하면 types.ts 의 TablesInsert<"x">/TablesUpdate<"x"> 를 직접 쓴다.
// 네이밍: 테이블명 PascalCase(단수화 안 함 — 기계적·드리프트 방지). 예: community_posts → CommunityPosts.
// ───────────────────────────────────────────────────────────────────────────
import type { Tables } from "@/integrations/supabase/types";

/** 이 도메인이 주로 소유하는 테이블명 union (도메인 스코프 .from() 타이핑용). */
export type ConsoleTable =
  | "agent_outputs"
  | "community_reports"
  | "product_blocklist"
  | "place_exclusions"
  | "geocode_admin"
  | "geocode_backfill_log"
  | "collection_logs"
  | "vendor_board_items"
  | "service_waitlist"
  | "instagram_post_drafts"
  | "tip_instagram_accounts"
  | "tip_instagrams"
  | "tip_blogs"
  | "tip_channels"
  | "influencers"
  | "influencer_contents"
  | "blocked_blog_authors"
  | "promotional_events"
  | "product_seed_keywords"
  | "naver_search_cache"
  | "product_search_cache"
  | "ai_prompts"
  | "invitation_fonts";

// ── 각 테이블 Row 타입 ──
export type AgentOutputs = Tables<"agent_outputs">;
export type CommunityReports = Tables<"community_reports">;
export type ProductBlocklist = Tables<"product_blocklist">;
export type PlaceExclusions = Tables<"place_exclusions">;
export type GeocodeAdmin = Tables<"geocode_admin">;
export type GeocodeBackfillLog = Tables<"geocode_backfill_log">;
export type CollectionLogs = Tables<"collection_logs">;
export type VendorBoardItems = Tables<"vendor_board_items">;
export type ServiceWaitlist = Tables<"service_waitlist">;
export type InstagramPostDrafts = Tables<"instagram_post_drafts">;
export type TipInstagramAccounts = Tables<"tip_instagram_accounts">;
export type TipInstagrams = Tables<"tip_instagrams">;
export type TipBlogs = Tables<"tip_blogs">;
export type TipChannels = Tables<"tip_channels">;
export type Influencers = Tables<"influencers">;
export type InfluencerContents = Tables<"influencer_contents">;
export type BlockedBlogAuthors = Tables<"blocked_blog_authors">;
export type PromotionalEvents = Tables<"promotional_events">;
export type ProductSeedKeywords = Tables<"product_seed_keywords">;
export type NaverSearchCache = Tables<"naver_search_cache">;
export type ProductSearchCache = Tables<"product_search_cache">;
export type AiPrompts = Tables<"ai_prompts">;
export type InvitationFonts = Tables<"invitation_fonts">;
