// YouTube channel ATOM RSS feed parser.
//
// 공개 endpoint: https://www.youtube.com/feeds/videos.xml?channel_id=<UC...>
// API key 불필요, quota 0. 채널당 최근 ~15개 영상 반환.
//
// 채널이 비활성/삭제됐을 때 YouTube 가 200 + 빈 피드를 주는 케이스가 있고
// 404 를 주는 케이스도 있다 — 호출자는 빈 배열을 정상 응답으로 취급.
//
// 정규식 파서 사용 이유: YouTube 가 발행하는 ATOM 포맷은 안정적이고 cardinality
// 낮아 fast-xml-parser 같은 의존성 추가 대비 이득이 적다. 의존성 0 유지.

const FEED_URL = (channelId: string): string =>
  `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;

export interface RssVideo {
  videoId: string;
  title: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
  description: string;
  /** Some YouTube feeds include media:statistics views — when present, we can
   *  skip videos.list for stats. null 이면 후속 batch fetch 필요. */
  viewCountFromFeed: number | null;
}

const MIN_GAP_MS = 80;
let lastCallAt = 0;
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function throttle(): Promise<void> {
  const elapsed = Date.now() - lastCallAt;
  if (elapsed < MIN_GAP_MS) await sleep(MIN_GAP_MS - elapsed);
  lastCallAt = Date.now();
}

export async function fetchChannelRss(channelId: string): Promise<RssVideo[]> {
  await throttle();
  const res = await fetch(FEED_URL(channelId));
  if (res.status === 404 || res.status === 410) return [];
  if (!res.ok) {
    throw new Error(`YouTube RSS ${res.status} for ${channelId}`);
  }
  const xml = await res.text();
  return parseFeed(xml);
}

// Exported for tests.
export function parseFeed(xml: string): RssVideo[] {
  // Feed-level author/name 은 채널 이름. entry 내부 author 가 빠진 경우 fallback.
  const feedAuthor = matchOne(
    xml.replace(/<entry>[\s\S]*$/, ""),
    /<author>\s*<name>([\s\S]*?)<\/name>/,
  );

  const entries: RssVideo[] = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(xml)) !== null) {
    const e = m[1];
    const videoId = matchOne(e, /<yt:videoId>([^<]+)<\/yt:videoId>/);
    if (!videoId) continue;
    const entryChannelId = matchOne(e, /<yt:channelId>([^<]+)<\/yt:channelId>/);
    const title = decodeEntities(matchOne(e, /<title>([\s\S]*?)<\/title>/));
    const entryAuthor = decodeEntities(
      matchOne(e, /<author>\s*<name>([\s\S]*?)<\/name>/),
    );
    const published = matchOne(e, /<published>([^<]+)<\/published>/);
    const thumbnail = matchOne(e, /<media:thumbnail\s+url="([^"]+)"/);
    const description = decodeEntities(
      matchOne(e, /<media:description>([\s\S]*?)<\/media:description>/),
    );
    const viewsAttr = matchOne(e, /<media:statistics\s+views="(\d+)"/);
    entries.push({
      videoId,
      title,
      channelId: entryChannelId,
      channelTitle: entryAuthor || decodeEntities(feedAuthor),
      publishedAt: published,
      thumbnailUrl: thumbnail,
      description,
      viewCountFromFeed: viewsAttr ? Number(viewsAttr) : null,
    });
  }
  return entries;
}

function matchOne(s: string, re: RegExp): string {
  const m = s.match(re);
  return m ? m[1].trim() : "";
}

const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
};

function decodeEntities(s: string): string {
  if (!s) return "";
  return s
    .replace(/&(amp|lt|gt|quot|apos|#39);/g, (m) => ENTITY_MAP[m] ?? m)
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}
