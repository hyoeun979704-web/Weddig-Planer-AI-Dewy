// Dewy 블로그 — 워드프레스 REST 자동 발행기
//
// 입력:  { draftId, wpStatus?: "draft" | "publish" }  (wpStatus 기본 "draft")
// 처리:  blog_post_drafts 의 content_markdown 을 HTML 로 변환해 WP REST 로 글 생성/갱신
//        1. (있으면) 대표 이미지 → POST /wp/v2/media 업로드 → featured_media
//        2. 카테고리/태그 이름 → term id 해석(없으면 생성, best-effort)
//        3. Markdown → HTML(marked, GFM)
//        4. POST /wp/v2/posts (wp_post_id 있으면 /posts/{id} 로 갱신)
//        5. canonical 은 Yoast(_yoast_wpseo_canonical)·RankMath(rank_math_canonical_url) meta 로 전달
// 출력:  wp_post_id·wp_url·wp_status·wp_featured_media_id·wp_published_at + status 갱신
//        실패 시 status='failed' + last_error + retry_count++ + (선택)Slack 알림
//
// 필수 secrets:
//   WP_BASE_URL       (예: https://blog.dewy-wedding.com — 끝 슬래시 무관)
//   WP_USER           (발행 계정 로그인 아이디)
//   WP_APP_PASSWORD   (WP 관리자 > 사용자 > 프로필 > 애플리케이션 비밀번호, 공백 포함 그대로)
//   SLACK_WEBHOOK_URL (선택 — 실패 알림)
//
// 권한: instagram-publisher 와 동일 — service role(cron) 또는 admin JWT 만.

import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { marked } from "https://esm.sh/marked@12";

interface DraftRow {
  id: string;
  status: string;
  title: string;
  slug: string | null;
  content_markdown: string | null;
  excerpt: string | null;
  canonical_url: string | null;
  featured_image_url: string | null;
  categories: string[];
  tags: string[];
  wp_post_id: number | null;
  wp_featured_media_id: number | null;
  retry_count: number;
}

type WpStatus = "draft" | "publish";

async function notifyAdmin(webhookUrl: string | undefined, message: string, level: "info" | "warn" | "error" = "warn") {
  if (!webhookUrl) return;
  const emoji = { info: "ℹ️", warn: "⚠️", error: "🚨" }[level];
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: `${emoji} Dewy 워드프레스: ${message}` }),
  }).catch((e) => console.error("notify failed:", e));
}

function basicAuthHeader(user: string, appPassword: string): string {
  // WP 애플리케이션 비밀번호는 공백을 포함할 수 있으나 그대로 btoa 가능(ASCII).
  return "Basic " + btoa(`${user}:${appPassword}`);
}

/** Markdown → HTML(GFM). marked 가 비동기 확장 시 Promise 를 반환할 수 있어 await 로 통일. */
async function markdownToHtml(md: string): Promise<string> {
  const out = await Promise.resolve(marked.parse(md, { gfm: true, breaks: false }));
  return typeof out === "string" ? out : String(out);
}

/** 대표 이미지 원본 URL → WP media 업로드 → media id. 실패 시 throw. */
async function uploadFeaturedMedia(apiBase: string, authHeader: string, imageUrl: string): Promise<number> {
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`대표이미지 다운로드 실패(${imgRes.status})`);
  const contentType = imgRes.headers.get("content-type") || "image/jpeg";
  const bytes = new Uint8Array(await imgRes.arrayBuffer());
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const filename = `dewy-featured-${Date.now()}.${ext}`;

  const res = await fetch(`${apiBase}/media`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
    body: bytes,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.id) throw new Error(`media 업로드 실패: ${JSON.stringify(data).slice(0, 300)}`);
  return data.id as number;
}

/** 카테고리/태그 이름 → term id(없으면 생성). best-effort — 실패하면 null(글은 그 term 없이 발행). */
async function resolveTermId(
  apiBase: string,
  authHeader: string,
  taxonomy: "categories" | "tags",
  name: string,
): Promise<number | null> {
  try {
    const searchRes = await fetch(
      `${apiBase}/${taxonomy}?search=${encodeURIComponent(name)}&per_page=100`,
      { headers: { Authorization: authHeader } },
    );
    if (searchRes.ok) {
      const list = await searchRes.json().catch(() => []);
      if (Array.isArray(list)) {
        const found = list.find(
          (t: { id?: number; name?: string }) => (t.name ?? "").toLowerCase() === name.toLowerCase(),
        );
        if (found?.id) return found.id;
      }
    }
    const createRes = await fetch(`${apiBase}/${taxonomy}`, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const created = await createRes.json().catch(() => ({}));
    if (createRes.ok && created.id) return created.id;
    // 이미 존재(term_exists) 시 에러 본문에 term_id 가 담겨 옴
    if (created?.data?.term_id) return created.data.term_id;
    console.warn(`term 해석 실패(${taxonomy}/${name}):`, JSON.stringify(created).slice(0, 200));
    return null;
  } catch (e) {
    console.warn(`term 해석 예외(${taxonomy}/${name}):`, e instanceof Error ? e.message : e);
    return null;
  }
}

async function resolveTermIds(
  apiBase: string,
  authHeader: string,
  taxonomy: "categories" | "tags",
  names: string[],
): Promise<number[]> {
  const ids: number[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const id = await resolveTermId(apiBase, authHeader, taxonomy, name);
    if (id) ids.push(id);
  }
  return ids;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const wpBaseRaw = Deno.env.get("WP_BASE_URL");
    const wpUser = Deno.env.get("WP_USER");
    const wpAppPassword = Deno.env.get("WP_APP_PASSWORD");
    const slackWebhook = Deno.env.get("SLACK_WEBHOOK_URL") ?? undefined;

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return new Response(
        JSON.stringify({ error: "server_misconfigured", message: "Supabase env 누락" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!wpBaseRaw || !wpUser || !wpAppPassword) {
      return new Response(
        JSON.stringify({
          error: "wordpress_not_configured",
          message: "WP_BASE_URL / WP_USER / WP_APP_PASSWORD 시크릿 미설정. 워드프레스 발행 비활성 상태입니다.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const wpBase = wpBaseRaw.replace(/\/+$/, "");
    const apiBase = `${wpBase}/wp-json/wp/v2`;
    const wpAuth = basicAuthHeader(wpUser, wpAppPassword);

    // ── 인증: service role(cron) 또는 admin JWT ──
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
    const wpStatus: WpStatus = body.wpStatus === "publish" ? "publish" : "draft";

    if (!draftId) {
      return new Response(
        JSON.stringify({ error: "draftId 가 필요합니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: draftData, error: fetchError } = await adminClient
      .from("blog_post_drafts")
      .select(
        "id, status, title, slug, content_markdown, excerpt, canonical_url, featured_image_url, categories, tags, wp_post_id, wp_featured_media_id, retry_count",
      )
      .eq("id", draftId)
      .single();

    if (fetchError || !draftData) {
      return new Response(
        JSON.stringify({ error: "원고를 찾을 수 없습니다.", details: fetchError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const target = draftData as DraftRow;

    // 입력 검증
    if (!target.content_markdown || !target.content_markdown.trim()) {
      return new Response(
        JSON.stringify({ error: "본문(content_markdown)이 비어있습니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 잠금: status='publishing' 으로 전이(낙관적 락 — 이미 publishing 이면 차단)
    const { data: lockRows, error: lockError } = await adminClient
      .from("blog_post_drafts")
      .update({ status: "publishing", last_error: null })
      .eq("id", target.id)
      .neq("status", "publishing")
      .select("id");

    if (lockError) {
      return new Response(
        JSON.stringify({ error: "락 실패", details: lockError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!lockRows || lockRows.length === 0) {
      return new Response(
        JSON.stringify({ error: "이미 발행 처리 중입니다." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    try {
      // 1) 대표 이미지(있고 아직 업로드 안 했으면)
      let featuredMediaId = target.wp_featured_media_id ?? null;
      if (target.featured_image_url && !featuredMediaId) {
        featuredMediaId = await uploadFeaturedMedia(apiBase, wpAuth, target.featured_image_url);
      }

      // 2) 카테고리/태그 term id 해석(best-effort)
      const categoryIds = await resolveTermIds(apiBase, wpAuth, "categories", target.categories ?? []);
      const tagIds = await resolveTermIds(apiBase, wpAuth, "tags", target.tags ?? []);

      // 3) Markdown → HTML
      const html = await markdownToHtml(target.content_markdown);

      // canonical meta(Yoast / RankMath 둘 다 — 설치된 SEO 플러그인이 채택)
      const meta: Record<string, string> = {};
      if (target.canonical_url) {
        meta._yoast_wpseo_canonical = target.canonical_url;
        meta.rank_math_canonical_url = target.canonical_url;
      }

      // 4) 포스트 페이로드
      const payload: Record<string, unknown> = {
        title: target.title,
        content: html,
        status: wpStatus,
      };
      if (target.slug) payload.slug = target.slug;
      if (target.excerpt) payload.excerpt = target.excerpt;
      if (categoryIds.length) payload.categories = categoryIds;
      if (tagIds.length) payload.tags = tagIds;
      if (featuredMediaId) payload.featured_media = featuredMediaId;
      if (Object.keys(meta).length) payload.meta = meta;

      // create(POST /posts) 또는 update(POST /posts/{id})
      const endpoint = target.wp_post_id
        ? `${apiBase}/posts/${target.wp_post_id}`
        : `${apiBase}/posts`;
      const postRes = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: wpAuth, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const post = await postRes.json().catch(() => ({}));
      if (!postRes.ok || !post.id) {
        throw new Error(`WP 글 발행 실패(${postRes.status}): ${JSON.stringify(post).slice(0, 400)}`);
      }

      const resolvedWpStatus: string = post.status === "publish" ? "publish" : "draft";
      const nowIso = new Date().toISOString();

      await adminClient
        .from("blog_post_drafts")
        .update({
          status: resolvedWpStatus === "publish" ? "published" : "review",
          wp_post_id: post.id,
          wp_url: post.link ?? null,
          wp_status: resolvedWpStatus,
          wp_featured_media_id: featuredMediaId,
          wp_published_at: resolvedWpStatus === "publish" ? nowIso : null,
          last_error: null,
        })
        .eq("id", target.id);

      return new Response(
        JSON.stringify({
          success: true,
          draftId: target.id,
          wpPostId: post.id,
          wpUrl: post.link ?? null,
          wpStatus: resolvedWpStatus,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (publishError) {
      const errMsg = publishError instanceof Error ? publishError.message : String(publishError);
      console.error("wordpress publish failed:", errMsg);

      await adminClient
        .from("blog_post_drafts")
        .update({
          status: "failed",
          last_error: errMsg.slice(0, 500),
          retry_count: target.retry_count + 1,
        })
        .eq("id", target.id);

      await notifyAdmin(slackWebhook, `발행 실패 — 원고 ${target.id}\n에러: ${errMsg.slice(0, 200)}`, "error");

      return new Response(
        JSON.stringify({ error: "발행 실패", details: errMsg }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (error) {
    console.error("wordpress-publisher error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
