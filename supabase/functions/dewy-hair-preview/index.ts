// 헤어 변형 미리보기 — 셀카 1장으로 (단일/스타일 9그리드/컬러 9그리드) 선택 생성.
// NANO BANANA 방식: 동일 인물(이목구비·골격·피부톤 고정), 헤어/컬러만 변경.
// 비동기 잡: processing 즉시 생성 → job_id 반환(202) → EdgeRuntime.waitUntil 로
// 선택 옵션을 병렬 생성 → hair_preview_jobs 갱신. 멈춘 잡은 reaper 가 환불.
//
// 입력: { source_path, options: ("single"|"style"|"color")[], single_style?: string }
// 가격: 옵션당 5하트, 계정당 첫 1회 50% 할인. 실패 옵션 비례 환불.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PER = 5;
type Kind = "single" | "style" | "color";
const VALID: Kind[] = ["single", "style", "color"];

const IDENTITY =
  " The face, facial features, skin texture, head shape, expression and identity must " +
  "remain EXACTLY the same as the provided photo. Do not modify facial structure, eyes, " +
  "nose, lips, jawline, age or skin tone. Same camera angle, soft studio lighting and " +
  "framing, neutral natural expression, clean minimal background. Clean beauty portrait, " +
  "natural skin texture, no plastic skin, no over-smoothing, ultra-high realism, sharp " +
  "focus, professional beauty photography. Do not stylize or cartoonize. No text, no logos, no watermarks.";

// 단일 3뷰용 — 카메라 각도 고정 문구는 빼고 얼굴 정체성만 고정.
const FACE_LOCK =
  " Keep the face, facial features (eyes, nose, lips, jawline), head shape, skin tone and " +
  "identity EXACTLY the same as the provided photo in the views where the face is visible. " +
  "Natural skin texture, no plastic skin, ultra-high realism, sharp focus, soft studio " +
  "lighting, clean minimal light-gray background. Do not stylize or cartoonize. No text, no logos, no watermarks.";

const STYLE_GRID =
  "Generate a 3x3 grid (9 cells) of ultra-realistic portrait photos of the SAME person " +
  "with different hairstyles. Only change the hairstyle in each cell, keep perfect facial " +
  "consistency across all nine. Hairstyles: loose natural waves, soft beach curls, sleek " +
  "straight hair, high ponytail, low ponytail, messy bun, high bun, braided hairstyle, " +
  "half-up half-down." + IDENTITY;

const COLOR_GRID =
  "Generate a 3x3 grid (9 cells) of ultra-realistic portrait photos of the SAME person " +
  "with different hair colors. Only change the hair color in each cell, keep perfect facial " +
  "consistency across all nine. Hair colors: natural black, dark brown, chocolate brown, " +
  "light brown, soft caramel, warm honey blonde, ash brown, copper red, platinum blonde." + IDENTITY;

function singlePrompt(style: string) {
  const s = (style || "soft natural waves").slice(0, 160);
  return (
    "Generate ONE image showing the SAME person with the chosen hairstyle from THREE angles, " +
    "side by side left to right: (1) FRONT view, (2) 45-degree SIDE view, (3) BACK view — so " +
    "the hairstyle is shown fully. Restyle ONLY the hair to: " + s + ". The hair must be " +
    "identical and consistent across all three views; label nothing." + FACE_LOCK
  );
}

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function base64ToBlob(b64: string, contentType: string): Blob {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: contentType });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = (await req.json()) as { source_path?: string; options?: string[]; single_style?: string };
    const sourcePath = body.source_path;
    if (!sourcePath || !sourcePath.startsWith(`${userId}/`)) return json({ error: "invalid_source_path" }, 403);
    const options = Array.from(new Set((body.options ?? []).filter((o): o is Kind => VALID.includes(o as Kind))));
    if (options.length === 0) return json({ error: "no_options" }, 400);
    const singleStyle = (body.single_style ?? "").toString();

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) return json({ error: "openai_not_configured" }, 500);

    const { data: usageRow } = await admin
      .from("hair_preview_usage").select("used_count").eq("user_id", userId).maybeSingle();
    const usedCount = usageRow?.used_count ?? 0;
    const discounted = usedCount === 0;
    const baseCost = options.length * PER;
    const finalCost = discounted ? Math.round(baseCost / 2) : baseCost;

    const { data: spendData, error: spendError } = await admin.rpc("spend_hearts", {
      p_user_id: userId, p_amount: finalCost, p_reason: "hair_preview",
    });
    const spendRow = Array.isArray(spendData) ? spendData[0] : spendData;
    if (spendError) return json({ error: "hearts_error" }, 500);
    if (!spendRow?.success) return json({ error: "insufficient_hearts", required: finalCost }, 402);

    const refund = async (amount: number) => {
      if (amount > 0) await admin.rpc("earn_hearts", { p_user_id: userId, p_amount: amount, p_reason: "hair_preview_refund" });
    };

    const { data: jobRow, error: jobErr } = await admin
      .from("hair_preview_jobs")
      .insert({ user_id: userId, status: "processing", source_path: sourcePath, options, single_style: singleStyle, results: [], charged: finalCost, discounted })
      .select("id").single();
    if (jobErr || !jobRow) { await refund(finalCost); return json({ error: "job_insert_failed" }, 500); }
    const jobId = jobRow.id as string;

    const finish = async (patch: Record<string, unknown>) => {
      await admin.from("hair_preview_jobs").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", jobId);
    };

    const job = (async () => {
      try {
        const { data: blob } = await admin.storage.from("invitation-uploads").download(sourcePath);
        if (!blob) { await refund(finalCost); await finish({ status: "failed", error: "source_download_failed", charged: 0 }); return; }

        const promptFor = (k: Kind) => k === "style" ? STYLE_GRID : k === "color" ? COLOR_GRID : singlePrompt(singleStyle);
        const results: { kind: Kind; path: string }[] = [];
        const genOne = async (kind: Kind) => {
          try {
            const form = new FormData();
            form.append("model", "gpt-image-2");
            form.append("prompt", promptFor(kind));
            form.append("size", kind === "single" ? "1536x1024" : "1024x1536");
            form.append("quality", "medium");
            form.append("n", "1");
            form.append("image[]", blob, "bride.png");
            const res = await fetch("https://api.openai.com/v1/images/edits", {
              method: "POST", headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }, body: form,
            });
            if (!res.ok) { console.error(`hair ${kind} openai`, res.status, (await res.text()).slice(0, 160)); return; }
            const d = (await res.json()) as { data: { b64_json?: string; url?: string }[] };
            const item = d.data?.[0];
            if (!item) return;
            const outBlob = item.b64_json ? base64ToBlob(item.b64_json, "image/png") : await (await fetch(item.url!)).blob();
            const outPath = `${userId}/hair/${kind}-${crypto.randomUUID()}.png`;
            const { error: upErr } = await admin.storage.from("invitation-uploads").upload(outPath, outBlob, { contentType: "image/png", upsert: false });
            if (upErr) return;
            results.push({ kind, path: outPath });
          } catch (e) { console.error(`hair ${kind} fail`, e); }
        };
        // 옵션 병렬(각 1장) → wall-clock ≈ 가장 느린 옵션
        await Promise.all(options.map((o) => genOne(o as Kind)));

        const ok = results.length;
        const failed = options.length - ok;
        const refundAmt = failed > 0 ? (ok === 0 ? finalCost : Math.round((failed / options.length) * finalCost)) : 0;
        await refund(refundAmt);
        if (ok === 0) { await finish({ status: "failed", error: "all_failed", charged: 0 }); return; }
        await finish({ status: "completed", results, charged: finalCost - refundAmt });
        await admin.from("hair_preview_usage").upsert(
          { user_id: userId, used_count: usedCount + 1, updated_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
      } catch (e) {
        console.error("hair job error:", e);
        await refund(finalCost);
        await finish({ status: "failed", error: "server_error", charged: 0 });
      }
    })();

    // @ts-ignore
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) { /* @ts-ignore */ EdgeRuntime.waitUntil(job); } else { await job; }

    return json({ job_id: jobId, status: "processing", charged: finalCost, discounted }, 202);
  } catch (e) {
    console.error("dewy-hair-preview fatal:", e);
    return json({ error: "server_error" }, 500);
  }
});
