// 사진 체형 보정 — 1회 최대 8장 일괄 (비동기 잡). 화질 개선을 기본으로 깔고
// 요청한 강도로 실루엣을 자연스럽게 슬림/비율 보정한다(얼굴·정체성 불변).
//
// gpt-image-2 images/edits. 흐름: processing 잡 즉시 생성 → job_id 반환(202) →
// EdgeRuntime.waitUntil 로 각 장 백그라운드 보정 → photo_retouch_jobs 갱신.
//
// 가격: 장당 5하트, n장 = min(n*5, 35) (8장 묶음 35 상한).
//   계정당 첫 1회는 50% 할인(반올림). 실패한 장수만큼 비례 환불.
//
// 입력: { source_paths: string[], body_preset?: BodyPreset }
// 출력: { job_id, status:"processing", charged, discounted }

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

type BodyPreset = "none" | "slim_soft" | "slim_strong" | "proportion";

// 공통: 정체성 보존 + 고화질 + 색감 보정 (모든 보정의 기본, 항상 적용).
const BASE_PROMPT =
  "Retouch this wedding photo to a high-quality, professionally finished result. " +
  "Increase resolution and clarity: reduce noise, blur and compression artifacts, " +
  "sharpen fine detail. Apply a natural, flattering wedding color grade: correct " +
  "white balance, clean and even skin tones, gentle brightening, soft pleasing " +
  "contrast — polished but true to life, not oversaturated or stylized. " +
  "CRITICAL: preserve the exact identity of every person — face, facial features, " +
  "expression, and hairstyle must stay the same and recognizable. Keep the same " +
  "framing and background. Photorealistic, no illustration or cartoon look.";

// 체형 프리셋(정성) — 자연스러움·비왜곡 방지·얼굴 불변 명시.
const BODY_PROMPTS: Record<BodyPreset, string> = {
  none: " Do not reshape the body.",
  slim_soft:
    " Subtly and naturally slim the body silhouette (waist, arms, legs) by a small " +
    "amount. Keep proportions realistic and anatomically correct, avoid any " +
    "distortion, and keep the face and identity exactly the same.",
  slim_strong:
    " Noticeably slim the body silhouette (waist, arms, legs) while keeping it " +
    "believable and anatomically natural — no warping of limbs, background, or other " +
    "people. Keep the face and identity exactly the same.",
  proportion:
    " Gently refine body proportions and posture: slightly longer and straighter " +
    "legs, balanced silhouette, upright posture. Keep it natural and realistic, " +
    "avoid distortion, and keep the face and identity exactly the same.",
};

function buildPrompt(preset: BodyPreset): string {
  return BASE_PROMPT + (BODY_PROMPTS[preset] ?? BODY_PROMPTS.slim_soft);
}

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

    const body = (await req.json()) as { source_paths?: string[]; body_preset?: BodyPreset };
    const paths = Array.from(new Set(body.source_paths ?? []));
    const preset: BodyPreset =
      (["none", "slim_soft", "slim_strong", "proportion"] as const).includes(
        body.body_preset as BodyPreset,
      )
        ? (body.body_preset as BodyPreset)
        : "slim_soft";
    const prompt = buildPrompt(preset);
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

    const refund = async (amount: number) => {
      if (amount > 0)
        await admin.rpc("earn_hearts", {
          p_user_id: userId,
          p_amount: amount,
          p_reason: "photo_fix_batch_refund",
        });
    };

    // 진행중 잡 생성 → 즉시 응답. 무거운 보정은 백그라운드.
    const { data: jobRow, error: jobErr } = await admin
      .from("photo_retouch_jobs")
      .insert({
        user_id: userId,
        status: "processing",
        source_paths: paths,
        results: [],
        charged: finalCost,
        discounted,
      })
      .select("id").single();
    if (jobErr || !jobRow) { await refund(finalCost); return json({ error: "job_insert_failed" }, 500); }
    const jobId = jobRow.id as string;

    const finish = async (patch: Record<string, unknown>) => {
      await admin.from("photo_retouch_jobs")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", jobId);
    };

    // ── 백그라운드: 클라가 페이지를 벗어나도 서버에서 계속 진행 ──
    const job = (async () => {
      try {
        const results: { source: string; path: string }[] = [];
        for (const sourcePath of paths) {
          try {
            const { data: srcBlob, error: dlErr } = await admin.storage
              .from("invitation-uploads").download(sourcePath);
            if (dlErr || !srcBlob) continue;
            const form = new FormData();
            form.append("model", "gpt-image-2");
            form.append("prompt", prompt);
            form.append("size", "auto");
            form.append("quality", "medium");
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
            results.push({ source: sourcePath, path: outPath });
          } catch (e) {
            console.error(`enhance fail ${sourcePath}:`, e);
          }
        }

        const ok = results.length;
        const failed = paths.length - ok;
        const refundAmt = failed > 0 ? (ok === 0 ? finalCost : Math.round((failed / paths.length) * finalCost)) : 0;
        await refund(refundAmt);

        if (ok === 0) { await finish({ status: "failed", error: "all_failed", charged: 0 }); return; }

        await finish({ status: "completed", results, charged: finalCost - refundAmt });
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
      } catch (e) {
        console.error("photo job error:", e);
        await refund(finalCost);
        await finish({ status: "failed", error: "server_error", charged: 0 });
      }
    })();

    // @ts-ignore EdgeRuntime 은 런타임 전역
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(job);
    } else {
      await job; // 로컬/폴백
    }

    return json({ job_id: jobId, status: "processing", charged: finalCost, discounted }, 202);
  } catch (e) {
    console.error("photo-enhance-batch fatal:", e);
    return json({ error: "server_error" }, 500);
  }
});
