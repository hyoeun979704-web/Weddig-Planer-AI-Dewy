// AI 드레스 추천 — gpt-image-2 한 번으로 끝.
//
// 흐름:
//   1. 인증
//   2. 입력 검증 (source_image_path, body_shape, body_shape_guide,
//      scene_code, prompt)
//   3. spend_hearts(5, "dress_recommend")
//   4. dress_fittings row insert (status=pending, selected_sample_id=null,
//      prompt_params.mode="recommend", body_shape 저장)
//   5. OpenAI gpt-image-2 호출 — 사용자 사진 1장 + 추천 모드 프롬프트
//      (체형 가이드 + 씬이 프롬프트 안에 직접 포함됨)
//   6. dress-results 업로드 + status=done
//   7. 실패 시 환불
//
// 카탈로그 시뮬(dewy-fitting)과 다른 점:
//   · 참조 드레스 이미지가 없음 (사용자 사진 1장만)
//   · 모델이 프롬프트만 보고 적절한 드레스를 직접 생성

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const HEART_COST = 5;

interface RequestBody {
  source_image_path: string;
  body_shape: string;
  scene_code: string;
  prompt: string;            // FE 가 buildRecommendDressPrompt 로 빌드해서 전달
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = (await req.json()) as RequestBody;
    if (
      !body.source_image_path ||
      !body.body_shape ||
      !body.scene_code ||
      !body.prompt
    ) {
      return json({ error: "Missing required fields" }, 400);
    }

    if (!body.source_image_path.startsWith(`${userId}/`)) {
      return json({ error: "invalid_source_image" }, 403);
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) return json({ error: "openai_not_configured" }, 500);

    const { data: spendData, error: spendError } = await supabaseAdmin.rpc(
      "spend_hearts",
      {
        p_user_id: userId,
        p_amount: HEART_COST,
        p_reason: "dress_recommend",
        p_ref_id: null,
      },
    );
    if (spendError) {
      console.error("spend_hearts error:", spendError);
      return json({ error: "hearts_error" }, 500);
    }
    const spendRow = Array.isArray(spendData) ? spendData[0] : spendData;
    if (!spendRow?.success) {
      return json(
        { error: "insufficient_hearts", message: spendRow?.message },
        402,
      );
    }

    const { data: fitting, error: insertError } = await supabaseAdmin
      .from("dress_fittings")
      .insert({
        user_id: userId,
        source_image_path: body.source_image_path,
        selected_sample_id: null,
        prompt_params: {
          mode: "recommend",
          scene_code: body.scene_code,
          body_shape: body.body_shape,
        },
        hearts_spent: HEART_COST,
        status: "pending",
      })
      .select("id")
      .single();
    if (insertError || !fitting) {
      await refundHearts(supabaseAdmin, userId, HEART_COST, "row_insert_fail");
      return json({ error: "insert_fail" }, 500);
    }
    const fittingId = fitting.id as string;

    try {
      const userImgBlob = await downloadFromStorage(
        supabaseAdmin,
        "dress-uploads",
        body.source_image_path,
      );

      const form = new FormData();
      form.append("model", "gpt-image-2");
      form.append("prompt", body.prompt);
      form.append("size", "1024x1536");
      form.append("quality", "medium");
      form.append("n", "1");
      form.append("image[]", userImgBlob, "user.png");

      const openaiRes = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: form,
      });

      if (!openaiRes.ok) {
        const errText = await openaiRes.text();
        console.error(`OpenAI error ${openaiRes.status}:`, errText);
        await markFailed(supabaseAdmin, fittingId, `openai_${openaiRes.status}`);
        await refundHearts(supabaseAdmin, userId, HEART_COST, "openai_fail", fittingId);
        return json(
          { error: "generation_failed", detail: errText.substring(0, 200) },
          502,
        );
      }

      const openaiData = (await openaiRes.json()) as {
        data: { b64_json?: string; url?: string }[];
      };
      const item = openaiData.data?.[0];
      if (!item) {
        await markFailed(supabaseAdmin, fittingId, "no_image_returned");
        await refundHearts(supabaseAdmin, userId, HEART_COST, "openai_no_result", fittingId);
        return json({ error: "no_image_returned" }, 502);
      }

      const resultBlob = item.b64_json
        ? base64ToBlob(item.b64_json, "image/png")
        : await (await fetch(item.url!)).blob();

      const resultPath = `${userId}/${fittingId}.png`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("dress-results")
        .upload(resultPath, resultBlob, {
          contentType: "image/png",
          upsert: true,
        });
      if (uploadError) {
        await markFailed(supabaseAdmin, fittingId, "upload_fail");
        await refundHearts(supabaseAdmin, userId, HEART_COST, "upload_fail", fittingId);
        return json({ error: "upload_fail" }, 500);
      }

      await supabaseAdmin
        .from("dress_fittings")
        .update({
          status: "done",
          result_image_path: resultPath,
          updated_at: new Date().toISOString(),
        })
        .eq("id", fittingId);

      const { data: signed } = await supabaseAdmin.storage
        .from("dress-results")
        .createSignedUrl(resultPath, 60 * 60 * 24);

      return json(
        {
          fitting_id: fittingId,
          result_path: resultPath,
          result_url: signed?.signedUrl ?? null,
          balance_after: spendRow.balance_after,
        },
        200,
      );
    } catch (innerError) {
      console.error("inner error:", innerError);
      await markFailed(
        supabaseAdmin,
        fittingId,
        innerError instanceof Error ? innerError.message : "inner_error",
      );
      await refundHearts(supabaseAdmin, userId, HEART_COST, "inner_error", fittingId);
      return json({ error: "generation_failed" }, 500);
    }
  } catch (error) {
    console.error("dewy-dress-recommend fatal:", error);
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

function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function markFailed(
  client: ReturnType<typeof createClient>,
  fittingId: string,
  reason: string,
) {
  await client
    .from("dress_fittings")
    .update({
      status: "failed",
      error_message: reason.substring(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq("id", fittingId);
}

async function refundHearts(
  client: ReturnType<typeof createClient>,
  userId: string,
  amount: number,
  reason: string,
  fittingId?: string,
) {
  try {
    await client.rpc("earn_hearts", {
      p_user_id: userId,
      p_amount: amount,
      p_reason: "refund_failed_dress_recommend",
      p_ref_id: fittingId ?? null,
    });
    if (fittingId) {
      await client
        .from("dress_fittings")
        .update({ status: "refunded", error_message: reason.substring(0, 500) })
        .eq("id", fittingId);
    }
  } catch (e) {
    console.error("refund failed:", e);
  }
}
