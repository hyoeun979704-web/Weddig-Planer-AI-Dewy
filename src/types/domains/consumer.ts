// ───────────────────────────────────────────────────────────────────────────
// 도메인 타입 뷰 — 소비자(신랑신부) 도메인
// AI 도구·준비도구·커뮤니티·청첩장·성장·동기화(캘린더/드라이브/메일). 소비자 본인 데이터(RLS auth.uid()=user).
//
// 단일 소스 = src/integrations/supabase/types.ts(실 DB 생성). 이 파일은 그 전체에서
// 이 도메인 테이블만 골라 re-export 하는 "뷰"다(소유권 분류 근거: docs/260625_backend_domain_map.md §3).
// 목적: 각 feature 가 자기 도메인 표면만 보게 해 ergonomics 개선. 인가는 RLS 가 책임(이 분류 ≠ 권한).
// Insert/Update 가 필요하면 types.ts 의 TablesInsert<"x">/TablesUpdate<"x"> 를 직접 쓴다.
// 네이밍: 테이블명 PascalCase(단수화 안 함 — 기계적·드리프트 방지). 예: community_posts → CommunityPosts.
// ───────────────────────────────────────────────────────────────────────────
import type { Tables } from "@/integrations/supabase/types";

/** 이 도메인이 주로 소유하는 테이블명 union (도메인 스코프 .from() 타이핑용). */
export type ConsumerTable =
  | "ai_chat_sessions"
  | "ai_chat_messages"
  | "ai_usage_daily"
  | "ai_usage_minute"
  | "user_ai_memory"
  | "hair_preview_jobs"
  | "hair_preview_usage"
  | "photo_retouch_jobs"
  | "photo_retouch_usage"
  | "makeup_fittings"
  | "wedding_consulting_reports"
  | "wedding_consulting_usage"
  | "budget_items"
  | "budget_settings"
  | "guest_list_items"
  | "user_schedule_items"
  | "user_wedding_settings"
  | "couple_links"
  | "couple_votes"
  | "couple_diary"
  | "couple_diary_photos"
  | "family_invites"
  | "invitations"
  | "invitation_rsvp"
  | "community_posts"
  | "community_comments"
  | "community_likes"
  | "community_comment_likes"
  | "community_post_places"
  | "community_announcements"
  | "community_notifications"
  | "user_blocks"
  | "referrals"
  | "referral_codes"
  | "game_scores"
  | "user_attendance"
  | "user_events"
  | "view_events"
  | "product_clicks"
  | "coupon_downloads"
  | "tutorial_tours"
  | "tutorial_completions"
  | "tip_videos"
  | "partner_deals"
  | "deal_claims"
  | "calendar_event_links"
  | "calendar_oauth_states"
  | "user_calendar_accounts"
  | "drive_oauth_states"
  | "user_drive_accounts"
  | "invitation_drive_settings"
  | "mail_oauth_states"
  | "user_mail_accounts"
  | "design_purchase_intents"
  | "design_purchases"
  | "designer_designs"
  | "invitation_guest_photos";

// ── 각 테이블 Row 타입 ──
export type AiChatSessions = Tables<"ai_chat_sessions">;
export type AiChatMessages = Tables<"ai_chat_messages">;
export type AiUsageDaily = Tables<"ai_usage_daily">;
export type AiUsageMinute = Tables<"ai_usage_minute">;
export type UserAiMemory = Tables<"user_ai_memory">;
export type HairPreviewJobs = Tables<"hair_preview_jobs">;
export type HairPreviewUsage = Tables<"hair_preview_usage">;
export type PhotoRetouchJobs = Tables<"photo_retouch_jobs">;
export type PhotoRetouchUsage = Tables<"photo_retouch_usage">;
export type MakeupFittings = Tables<"makeup_fittings">;
export type WeddingConsultingReports = Tables<"wedding_consulting_reports">;
export type WeddingConsultingUsage = Tables<"wedding_consulting_usage">;
export type BudgetItems = Tables<"budget_items">;
export type BudgetSettings = Tables<"budget_settings">;
export type GuestListItems = Tables<"guest_list_items">;
export type UserScheduleItems = Tables<"user_schedule_items">;
export type UserWeddingSettings = Tables<"user_wedding_settings">;
export type CoupleLinks = Tables<"couple_links">;
export type CoupleVotes = Tables<"couple_votes">;
export type CoupleDiary = Tables<"couple_diary">;
export type CoupleDiaryPhotos = Tables<"couple_diary_photos">;
export type FamilyInvites = Tables<"family_invites">;
export type Invitations = Tables<"invitations">;
export type InvitationRsvp = Tables<"invitation_rsvp">;
export type CommunityPosts = Tables<"community_posts">;
export type CommunityComments = Tables<"community_comments">;
export type CommunityLikes = Tables<"community_likes">;
export type CommunityCommentLikes = Tables<"community_comment_likes">;
export type CommunityPostPlaces = Tables<"community_post_places">;
export type CommunityAnnouncements = Tables<"community_announcements">;
export type CommunityNotifications = Tables<"community_notifications">;
export type UserBlocks = Tables<"user_blocks">;
export type Referrals = Tables<"referrals">;
export type ReferralCodes = Tables<"referral_codes">;
export type GameScores = Tables<"game_scores">;
export type UserAttendance = Tables<"user_attendance">;
export type UserEvents = Tables<"user_events">;
export type ViewEvents = Tables<"view_events">;
export type ProductClicks = Tables<"product_clicks">;
export type CouponDownloads = Tables<"coupon_downloads">;
export type TutorialTours = Tables<"tutorial_tours">;
export type TutorialCompletions = Tables<"tutorial_completions">;
export type TipVideos = Tables<"tip_videos">;
export type PartnerDeals = Tables<"partner_deals">;
export type DealClaims = Tables<"deal_claims">;
export type CalendarEventLinks = Tables<"calendar_event_links">;
export type CalendarOauthStates = Tables<"calendar_oauth_states">;
export type UserCalendarAccounts = Tables<"user_calendar_accounts">;
export type DriveOauthStates = Tables<"drive_oauth_states">;
export type UserDriveAccounts = Tables<"user_drive_accounts">;
export type InvitationDriveSettings = Tables<"invitation_drive_settings">;
export type MailOauthStates = Tables<"mail_oauth_states">;
export type UserMailAccounts = Tables<"user_mail_accounts">;
export type DesignPurchaseIntents = Tables<"design_purchase_intents">;
export type DesignPurchases = Tables<"design_purchases">;
export type DesignerDesigns = Tables<"designer_designs">;
export type InvitationGuestPhotos = Tables<"invitation_guest_photos">;
