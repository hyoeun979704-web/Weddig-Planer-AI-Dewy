// Dewy 인스타그램 카드뉴스 — Instagram Graph API 발행기
//
// 입력:  { draftId } (수동) 또는 (자동) pg_cron 이 status='scheduled' AND scheduled_for <= now() 픽업 후 호출
// 처리:  draft 의 card_image_urls 로 IG Graph API 캐러셀 발행
//        1. 각 이미지 → media container 생성 (is_carousel_item=true)
//        2. 부모 carousel container 생성 (children=[item ids])
//        3. 부모 container publish
// 출력:  status='published' + published_at + published_permalink + published_media_id UPDATE
//        실패 시 status='failed' + last_error + retry_count++ + Slack 알림
//
// 필수 secrets:
//   IG_PAGE_ACCESS_TOKEN  (무기한 페이지 토큰)
//   IG_BUSINESS_ACCOUNT_ID
//   SLACK_WEBHOOK_URL  (선택 — 실패 알림)
//
// Meta App Review 통과 전엔 테스트 IG 계정으로만 발행됨.

import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const IG_API = "https://graph.facebook.com/v19.0";

interface DraftRow {
  id: string;
  status: string;
  caption: string | null;
  hashtags: string[];
  card_image_urls: string[];
  retry_count: number;
}

async function notifyAdmin(webhookUrl: string | undefined, message: string, level: "info" | "warn" | "error" = "warn") {
  if (!webhookUrl) return;
  const emoji = { info: "ℹ️", warn: "⚠️", error: "🚨" }[level];
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: `${emoji} Dewy 인스타: ${message}` }),
  }).catch((e) => console.error("notify failed:", e));
}

function buildCaption(caption: string | null, hashtags: string[]): string {
  const body = (caption ?? "").trim();
  const tags = hashtags.slice(0, 5).map((t) => `#${t.replace(/^#/, "")}`).join(" ");
  return tags ? `${body}\n\n${tags}` : body;
}

async function createCarouselItem(imageUrl: string, igAccountId: string, token: string): Promise<string> {
  const url = `${IG_API}/${igAccountId}/media`;
  const params = new URLSearchParams({
    image_url: imageUrl,
    is_carousel_item: "true",
    access_token: token,
  });
  const res = await fetch(url, { method: "POST", body: params });
  const data = await res.json();
  if (!res.ok || !data.id) throw new Error(`carousel item create failed: ${JSON.stringify(data).slice(0, 300)}`);
  return data.id;
}

async function createCarouselContainer(itemIds: string[], caption: string, igAccountId: string, token: string): Promise<string> {
  const url = `${IG_API}/${igAccountId}/media`;
  const params = new URLSearchParams({
    media_type: "CAROUSEL",
    children: itemIds.join(","),
    caption,
    access_token: token,
  });
  const res = await fetch(url, { method: "POST", body: params });
  const data = await res.json();
  if (!res.ok || !data.id) throw new Error(`carousel container create failed: ${JSON.stringify(data).slice(0, 300)}`);
  return data.id;
}

async function publishContainer(containerId: string, igAccountId: string, token: string): Promise<string> {
  const url = `${IG_API}/${igAccountId}/media_publish`;
  const params = new URLSearchParams({
    creation_id: containerId,
    access_token: token,
  });
  const res = await fetch(url, { method: "POST", body: params });
  const data = await res.json();
  if (!res.ok || !data.id) throw new Error(`publish failed: ${JSON.stringify(data).slice(0, 300)}`);
  return data.id;
}

async function getPermalink(mediaId: string, token: string): Promise<string | null> {
  const url = `${IG_API}/${mediaId}?fields=permalink&access_token=${token}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.permalink ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const igToken = Deno.env.get("IG_PAGE_ACCESS_TOKEN");
    const igAccountId = Deno.env.get("IG_BUSINESS_ACCOUNT_ID");
    const slackWebhook = Deno.env.get("SLACK_WEBHOOK_URL") ?? undefined;

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return new Response(
        JSON.stringify({ error: "server_misconfigured", message: "Supabase env 누락" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!igToken || !igAccountId) {
      return new Response(
        JSON.stringify({
          error: "instagram_not_configured",
          message: "IG_PAGE_ACCESS_TOKEN / IG_BUSINESS_ACCOUNT_ID 미설정. 14번 가이드 A 참고.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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

    // draftId 미지정 시: status='scheduled' AND scheduled_for <= now() 인 첫 행 픽업 (cron 모드)
    let target: DraftRow;
    if (draftId) {
      const { data, error } = await adminClient
        .from("instagram_post_drafts")
        .select("id, status, caption, hashtags, card_image_urls, retry_count")
        .eq("id", draftId)
        .single();
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: "Draft not found", details: error?.message }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      target = data as DraftRow;
    } else {
      const nowIso = new Date().toISOString();
      const { data, error } = await adminClient
        .from("instagram_post_drafts")
        .select("id, status, caption, hashtags, card_image_urls, retry_count")
        .eq("status", "scheduled")
        .lte("scheduled_for", nowIso)
        .order("scheduled_for", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) {
        return new Response(
          JSON.stringify({ error: "Queue pickup failed", details: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!data) {
        return new Response(
          JSON.stringify({ success: true, message: "No scheduled drafts due." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      target = data as DraftRow;
    }

    // 잠금: status='publishing' 으로 전이 (낙관적 락)
    const { error: lockError } = await adminClient
      .from("instagram_post_drafts")
      .update({ status: "publishing" })
      .eq("id", target.id)
      .in("status", ["scheduled", "approved"]);

    if (lockError) {
      return new Response(
        JSON.stringify({ error: "Lock failed (already publishing?)", details: lockError.message }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 입력 검증
    if (!target.card_image_urls || target.card_image_urls.length === 0) {
      const msg = "card_image_urls 가 비어있음. 2단계 카드 렌더러를 먼저 실행하세요.";
      await adminClient
        .from("instagram_post_drafts")
        .update({ status: "failed", last_error: msg, retry_count: target.retry_count + 1 })
        .eq("id", target.id);
      await notifyAdmin(slackWebhook, `발행 실패 — draft ${target.id}\n${msg}`, "error");
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    try {
      // 1) 각 이미지 → carousel item container
      const itemIds: string[] = [];
      for (const url of target.card_image_urls) {
        const id = await createCarouselItem(url, igAccountId, igToken);
        itemIds.push(id);
      }

      // 2) carousel 부모 container
      const caption = buildCaption(target.caption, target.hashtags ?? []);
      const containerId = await createCarouselContainer(itemIds, caption, igAccountId, igToken);

      // 3) publish
      const mediaId = await publishContainer(containerId, igAccountId, igToken);
      const permalink = await getPermalink(mediaId, igToken);

      // 4) status 업데이트
      await adminClient
        .from("instagram_post_drafts")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          published_media_id: mediaId,
          published_permalink: permalink,
          last_error: null,
        })
        .eq("id", target.id);

      return new Response(
        JSON.stringify({ success: true, draftId: target.id, mediaId, permalink }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (publishError) {
      const errMsg = publishError instanceof Error ? publishError.message : String(publishError);
      console.error("publish failed:", errMsg);

      await adminClient
        .from("instagram_post_drafts")
        .update({
          status: "failed",
          last_error: errMsg.slice(0, 500),
          retry_count: target.retry_count + 1,
        })
        .eq("id", target.id);

      await notifyAdmin(slackWebhook, `발행 실패 — draft ${target.id}\n에러: ${errMsg.slice(0, 200)}`, "error");

      return new Response(
        JSON.stringify({ error: "Publish failed", details: errMsg }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (error) {
    console.error("instagram-publisher error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
