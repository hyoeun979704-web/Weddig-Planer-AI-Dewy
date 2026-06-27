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
  /** 카드 배경 사진 URL (표지/본문). 없으면 그라데이션 폴백. */
  image_url?: string;
  /** 좌하단 출처 핸들(@계정). 표지는 본문 카드들의 handle 을 모아 표시(렌더러 도출). */
  handle?: string;
  /** 표지 우상단 썸네일(최대 3). 보통 렌더러가 본문 image_url 에서 자동 도출. */
  thumb_urls?: string[];
  /** CTA 2x2 그리드(최대 4). 보통 렌더러가 본문 image_url 에서 자동 도출. */
  grid_urls?: string[];
  /** 표지 핸들 여러 줄(명시 지정 시). 보통 렌더러가 본문 handle 에서 도출. */
  handles?: string[];
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
