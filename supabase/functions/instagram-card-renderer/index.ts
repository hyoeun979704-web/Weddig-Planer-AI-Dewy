// Dewy 인스타그램 카드뉴스 — Satori 기반 PNG 렌더러
//
// 입력:  { draftId }
// 처리:  instagram_post_drafts.card_texts 를 읽어 Satori 로 HTML/CSS → SVG → PNG.
//        1080×1350 (4:5) N장 생성 → Supabase Storage(instagram-cards) 업로드.
// 출력:  card_image_urls 에 public URL 배열 UPDATE.
//
// 의존:  Supabase Storage 버킷 "instagram-cards" (public). 미생성 시 명시적 에러.
// 디자인: content/instagram/10_안전영역_디자인토큰.md 그대로 (안전여백·spacing·typography).
//
// 폰트:  Pretendard (한글), Cormorant (세리프 워드마크).
//        Edge Function 콜드 스타트 시 jsdelivr/Google Fonts 에서 한 번 fetch.
//        매 호출마다 fetch 는 비효율 — Deno 모듈 캐시에 의존.

import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import satori from "https://esm.sh/satori@0.10.13";
import { Resvg } from "https://esm.sh/@resvg/resvg-wasm@2.6.2";
import initResvg from "https://esm.sh/@resvg/resvg-wasm@2.6.2";


const STORAGE_BUCKET = "instagram-cards";
const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;

// 10_안전영역_디자인토큰.md 색상
const COLOR_BG_CREAM = "#FFF9F6";
const COLOR_BG_SOFT_PINK = "#FDF1F3";
const COLOR_TEXT_DEEP = "#3E3438";
const COLOR_TEXT_MUTED = "#8C8085";
const COLOR_POINT_PINK = "#F4A7B9";
const COLOR_ACCENT_GOLD = "#C9A86A";

interface CardText {
  title?: string;
  body?: string;
  footer?: string;
}

// 폰트 캐시 (Edge Function 인스턴스 lifecycle 동안 재사용)
let pretendardBoldCache: ArrayBuffer | null = null;
let pretendardRegularCache: ArrayBuffer | null = null;
let cormorantCache: ArrayBuffer | null = null;
let resvgInitialized = false;

async function fetchFont(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch failed: ${url} ${res.status}`);
  return await res.arrayBuffer();
}

async function loadFonts() {
  if (!pretendardBoldCache) {
    pretendardBoldCache = await fetchFont(
      "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/web/static/woff2/Pretendard-Bold.woff2",
    );
  }
  if (!pretendardRegularCache) {
    pretendardRegularCache = await fetchFont(
      "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/web/static/woff2/Pretendard-Regular.woff2",
    );
  }
  if (!cormorantCache) {
    cormorantCache = await fetchFont(
      "https://fonts.gstatic.com/s/cormorant/v22/H4cgBXSKkCjxRTbPa6kK.woff2",
    );
  }
  return {
    bold: pretendardBoldCache,
    regular: pretendardRegularCache,
    serif: cormorantCache,
  };
}

// ============================================================================
// 카드 JSX (Satori 가 React 호환 JSX 트리를 SVG 로 변환)
// 표지 / 본문 / CTA 세 가지 변형
// ============================================================================

interface CardJSXProps {
  type: "cover" | "body" | "cta";
  index: number;
  total: number;
  text: CardText;
}

function buildCardJSX({ type, index, total, text }: CardJSXProps): unknown {
  const isCover = type === "cover";
  const bg = isCover ? COLOR_BG_SOFT_PINK : COLOR_BG_CREAM;

  return {
    type: "div",
    props: {
      style: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        display: "flex",
        flexDirection: "column",
        backgroundColor: bg,
        padding: "120px 100px",
        position: "relative",
        fontFamily: "Pretendard",
      },
      children: [
        // 본문 영역
        {
          type: "div",
          props: {
            style: {
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: isCover ? "center" : "flex-start",
              gap: 24,
            },
            children: [
              text.title && {
                type: "div",
                props: {
                  style: {
                    fontSize: isCover ? 84 : 56,
                    fontWeight: 700,
                    color: COLOR_TEXT_DEEP,
                    lineHeight: 1.2,
                  },
                  children: text.title,
                },
              },
              text.body && {
                type: "div",
                props: {
                  style: {
                    fontSize: isCover ? 32 : 28,
                    fontWeight: 400,
                    color: isCover ? COLOR_TEXT_MUTED : COLOR_TEXT_DEEP,
                    lineHeight: 1.6,
                  },
                  children: text.body,
                },
              },
              text.footer && {
                type: "div",
                props: {
                  style: {
                    marginTop: 24,
                    fontSize: 22,
                    color: COLOR_TEXT_MUTED,
                  },
                  children: text.footer,
                },
              },
            ].filter(Boolean),
          },
        },
        // 푸터: 좌 워드마크 + 우 페이지번호
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 40,
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    fontFamily: "Cormorant",
                    fontSize: 24,
                    fontWeight: 500,
                    color: COLOR_TEXT_DEEP,
                  },
                  children: "Dewy",
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: 22,
                    fontWeight: 500,
                    color: COLOR_TEXT_MUTED,
                  },
                  children: `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`,
                },
              },
            ],
          },
        },
      ],
    },
  };
}

async function renderCardToPng(jsx: unknown, fonts: { bold: ArrayBuffer; regular: ArrayBuffer; serif: ArrayBuffer }): Promise<Uint8Array> {
  const svg = await satori(jsx as never, {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    fonts: [
      { name: "Pretendard", data: fonts.bold, weight: 700, style: "normal" },
      { name: "Pretendard", data: fonts.regular, weight: 400, style: "normal" },
      { name: "Cormorant", data: fonts.serif, weight: 500, style: "normal" },
    ],
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

    const fonts = await loadFonts();
    const cardUrls: string[] = [];

    for (let i = 0; i < cardTexts.length; i++) {
      const isLast = i === cardTexts.length - 1;
      const type: "cover" | "body" | "cta" = i === 0 ? "cover" : isLast ? "cta" : "body";
      const jsx = buildCardJSX({ type, index: i, total: cardTexts.length, text: cardTexts[i] });
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
