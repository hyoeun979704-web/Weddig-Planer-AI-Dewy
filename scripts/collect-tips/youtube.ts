// YouTube Data API v3 client.
// Docs: https://developers.google.com/youtube/v3/docs/search/list
//
// Quota: 10,000 units/day free. search.list = 100 units, videos.list = 1 unit.
// 1 collect run = (categories × queries) × 100 + 1 batched videos.list.
// e.g. 9 categories × 4 queries = 3,600 units → fits 2-3 runs/day comfortably.

const SEARCH_ENDPOINT = "https://www.googleapis.com/youtube/v3/search";
const VIDEOS_ENDPOINT = "https://www.googleapis.com/youtube/v3/videos";

export interface YouTubeSearchItem {
  videoId: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
}

export interface YouTubeVideoStats {
  videoId: string;
  viewCount: number;
  likeCount: number;
  durationSeconds: number;
}

interface SearchResponse {
  items: Array<{
    id: { videoId: string };
    snippet: {
      title: string;
      description: string;
      channelId: string;
      channelTitle: string;
      publishedAt: string;
      thumbnails: {
        high?: { url: string };
        medium?: { url: string };
        default?: { url: string };
      };
    };
  }>;
}

interface VideosResponse {
  items: Array<{
    id: string;
    statistics?: {
      viewCount?: string;
      likeCount?: string;
    };
    contentDetails?: {
      duration?: string; // ISO 8601 PT#M#S
    };
  }>;
}

// Throttle to avoid burst limits. YouTube allows 100 QPS but we keep it sane.
const MIN_GAP_MS = 100;
let lastCallAt = 0;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function throttle() {
  const elapsed = Date.now() - lastCallAt;
  if (elapsed < MIN_GAP_MS) await sleep(MIN_GAP_MS - elapsed);
  lastCallAt = Date.now();
}

/**
 * Search videos. Each call costs 100 quota units.
 * Filters: 한국어 (relevanceLanguage), 최근 2년, 영상만 (type=video).
 */
export async function searchVideos(
  query: string,
  apiKey: string,
  maxResults = 10
): Promise<YouTubeSearchItem[]> {
  await throttle();
  const publishedAfter = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString();
  const params = new URLSearchParams({
    key: apiKey,
    part: "snippet",
    q: query,
    type: "video",
    maxResults: String(maxResults),
    relevanceLanguage: "ko",
    regionCode: "KR",
    order: "relevance",
    publishedAfter,
    safeSearch: "moderate",
  });
  const res = await fetch(`${SEARCH_ENDPOINT}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`YouTube search ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as SearchResponse;
  return (data.items ?? []).map((it) => {
    const t = it.snippet.thumbnails;
    return {
      videoId: it.id.videoId,
      title: it.snippet.title,
      description: it.snippet.description,
      channelId: it.snippet.channelId,
      channelTitle: it.snippet.channelTitle,
      publishedAt: it.snippet.publishedAt,
      thumbnailUrl: t.high?.url ?? t.medium?.url ?? t.default?.url ?? "",
    };
  });
}

/**
 * Fetch view/like/duration for up to 50 video IDs in one call (1 quota unit).
 */
export async function fetchVideoStats(
  videoIds: string[],
  apiKey: string
): Promise<Map<string, YouTubeVideoStats>> {
  const out = new Map<string, YouTubeVideoStats>();
  if (videoIds.length === 0) return out;

  // YouTube allows up to 50 IDs per call.
  for (let i = 0; i < videoIds.length; i += 50) {
    await throttle();
    const batch = videoIds.slice(i, i + 50);
    const params = new URLSearchParams({
      key: apiKey,
      part: "statistics,contentDetails",
      id: batch.join(","),
    });
    const res = await fetch(`${VIDEOS_ENDPOINT}?${params.toString()}`);
    if (!res.ok) {
      console.warn(`YouTube videos.list ${res.status}: ${(await res.text()).slice(0, 200)}`);
      continue;
    }
    const data = (await res.json()) as VideosResponse;
    for (const it of data.items ?? []) {
      out.set(it.id, {
        videoId: it.id,
        viewCount: +(it.statistics?.viewCount ?? 0),
        likeCount: +(it.statistics?.likeCount ?? 0),
        durationSeconds: parseIsoDuration(it.contentDetails?.duration ?? ""),
      });
    }
  }
  return out;
}

// ISO 8601 duration → seconds. e.g. "PT1H2M3S" → 3723
function parseIsoDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const h = +(m[1] ?? 0), mi = +(m[2] ?? 0), s = +(m[3] ?? 0);
  return h * 3600 + mi * 60 + s;
}
