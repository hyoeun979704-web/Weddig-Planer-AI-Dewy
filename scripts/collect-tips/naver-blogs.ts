#!/usr/bin/env tsx
// 네이버 블로그 검색 API 로 결혼 준비 컨텐츠 수집.
//
// 무료 한도: 일 25,000 호출 (https://developers.naver.com/docs/serviceapi/search/blog/blog.md).
// 카테고리당 키워드 N개 × 페이지 P개 × 100건 → 한도 5% 내로 운영.
//
// 사용:
//   npm run collect-blogs                 # 모든 카테고리
//   npm run collect-blogs -- --category=wedding_hall
//   npm run collect-blogs -- --dry-run
//
// 환경변수 (네이버 개발자 센터 발급):
//   NAVER_CLIENT_ID
//   NAVER_CLIENT_SECRET

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import {
  buildClassifyText,
  classifyTipCategories,
  isLikelyAdvertisement,
} from "../../src/lib/tipClassify";
import { normalizeTipCategories } from "../../src/lib/tipNormalize";
import { TIP_CATEGORIES } from "./queries";

// ─── 카테고리·키워드 ──────────────────────────────────────
// 블로그는 가격·예산·체크리스트·후기 정보성 키워드 위주.
const BLOG_QUERIES: Partial<Record<string, string[]>> = {
  wedding_hall: ["웨딩홀 가격 비교", "예식장 견적", "보증인원 식대", "호텔웨딩 비용", "스몰웨딩 후기", "하우스웨딩 비용"],
  studio: ["스튜디오 가격", "본식 DVD 후기", "리허설 촬영 비용", "셀프웨딩 촬영", "스드메 가격", "스튜디오 추천"],
  dress_shop: ["드레스샵 가격", "드레스 투어 후기", "본식 드레스 추천", "체형별 드레스", "예신 드레스 피팅"],
  makeup_shop: ["헤메 가격", "신부 메이크업 후기", "헤어 메이크업 추천", "본식 메이크업 꿀팁"],
  hanbok: ["한복 대여 가격", "혼주 한복 후기", "신부 한복 트렌드", "한복 맞춤 비용"],
  tailor_shop: ["신랑 예복 가격", "턱시도 대여", "맞춤 정장 후기", "신랑 정장 추천"],
  honeymoon: ["신혼여행 패키지 가격", "허니문 일정표", "신혼여행 추천", "허니문 호텔 추천", "동남아 허니문 비용"],
  wedding_gifts: ["예단 비용", "예물 추천", "예물 시계 추천", "결혼 반지 추천", "함 보내기"],
  newlywed_home: ["신혼집 전세 자금", "신혼집 인테리어 비용", "혼수 가전 견적", "신혼집 평수"],
  family_meeting: ["상견례 식당 추천", "상견례 코스 메뉴", "상견례 예절"],
  legal_paperwork: ["혼인신고 서류", "혼인신고 절차", "디딤돌 대출", "전세자금 대출 혼인"],
  bridal_care: ["웨딩 다이어트 식단", "신부 피부 관리", "결혼식 다이어트", "예신 관리 비용"],
  ceremony: ["결혼식 비용", "결혼 준비 순서", "결혼식 BGM 리스트", "신부 입장곡 추천", "축가 추천 가요", "축의금 계좌"],
  wedding_hall_alt: [], // 빈 자리 holder — 제거
  invitation_venue: ["청첩장 비용", "모바일 청첩장 추천", "청첩장 모임 장소"],
  appliance: ["혼수 가전 견적", "신혼 가전 가성비", "혼수 침대 매트리스", "혼수 냉장고 추천"],
  general: ["결혼 준비 체크리스트", "결혼 비용 총정리", "예비부부 준비"],
  // 페르소나
  pregnancy_wedding: ["임신 결혼 준비", "임산부 웨딩드레스", "마타니티 드레스"],
  remarriage_family: ["재혼 결혼식 후기", "자녀 동반 결혼식", "재혼 청첩장 문구", "작은 가족식"],
  international_wedding: ["국제결혼 절차", "국제결혼 비자", "다국적 결혼 가족 인사"],
  self_no_ceremony: ["결혼식 안 한 후기", "혼인신고만 결혼", "노웨딩 라이프", "셀프 청첩장"],
  groom_focus: ["신랑이 챙길 일", "신랑 양가 분담", "신랑 단독 결혼 준비"],
};

// ─── Args ──────────────────────────────────────
interface Args {
  category?: string;
  pages: number;
  dryRun: boolean;
}

function parseArgs(): Args {
  const args: Args = { pages: 2, dryRun: false };
  for (const a of process.argv.slice(2)) {
    if (a === "--dry-run") args.dryRun = true;
    else if (a.startsWith("--category=")) args.category = a.split("=")[1];
    else if (a.startsWith("--pages=")) args.pages = +a.split("=")[1];
  }
  return args;
}

// ─── 네이버 API ──────────────────────────────────────
interface NaverBlogItem {
  title: string;
  link: string;
  description: string;
  bloggername: string;
  bloggerlink: string;
  postdate: string; // YYYYMMDD
}

const NAVER_ENDPOINT = "https://openapi.naver.com/v1/search/blog.json";
const MIN_GAP_MS = 100;
let lastCallAt = 0;
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function throttle(): Promise<void> {
  const elapsed = Date.now() - lastCallAt;
  if (elapsed < MIN_GAP_MS) await sleep(MIN_GAP_MS - elapsed);
  lastCallAt = Date.now();
}

async function searchNaverBlog(
  query: string,
  start: number,
  clientId: string,
  clientSecret: string,
): Promise<NaverBlogItem[]> {
  await throttle();
  const params = new URLSearchParams({
    query,
    display: "100",
    start: String(start),
    sort: "sim", // 정확도 순 (date 는 광고 노출 ↑)
  });
  const res = await fetch(`${NAVER_ENDPOINT}?${params.toString()}`, {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Naver ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { items?: NaverBlogItem[] };
  return data.items ?? [];
}

// Naver 응답의 <b></b> 태그·HTML entity 정리.
function stripHtml(s: string): string {
  return s
    .replace(/<\/?b>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'");
}

function parsePostDate(yyyymmdd: string): string | null {
  if (!/^\d{8}$/.test(yyyymmdd)) return null;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

// ─── 메인 ──────────────────────────────────────
async function main(): Promise<void> {
  const args = parseArgs();
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("Missing NAVER_CLIENT_ID / NAVER_CLIENT_SECRET");
    process.exit(1);
  }
  if (!args.dryRun && (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = args.dryRun
    ? null
    : createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
      );

  // 차단 블로거 목록 (Layer 2) — 운영자가 누적한 블랙리스트.
  let blockedAuthors = new Set<string>();
  if (supabase) {
    const { data } = await (supabase as any)
      .from("blocked_blog_authors")
      .select("blogger_name");
    blockedAuthors = new Set(
      (data ?? []).map((r: { blogger_name: string }) => r.blogger_name),
    );
    console.log(`blocked authors: ${blockedAuthors.size}`);
  }

  // 카테고리 선택
  const categories = args.category
    ? [args.category]
    : Object.keys(BLOG_QUERIES).filter((k) => (BLOG_QUERIES[k]?.length ?? 0) > 0);

  console.log(`\n[collect-blogs] cats=${categories.length}, pages=${args.pages}, dry=${args.dryRun}`);

  // url → row pool (dedup)
  const pool = new Map<string, {
    url: string;
    title: string;
    description: string;
    blogger_name: string;
    blogger_link: string;
    post_date: string | null;
    categories: string[];
    search_query: string;
    is_active: boolean;
    is_ad_suspected: boolean;
  }>();

  let totalApiCalls = 0;
  let totalRaw = 0;
  let blockedCount = 0;
  let adCount = 0;
  let uncategorizedCount = 0;

  for (const cat of categories) {
    const queries = BLOG_QUERIES[cat] ?? [];
    console.log(`\n[${cat}] ${queries.length} queries`);
    for (const q of queries) {
      for (let p = 0; p < args.pages; p++) {
        const start = p * 100 + 1;
        try {
          const items = await searchNaverBlog(q, start, clientId, clientSecret);
          totalApiCalls++;
          totalRaw += items.length;
          for (const it of items) {
            const url = it.link;
            if (pool.has(url)) continue;

            const title = stripHtml(it.title);
            const description = stripHtml(it.description);
            const bloggerName = it.bloggername || "";

            // Layer 2: 블랙리스트 블로거 차단
            if (blockedAuthors.has(bloggerName)) {
              blockedCount++;
              continue;
            }

            // Layer 1: 광고 anti-pattern
            const adText = `${title} ${description}`;
            const isAd = isLikelyAdvertisement(adText);
            if (isAd) adCount++;

            // 분류 (광고여도 일단 분류 시도 — 추후 검토 가능)
            const cls = buildClassifyText({
              title,
              description,
              channelName: bloggerName,
            });
            const categories = normalizeTipCategories(
              classifyTipCategories(cls, TIP_CATEGORIES),
            );
            if (categories.length === 0) uncategorizedCount++;

            pool.set(url, {
              url,
              title,
              description,
              blogger_name: bloggerName,
              blogger_link: it.bloggerlink || "",
              post_date: parsePostDate(it.postdate || ""),
              categories,
              search_query: q,
              // 광고는 노출 안 함 + 분류 0개도 노출 안 함.
              is_active: categories.length > 0 && !isAd,
              is_ad_suspected: isAd,
            });
          }
          process.stdout.write(`  · "${q}" p${p + 1}: +${items.length}\n`);
        } catch (e) {
          process.stdout.write(`  · "${q}" p${p + 1}: error ${(e as Error).message.slice(0, 100)}\n`);
        }
      }
    }
  }

  const rows = Array.from(pool.values());
  console.log(`\n[summary]`);
  console.log(`  api calls:      ${totalApiCalls} (limit 25,000/일)`);
  console.log(`  raw items:      ${totalRaw}`);
  console.log(`  unique:         ${rows.length}`);
  console.log(`  blocked author: ${blockedCount}`);
  console.log(`  ad suspected:   ${adCount}`);
  console.log(`  uncategorized:  ${uncategorizedCount}`);
  console.log(`  → active:       ${rows.filter((r) => r.is_active).length}`);

  if (args.dryRun || !supabase) {
    console.log(`\n[dry-run] would upsert ${rows.length} blog posts`);
    return;
  }
  if (rows.length === 0) return;

  // url 이 unique 라 onConflict 로 idempotent.
  const { error } = await (supabase as any)
    .from("tip_blogs")
    .upsert(rows, { onConflict: "url", ignoreDuplicates: false });
  if (error) {
    console.error("upsert failed:", error.message);
    process.exit(1);
  }
  console.log(`\nupserted: ${rows.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
