#!/usr/bin/env tsx
// 결혼 매거진 RSS feed 폴링 — quota 0.
//
// 네이버 검색 API 대비 장점:
//   - 광고 비율 낮음 (매거진 자체 큐레이션)
//   - 글 품질 안정적
//   - quota 없음 (퍼블릭 RSS)
//
// 단점:
//   - 매거진별 RSS 지원 다름. 일부는 RSS 미제공
//   - 양은 검색 API 보다 적음 (매거진 글 발행 주기)
//
// 사용:
//   npm run collect-magazines             # 모든 등록 매거진
//   npm run collect-magazines -- --dry-run

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import {
  buildClassifyText,
  classifyTipCategories,
  isLikelyAdvertisement,
} from "../../src/lib/tipClassify";
import { normalizeTipCategories } from "../../src/lib/tipNormalize";
import { TIP_CATEGORIES } from "./queries";

// ─── 매거진 RSS 등록 ──────────────────────────────────────
// 새 매거진 발견 시 여기에 추가만 하면 자동 수집됨.
// RSS URL 은 매거진 도메인의 /rss 또는 /feed 시도.
//
// 운영자가 매거진 URL 발견 시:
//   1. 브라우저 콘솔에서: fetch('도메인/rss').then(r=>r.text())
//   2. 정상 ATOM/RSS XML 반환되면 아래 배열 추가
//   3. npm run collect-magazines --dry-run 으로 검증
//   4. PR
interface Magazine {
  name: string;
  rssUrl: string;
  baseUrl: string;
}

const MAGAZINES: Magazine[] = [
  // 사용자가 발견한 RSS URL 여기 추가. 일단 빈 시드 — collect 시 RSS 도메인
  // 발굴 후 추가 PR 로 누적.
  //
  // 예시 (검증 필요):
  // { name: "My Wedding", rssUrl: "https://mywedding.designhouse.co.kr/rss", baseUrl: "https://mywedding.designhouse.co.kr" },
  // { name: "더 네스트", rssUrl: "https://thenest.co.kr/feed", baseUrl: "https://thenest.co.kr" },
];

// ─── Args ──────────────────────────────────────
interface Args {
  dryRun: boolean;
  limit: number | null;
}

function parseArgs(): Args {
  const args: Args = { dryRun: false, limit: null };
  for (const a of process.argv.slice(2)) {
    if (a === "--dry-run") args.dryRun = true;
    else if (a.startsWith("--limit=")) args.limit = +a.split("=")[1];
  }
  return args;
}

// ─── RSS 파서 ──────────────────────────────────────
interface RssEntry {
  url: string;
  title: string;
  description: string;
  author: string;
  postDate: string | null;
  thumbnail: string | null;
}

const MIN_GAP_MS = 200;
let lastCallAt = 0;
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function throttle(): Promise<void> {
  const elapsed = Date.now() - lastCallAt;
  if (elapsed < MIN_GAP_MS) await sleep(MIN_GAP_MS - elapsed);
  lastCallAt = Date.now();
}

const ENTITY = (s: string): string =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<\/?[^>]+>/g, "");

const matchOne = (s: string, re: RegExp): string => {
  const m = s.match(re);
  return m ? m[1].trim() : "";
};

// RSS 2.0 또는 ATOM 자동 감지 파서. 항목별로 link/title/description/pubDate/author/image 추출.
function parseRss(xml: string, magazine: Magazine): RssEntry[] {
  const entries: RssEntry[] = [];
  // RSS 2.0: <item>...</item>
  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const e = m[1];
    const url = matchOne(e, /<link[^>]*>([^<]+)<\/link>/);
    if (!url) continue;
    const title = ENTITY(matchOne(e, /<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/));
    const description = ENTITY(
      matchOne(e, /<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/),
    );
    const pubDate = matchOne(e, /<pubDate[^>]*>([^<]+)<\/pubDate>/);
    const author = ENTITY(
      matchOne(e, /<(?:author|dc:creator)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:author|dc:creator)>/),
    );
    const enclosure = matchOne(e, /<enclosure[^>]+url="([^"]+)"/);
    const mediaContent = matchOne(e, /<media:content[^>]+url="([^"]+)"/);
    const mediaThumb = matchOne(e, /<media:thumbnail[^>]+url="([^"]+)"/);
    const thumbnail = enclosure || mediaContent || mediaThumb || null;
    entries.push({
      url: url.trim(),
      title,
      description,
      author: author || magazine.name,
      postDate: pubDate ? new Date(pubDate).toISOString().slice(0, 10) : null,
      thumbnail,
    });
  }
  // ATOM 폴백: <entry>
  if (entries.length === 0) {
    const entryRe = /<entry[^>]*>([\s\S]*?)<\/entry>/g;
    while ((m = entryRe.exec(xml)) !== null) {
      const e = m[1];
      const url = matchOne(e, /<link[^>]+href="([^"]+)"/);
      if (!url) continue;
      const title = ENTITY(matchOne(e, /<title[^>]*>([\s\S]*?)<\/title>/));
      const description = ENTITY(
        matchOne(e, /<(?:summary|content)[^>]*>([\s\S]*?)<\/(?:summary|content)>/),
      );
      const pubDate = matchOne(e, /<published[^>]*>([^<]+)<\/published>/);
      const author = ENTITY(matchOne(e, /<author>\s*<name>([\s\S]*?)<\/name>/));
      entries.push({
        url: url.trim(),
        title,
        description,
        author: author || magazine.name,
        postDate: pubDate ? pubDate.slice(0, 10) : null,
        thumbnail: null,
      });
    }
  }
  return entries;
}

async function fetchRss(magazine: Magazine): Promise<RssEntry[]> {
  await throttle();
  const res = await fetch(magazine.rssUrl);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const xml = await res.text();
  return parseRss(xml, magazine);
}

// ─── 메인 ──────────────────────────────────────
async function main(): Promise<void> {
  const args = parseArgs();
  if (!args.dryRun && (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  if (MAGAZINES.length === 0) {
    console.log(
      "[collect-magazines] 등록된 매거진 RSS 없음.\n" +
        "→ scripts/collect-tips/magazine-rss.ts 의 MAGAZINES 배열에 매거진 추가 후 재실행.",
    );
    return;
  }

  const supabase = args.dryRun
    ? null
    : createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
      );

  console.log(`\n[collect-magazines] ${MAGAZINES.length} magazines`);

  const pool = new Map<string, {
    url: string;
    title: string;
    description: string;
    blogger_name: string;
    blogger_link: string;
    post_date: string | null;
    thumbnail_url: string | null;
    categories: string[];
    source: string;
    is_active: boolean;
    is_ad_suspected: boolean;
  }>();

  for (const mag of MAGAZINES) {
    try {
      const entries = await fetchRss(mag);
      console.log(`  ${mag.name}: ${entries.length} entries`);
      for (const e of entries) {
        if (pool.has(e.url)) continue;
        const text = `${e.title} ${e.description} ${e.author}`;
        const isAd = isLikelyAdvertisement(text);
        const cls = buildClassifyText({
          title: e.title,
          description: e.description,
          channelName: e.author,
        });
        const categories = normalizeTipCategories(
          classifyTipCategories(cls, TIP_CATEGORIES),
        );
        pool.set(e.url, {
          url: e.url,
          title: e.title,
          description: e.description,
          blogger_name: e.author,
          blogger_link: mag.baseUrl,
          post_date: e.postDate,
          thumbnail_url: e.thumbnail,
          categories,
          source: "magazine_rss",
          is_active: categories.length > 0 && !isAd,
          is_ad_suspected: isAd,
        });
      }
    } catch (err) {
      console.error(`  ${mag.name}: failed — ${(err as Error).message}`);
    }
  }

  const rows = Array.from(pool.values());
  const active = rows.filter((r) => r.is_active).length;
  console.log(`\n[summary] unique=${rows.length} active=${active} ad=${rows.length - active}`);

  if (args.dryRun || !supabase || rows.length === 0) {
    if (args.dryRun) console.log("[dry-run] no upsert");
    return;
  }

  const { error } = await (supabase as any)
    .from("tip_blogs")
    .upsert(rows, { onConflict: "url", ignoreDuplicates: false });
  if (error) {
    console.error("upsert failed:", error.message);
    process.exit(1);
  }
  console.log(`upserted: ${rows.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
