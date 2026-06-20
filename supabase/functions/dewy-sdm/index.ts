// 스드메 미리보기 — 장소+메이크업+헤어+드레스 합본 AI 합성 Edge Function.
//
// dewy-fitting 과 동일 골격(인증→하트 차감→row 생성→gpt-image→업로드→상태갱신→
// 실패 시 환불). 차이: 10하트, sdm_previews 테이블, reference_mode 에 따라 드레스
// 레퍼런스 이미지 첨부 여부 결정(메이크업/헤어는 현재 텍스트, 샘플 채워지면 확장).

import { adminClient } from "../_shared/supabase.ts";
import { MODELS } from "../_shared/llm.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HEART_COST = 10;

interface RequestBody {
  source_image_path: string;   // sdm-uploads/{userId}/xxx
  scene_code: string;
  hair_style: string;
  makeup_summary?: string;     // 추적용(ko 요약)
  dress_sample_id?: string;    // 있으면 카탈로그
  reference_mode: "image" | "text";
  prompt: string;
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

    const supabaseAdmin = adminClient();

    const body = (await req.json()) as RequestBody;
    if (!body.source_image_path || !body.scene_code || !body.hair_style || !body.prompt) {
      return json({ error: "Missing required fields" }, 400);
    }
    // 본인 폴더 검증(RLS 보강)
    if (!body.source_image_path.startsWith(`${userId}/`)) {
      return json({ error: "invalid_source_image" }, 403);
    }

    // 카탈로그 드레스 + image 모드일 때만 드레스 레퍼런스 이미지 첨부.
    const attachDressImage = !!body.dress_sample_id && body.reference_mode === "image";
    let dress: { id: string; image_url: string } | null = null;
    if (body.dress_sample_id) {
      const { data: d, error: dErr } = await supabaseAdmin
        .from("dress_samples")
        .select("id, image_url, is_active")
        .eq("id", body.dress_sample_id)
        .single();
      if (dErr || !d || !d.is_active) return json({ error: "dress_not_found" }, 404);
      dress = { id: d.id as string, image_url: d.image_url as string };
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) return json({ error: "openai_not_configured" }, 500);

    // 하트 차감
    const { data: spendData, error: spendError } = await supabaseAdmin.rpc("spend_hearts", {
      p_user_id: userId,
      p_amount: HEART_COST,
      p_reason: "sdm_preview",
      p_ref_id: null,
    });
    if (spendError) {
      console.error("spend_hearts error:", spendError);
      return json({ error: "hearts_error" }, 500);
    }
    const spendRow = Array.isArray(spendData) ? spendData[0] : spendData;
    if (!spendRow?.success) {
      return json({ error: "insufficient_hearts", message: spendRow?.message }, 402);
    }

    // row 생성
    const { data: row, error: insertError } = await supabaseAdmin
      .from("sdm_previews")
      .insert({
        user_id: userId,
        source_image_path: body.source_image_path,
        selected_dress_id: body.dress_sample_id ?? null,
        prompt_params: {
          scene_code: body.scene_code,
          hair_style: body.hair_style,
          makeup_summary: body.makeup_summary ?? null,
          reference_mode: body.reference_mode,
        },
        hearts_spent: HEART_COST,
        status: "pending",
      })
      .select("id")
      .single();
    if (insertError || !row) {
      await refundHearts(supabaseAdmin, userId, HEART_COST, "row_insert_fail");
      return json({ error: "insert_fail" }, 500);
    }
    const previewId = row.id as string;

    const jobRun = (async () => {
      try {
        const [userImgBlob, dressImgBlob] = await Promise.all([
          downloadFromStorage(supabaseAdmin, "sdm-uploads", body.source_image_path),
          attachDressImage && dress ? downloadFromUrl(dress.image_url) : Promise.resolve(null),
        ]);

        const form = new FormData();
        form.append("model", MODELS.image);
        form.append("prompt", body.prompt);
        form.append("size", "1024x1536");
        form.append("quality", "medium"); // high 는 지연 과다(실사용 피드백) → medium 유지.
        form.append("n", "1");
        form.append("image[]", userImgBlob, "user.png");
        if (dressImgBlob) form.append("image[]", dressImgBlob, "dress.png");

        const openaiRes = await fetch("https://api.openai.com/v1/images/edits", {
          method: "POST",
          headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
          body: form,
        });
        if (!openaiRes.ok) {
          const errText = await openaiRes.text();
          console.error(`OpenAI error ${openaiRes.status}:`, errText);
          await markFailed(supabaseAdmin, previewId, `openai_${openaiRes.status}`);
          await refundHearts(supabaseAdmin, userId, HEART_COST, "openai_fail", previewId);
          return;
        }
        const openaiData = (await openaiRes.json()) as { data: { b64_json?: string; url?: string }[] };
        const item = openaiData.data?.[0];
        if (!item) {
          await markFailed(supabaseAdmin, previewId, "no_image_returned");
          await refundHearts(supabaseAdmin, userId, HEART_COST, "openai_no_result", previewId);
          return;
        }
        const resultBlob = item.b64_json
          ? base64ToBlob(item.b64_json, "image/png")
          : await (await fetch(item.url!)).blob();

        const resultPath = `${userId}/${previewId}.png`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from("sdm-results")
          .upload(resultPath, resultBlob, { contentType: "image/png", upsert: true });
        if (uploadError) {
          console.error("upload error:", uploadError);
          await markFailed(supabaseAdmin, previewId, "upload_fail");
          await refundHearts(supabaseAdmin, userId, HEART_COST, "upload_fail", previewId);
          return;
        }
        await supabaseAdmin
          .from("sdm_previews")
          .update({ status: "done", result_image_path: resultPath, updated_at: new Date().toISOString() })
          .eq("id", previewId);
      } catch (innerError) {
        console.error("inner error:", innerError);
        await markFailed(supabaseAdmin, previewId, innerError instanceof Error ? innerError.message : "inner_error");
        await refundHearts(supabaseAdmin, userId, HEART_COST, "inner_error", previewId);
      }
    })();

    // @ts-ignore EdgeRuntime 전역
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(jobRun);
    } else {
      await jobRun;
    }

    return json({ preview_id: previewId, status: "pending", balance_after: spendRow.balance_after }, 202);
  } catch (error) {
    console.error("dewy-sdm fatal:", error);
    return json({ error: "server_error" }, 500);
  }
});

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function downloadFromStorage(
  client: ReturnType<typeof createClient>,
  bucket: string,
  path: string,
): Promise<Blob> {
  const { data, error } = await client.storage.from(bucket).download(path);
  if (error || !data) throw new Error(`storage download fail: ${path}`);
  return data;
}

async function downloadFromUrl(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`url download fail: ${url}`);
  return await res.blob();
}

function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function markFailed(
  client: ReturnType<typeof createClient>,
  previewId: string,
  reason: string,
) {
  await client
    .from("sdm_previews")
    .update({ status: "failed", error_message: reason.substring(0, 500), updated_at: new Date().toISOString() })
    .eq("id", previewId);
}

async function refundHearts(
  client: ReturnType<typeof createClient>,
  userId: string,
  amount: number,
  reason: string,
  previewId?: string,
) {
  try {
    await client.rpc("earn_hearts", {
      p_user_id: userId,
      p_amount: amount,
      p_reason: "refund_failed_generation",
      p_ref_id: previewId ?? null,
    });
    if (previewId) {
      await client
        .from("sdm_previews")
        .update({ status: "refunded", error_message: reason.substring(0, 500) })
        .eq("id", previewId);
    }
  } catch (e) {
    console.error("refund failed:", e);
  }
}
