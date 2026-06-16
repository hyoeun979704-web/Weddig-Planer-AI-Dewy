// Dewy 인스타그램 카드뉴스 — Satori 기반 PNG 렌더러
//
// 입력:  { draftId }
// 처리:  instagram_post_drafts.card_texts 를 읽어 Satori 로 HTML/CSS → SVG → PNG.
//        1080×1350 (4:5) N장 생성 → Supabase Storage(instagram-cards) 업로드.
// 출력:  card_image_urls 에 public URL 배열 UPDATE.
//
// 의존:  Supabase Storage 버킷 "instagram-cards" (public). 미생성 시 명시적 에러.
// 디자인: Figma "카드뉴스" 템플릿 (node 227:2) — 흰색→핑크(#F6909B) 세로 그라데이션
//        위에 큰 헤드라인(TITLE/DESCRIPTION), 마지막 장은 ❤️DEWY 워드마크 + 안내 카피.
//
// 폰트:  SUITE Variable(디자인 기준: ExtraBold/SemiBold/Regular). CDN 실패 시
//        검증된 Pretendard 로 graceful fallback — 폰트 때문에 렌더가 깨지지 않게.
//        Edge Function 콜드 스타트 시 jsdelivr 에서 한 번 fetch → Deno 모듈 캐시 의존.

import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import satori from "https://esm.sh/satori@0.10.13";
import { Resvg } from "https://esm.sh/@resvg/resvg-wasm@2.6.2";
import initResvg from "https://esm.sh/@resvg/resvg-wasm@2.6.2";


const STORAGE_BUCKET = "instagram-cards";
const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;

// Figma "카드뉴스" 템플릿 색상 (node 227:2)
const COLOR_BG_WHITE = "#FFFFFF";
const COLOR_POINT_PINK = "#F6909B"; // 그라데이션 하단 + 하트
const COLOR_TEXT_BLACK = "#000000"; // TITLE/DESCRIPTION/카피
// 흰색 상단 → 핑크 하단 세로 그라데이션 (Figma: from 50.481%)
const CARD_GRADIENT = "linear-gradient(to bottom, rgba(255,255,255,0) 50.481%, #F6909B 100%)";
// CTA 카드 기본 안내 문구 (text 미지정 시) — Figma 카피 그대로
const CTA_DEFAULT_FOOTER = "나에게 딱 맞는 결혼정보가 궁금하다면?\nAI 웨딩플래너 DEWY에게 물어봐!";

interface CardText {
  title?: string;
  body?: string;
  footer?: string;
}

// 폰트 캐시 (Edge Function 인스턴스 lifecycle 동안 재사용)
// 디자인 기준은 SUITE Variable. CDN 실패 시 항상 로드되는 Pretendard 로 fallback.
interface SatoriFont {
  name: string;
  data: ArrayBuffer;
  weight: number;
  style: "normal";
}
interface LoadedFonts {
  fonts: SatoriFont[];
  family: string; // satori fontFamily (예: "SUITE, Pretendard")
}
let fontsCache: LoadedFonts | null = null;
let resvgInitialized = false;

const PRETENDARD_BASE =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/web/static/woff2";
const SUITE_BASE =
  "https://cdn.jsdelivr.net/gh/sun-typeface/SUITE@2.0.0/fonts/static/woff2";

async function fetchFont(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch failed: ${url} ${res.status}`);
  return await res.arrayBuffer();
}

async function loadFonts(): Promise<LoadedFonts> {
  if (fontsCache) return fontsCache;

  // Pretendard 세 굵기(800/600/400) — 검증된 CDN, 항상 로드해 폴백 보장.
  const [pExtraBold, pSemiBold, pRegular] = await Promise.all([
    fetchFont(`${PRETENDARD_BASE}/Pretendard-ExtraBold.woff2`),
    fetchFont(`${PRETENDARD_BASE}/Pretendard-SemiBold.woff2`),
    fetchFont(`${PRETENDARD_BASE}/Pretendard-Regular.woff2`),
  ]);

  const fonts: SatoriFont[] = [
    { name: "Pretendard", data: pExtraBold, weight: 800, style: "normal" },
    { name: "Pretendard", data: pSemiBold, weight: 600, style: "normal" },
    { name: "Pretendard", data: pRegular, weight: 400, style: "normal" },
  ];
  let family = "Pretendard";

  // SUITE(디자인 기준) 시도 — 실패해도 Pretendard 로 진행(렌더가 깨지지 않게).
  try {
    const [sExtraBold, sSemiBold, sRegular] = await Promise.all([
      fetchFont(`${SUITE_BASE}/SUITE-ExtraBold.woff2`),
      fetchFont(`${SUITE_BASE}/SUITE-SemiBold.woff2`),
      fetchFont(`${SUITE_BASE}/SUITE-Regular.woff2`),
    ]);
    fonts.push(
      { name: "SUITE", data: sExtraBold, weight: 800, style: "normal" },
      { name: "SUITE", data: sSemiBold, weight: 600, style: "normal" },
      { name: "SUITE", data: sRegular, weight: 400, style: "normal" },
    );
    family = "SUITE, Pretendard";
  } catch (e) {
    console.warn(
      "SUITE 폰트 로드 실패 — Pretendard 로 대체:",
      e instanceof Error ? e.message : e,
    );
  }

  fontsCache = { fonts, family };
  return fontsCache;
}

// ============================================================================
// 카드 JSX (Satori 가 React 호환 JSX 트리를 SVG 로 변환)
// 표지 / 본문 / CTA 세 가지 변형
// ============================================================================

interface CardJSXProps {
  type: "cover" | "body" | "cta";
  text: CardText;
  fontFamily: string;
}

// 흰색→핑크 그라데이션 배경 레이어 (모든 카드 공통, 콘텐츠 뒤에 깔림)
function gradientLayer(): unknown {
  return {
    type: "div",
    props: {
      style: {
        position: "absolute",
        top: 0,
        left: 0,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        backgroundImage: CARD_GRADIENT,
      },
    },
  };
}

// Figma 카드뉴스 템플릿(1080×1350):
//  - 표지/본문: 하단 정렬 TITLE(ExtraBold 115) + DESCRIPTION(SemiBold 65)
//  - CTA: 상단 ❤️DEWY 워드마크 + 중앙 정렬 안내 카피(Regular 50)
// 이미지 슬롯은 후속 단계(텍스트/타이포 우선) — 지금은 그라데이션+카피만 렌더.
function buildCardJSX({ type, text, fontFamily }: CardJSXProps): unknown {
  if (type === "cta") {
    const footer = text.body || text.footer || CTA_DEFAULT_FOOTER;
    return {
      type: "div",
      props: {
        style: {
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: COLOR_BG_WHITE,
          padding: "80px 60px",
          position: "relative",
          fontFamily,
        },
        children: [
          gradientLayer(),
          // 상단 ❤️ DEWY 워드마크
          {
            type: "div",
            props: {
              style: { display: "flex", alignItems: "center", gap: 16 },
              children: [
                {
                  type: "div",
                  props: {
                    style: { fontSize: 70, color: COLOR_POINT_PINK },
                    children: "♥",
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: 70,
                      fontWeight: 800,
                      color: COLOR_TEXT_BLACK,
                      letterSpacing: 2,
                    },
                    children: "DEWY",
                  },
                },
              ],
            },
          },
          // 하단 안내 카피
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: 960,
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: 50,
                      fontWeight: 400,
                      color: COLOR_TEXT_BLACK,
                      textAlign: "center",
                      lineHeight: 1.4,
                      whiteSpace: "pre-wrap",
                    },
                    children: footer,
                  },
                },
              ],
            },
          },
        ],
      },
    };
  }

  // cover / body: 하단 정렬 헤드라인 (TITLE + DESCRIPTION)
  const textBlock: unknown[] = [];
  if (text.title) {
    textBlock.push({
      type: "div",
      props: {
        style: {
          fontSize: 115,
          fontWeight: 800,
          color: COLOR_TEXT_BLACK,
          lineHeight: 1.1,
          wordBreak: "keep-all",
        },
        children: text.title,
      },
    });
  }
  if (text.body) {
    textBlock.push({
      type: "div",
      props: {
        style: {
          fontSize: 65,
          fontWeight: 600,
          color: COLOR_TEXT_BLACK,
          lineHeight: 1.3,
          marginTop: 16,
          whiteSpace: "pre-wrap",
          wordBreak: "keep-all",
        },
        children: text.body,
      },
    });
  }

  return {
    type: "div",
    props: {
      style: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        backgroundColor: COLOR_BG_WHITE,
        padding: "80px 60px",
        position: "relative",
        fontFamily,
      },
      children: [
        gradientLayer(),
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", width: 960 },
            children: textBlock,
          },
        },
      ],
    },
  };
}

async function renderCardToPng(jsx: unknown, fonts: SatoriFont[]): Promise<Uint8Array> {
  const svg = await satori(jsx as never, {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    fonts: fonts as never,
  });

  if (!resvgInitialized) {
    const wasmRes = await fetch("https://esm.sh/@resvg/resvg-wasm@2.6.2/index_bg.wasm");
    const wasmBuf = await wasmRes.arrayBuffer();
    await initResvg(wasmBuf);
    resvgInitialized = true;
  }
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: CARD_WIDTH } });
  const png = resvg.render().asPng();
  return png;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error("instagram-card-renderer misconfigured");
      return new Response(
        JSON.stringify({ error: "server_misconfigured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === serviceRoleKey;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    if (!isServiceRole) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: hasRole } = await adminClient.rpc("has_role", {
        _user_id: claimsData.claims.sub,
        _role: "admin",
      });
      if (!hasRole) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json().catch(() => ({}));
    const draftId: string | undefined = body.draftId;
    if (!draftId) {
      return new Response(
        JSON.stringify({ error: "draftId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: draft, error: fetchError } = await adminClient
      .from("instagram_post_drafts")
      .select("id, card_texts")
      .eq("id", draftId)
      .single();

    if (fetchError || !draft) {
      return new Response(
        JSON.stringify({ error: "Draft not found", details: fetchError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cardTexts: CardText[] = Array.isArray(draft.card_texts) ? draft.card_texts : [];
    if (cardTexts.length === 0) {
      return new Response(
        JSON.stringify({ error: "No card_texts to render. AI 카피 생성을 먼저 진행하세요." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { fonts, family } = await loadFonts();
    const cardUrls: string[] = [];

    for (let i = 0; i < cardTexts.length; i++) {
      const isLast = i === cardTexts.length - 1;
      const type: "cover" | "body" | "cta" = i === 0 ? "cover" : isLast ? "cta" : "body";
      const jsx = buildCardJSX({ type, text: cardTexts[i], fontFamily: family });
      const png = await renderCardToPng(jsx, fonts);

      const path = `drafts/${draftId}/card-${i + 1}.png`;
      const { error: uploadError } = await adminClient.storage
        .from(STORAGE_BUCKET)
        .upload(path, png, { contentType: "image/png", upsert: true });

      if (uploadError) {
        // Storage 버킷 미생성 시 가장 자주 나는 에러 — 운영자에게 명시
        console.error("storage upload failed:", uploadError);
        const msg = uploadError.message?.includes("Bucket not found")
          ? `Supabase Storage 버킷 "${STORAGE_BUCKET}" 가 없습니다. 14번 가이드 B 참고.`
          : uploadError.message;
        return new Response(
          JSON.stringify({ error: "Storage upload failed", details: msg }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: urlData } = adminClient.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      cardUrls.push(urlData.publicUrl);
    }

    const { error: updateError } = await adminClient
      .from("instagram_post_drafts")
      .update({
        card_image_urls: cardUrls,
        card_count: cardUrls.length,
      })
      .eq("id", draftId);

    if (updateError) {
      console.error("draft update failed:", updateError);
      return new Response(
        JSON.stringify({ error: "Draft update failed", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, draftId, cardCount: cardUrls.length, cardUrls }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("instagram-card-renderer error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
