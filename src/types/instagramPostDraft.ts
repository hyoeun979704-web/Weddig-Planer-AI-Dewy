export type InstagramPostStatus =
  | "draft"
  | "approved"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed";

export type InstagramPostSourceType =
  | "manual"
  | "tip_blog"
  | "tip_instagram"
  | "tip_video"
  | "partner_deal"
  | "promotional_event"
  | "place"
  | "season";

export interface InstagramCardText {
  title?: string;
  body?: string;
  footer?: string;
}

export interface InstagramPostDraft {
  id: string;
  topic: string;
  source_type: InstagramPostSourceType;
  source_id: string | null;
  caption: string | null;
  hashtags: string[];
  card_count: number;
  card_image_urls: string[];
  card_texts: InstagramCardText[];
  status: InstagramPostStatus;
  scheduled_for: string | null;
  published_at: string | null;
  published_permalink: string | null;
  published_media_id: string | null;
  last_error: string | null;
  retry_count: number;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export const STATUS_LABEL: Record<InstagramPostStatus, string> = {
  draft: "초안",
  approved: "승인",
  scheduled: "예약",
  publishing: "발행중",
  published: "발행완료",
  failed: "실패",
};

export const STATUS_TONE: Record<InstagramPostStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  approved: "bg-blue-100 text-blue-700",
  scheduled: "bg-amber-100 text-amber-700",
  publishing: "bg-purple-100 text-purple-700",
  published: "bg-emerald-100 text-emerald-700",
  failed: "bg-destructive/10 text-destructive",
};
