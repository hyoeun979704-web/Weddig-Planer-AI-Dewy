// 초간단 사진보정(화질) — 1회 최대 8장 일괄 화질 개선.
//
// 정체성 유지 + 해상도/선명도 개선(몸매보정 없음). gpt-image-2 images/edits.
//
// 가격: 장당 5하트, n장 = min(n*5, 35) (8장 묶음 35 상한).
//   계정당 첫 1회는 50% 할인(반올림). 실패한 장수만큼 비례 환불.
//
// 입력: { source_paths: string[] }  (본인 폴더, 1~8장)
// 출력: { results: {source,path,url}[], charged, discounted }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PER = 5;
const CAP = 35;
const MAX_PHOTOS = 8;

const ENHANCE_PROMPT =
  "Enhance this wedding photo to higher resolution and clarity. " +
  "CRITICAL: preserve the exact identity of every person — their face, facial " +
  "features, expression, hairstyle, skin tone, and clothing must stay the same and " +
  "recognizable. Keep the same pose, framing, and background. Reduce noise, blur, " +
  "and compression artifacts; sharpen fine detail; keep colors natural and true to " +
  "the original. Photorealistic result, no illustration or stylization, no body or " +
  "face reshaping.";

function baseCost(n: number): number {
  return Math.min(n * PER, CAP);
}

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function base64ToBlob(b64: string, contentType: string): Blob {
  const byteChars = atob(b64);
  const arr = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) arr[i] = byteChars.charCodeAt(i);
  return new Blob([arr], { type: contentType });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = (await req.json()) as { source_paths?: string[] };
    const paths = Array.from(new Set(body.source_paths ?? []));
    if (paths.length === 0) return json({ error: "Missing source_paths" }, 400);
    if (paths.length > MAX_PHOTOS) return json({ error: "too_many_photos" }, 400);
    for (const p of paths) {
      if (!p.startsWith(`${userId}/`)) return json({ error: "invalid_source_path" }, 403);
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) return json({ error: "openai_not_configured" }, 500);

    // 첫 1회 50% 할인 판정(계정당)
    const { data: usageRow } = await admin
      .from("photo_retouch_usage")
      .select("used_count")
      .eq("user_id", userId)
      .maybeSingle();
    const usedCount = usageRow?.used_count ?? 0;
    const discounted = usedCount === 0;
    const base = baseCost(paths.length);
    const finalCost = discounted ? Math.round(base / 2) : base;

    // 과금
    const { data: spendData, error: spendError } = await admin.rpc("spend_hearts", {
      p_user_id: userId,
      p_amount: finalCost,
      p_reason: "photo_fix_batch",
    });
    const spendRow = Array.isArray(spendData) ? spendData[0] : spendData;
    if (spendError) return json({ error: "hearts_error" }, 500);
    if (!spendRow?.success) {
      return json({ error: "insufficient_hearts", message: spendRow?.message, required: finalCost }, 402);
    }

    // 각 장 처리
    const results: { source: string; path: string; url: string | null }[] = [];
    for (const sourcePath of paths) {
      try {
        const { data: srcBlob, error: dlErr } = await admin.storage
          .from("invitation-uploads").download(sourcePath);
        if (dlErr || !srcBlob) continue;
        const form = new FormData();
        form.append("model", "gpt-image-2");
        form.append("prompt", ENHANCE_PROMPT);
        form.append("size", "auto");
        form.append("quality", "high");
        form.append("n", "1");
        form.append("image[]", srcBlob, "source.png");
        const res = await fetch("https://api.openai.com/v1/images/edits", {
          method: "POST",
          headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
          body: form,
        });
        if (!res.ok) {
          console.error(`OpenAI ${res.status}:`, (await res.text()).slice(0, 200));
          continue;
        }
        const data = (await res.json()) as { data: { b64_json?: string; url?: string }[] };
        const item = data.data?.[0];
        if (!item) continue;
        const outBlob = item.b64_json
          ? base64ToBlob(item.b64_json, "image/png")
          : await (await fetch(item.url!)).blob();
        const fname = sourcePath.split("/").pop() ?? "photo.png";
        const outPath = `${userId}/enhanced/${crypto.randomUUID()}-${fname.replace(/\.[^.]+$/, "")}.png`;
        const { error: upErr } = await admin.storage
          .from("invitation-uploads")
          .upload(outPath, outBlob, { contentType: "image/png", upsert: false });
        if (upErr) continue;
        const { data: signed } = await admin.storage
          .from("invitation-uploads").createSignedUrl(outPath, 60 * 60 * 24 * 7);
        results.push({ source: sourcePath, path: outPath, url: signed?.signedUrl ?? null });
      } catch (e) {
        console.error(`enhance fail ${sourcePath}:`, e);
      }
    }

    const ok = results.length;
    const failed = paths.length - ok;
    const refund = failed > 0 ? (ok === 0 ? finalCost : Math.round((failed / paths.length) * finalCost)) : 0;
    if (refund > 0) {
      await admin.rpc("earn_hearts", {
        p_user_id: userId,
        p_amount: refund,
        p_reason: "photo_fix_batch_refund",
      });
    }
    if (ok === 0) return json({ error: "all_failed" }, 502);

    // 사용 기록 증가(첫 할인 소진)
    await admin.from("photo_retouch_usage").upsert(
      {
        user_id: userId,
        used_count: usedCount + ok,
        first_free_used: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    return json({ results, charged: finalCost - refund, discounted }, 200);
  } catch (e) {
    console.error("photo-enhance-batch fatal:", e);
    return json({ error: "server_error" }, 500);
  }
});
