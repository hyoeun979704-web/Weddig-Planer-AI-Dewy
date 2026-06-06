// 메이크업 시뮬레이션 — AI 합성 Edge Function
//
// 흐름은 dewy-fitting 과 동일:
//   1. 인증
//   2. 입력 검증 (source_image_path, makeup_sample_id, scene_code, prompt)
//   3. spend_hearts(5) 차감 (reason="makeup_fitting")
//   4. makeup_fittings row 생성 (status=pending)
//   5. OpenAI gpt-image-2 호출 (사용자 셀카 + 메이크업 레퍼런스 이미지)
//   6. 결과를 makeup-results 버킷에 업로드
//   7. makeup_fittings 업데이트 (status=done)
//   8. 실패 시 earn_hearts 환불 + status=refunded
//
// 보안: source_image_path 가 makeup-uploads/{userId}/ 폴더인지 강제.

import { adminClient } from "../_shared/supabase.ts";
import { MODELS } from "../_shared/llm.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const HEART_COST = 5;

interface RequestBody {
  source_image_path: string;
  makeup_sample_id: string;
  scene_code: string;
  prompt: string;
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

    const supabaseAdmin = adminClient();

    const body = (await req.json()) as RequestBody;
    if (
      !body.source_image_path ||
      !body.makeup_sample_id ||
      !body.scene_code ||
      !body.prompt
    ) {
      return json({ error: "Missing required fields" }, 400);
    }

    if (!body.source_image_path.startsWith(`${userId}/`)) {
      return json({ error: "invalid_source_image" }, 403);
    }

    const { data: makeup, error: makeupError } = await supabaseAdmin
      .from("makeup_samples")
      .select("id, image_url, is_active")
      .eq("id", body.makeup_sample_id)
      .single();
    if (makeupError || !makeup || !makeup.is_active) {
      return json({ error: "makeup_not_found" }, 404);
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return json({ error: "openai_not_configured" }, 500);
    }

    const { data: spendData, error: spendError } = await supabaseAdmin.rpc(
      "spend_hearts",
      {
        p_user_id: userId,
        p_amount: HEART_COST,
        p_reason: "makeup_fitting",
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
      .from("makeup_fittings")
      .insert({
        user_id: userId,
        source_image_path: body.source_image_path,
        selected_sample_id: body.makeup_sample_id,
        prompt_params: { scene_code: body.scene_code },
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

    // 백그라운드 작업 — 페이지 이탈/창닫음에도 서버에서 계속 진행(즉시 202 반환).
    const job = (async () => {
      try {
        const [userImgBlob, makeupImgBlob] = await Promise.all([
          downloadFromStorage(supabaseAdmin, "makeup-uploads", body.source_image_path),
          downloadFromUrl(makeup.image_url),
        ]);

        // OpenAI images.edit — 메이크업은 정사각 클로즈업이 더 자연스러움
        const form = new FormData();
        form.append("model", MODELS.image);
        form.append("prompt", body.prompt);
        form.append("size", "1024x1024");
        form.append("quality", "medium");
        form.append("n", "1");
        form.append("image[]", userImgBlob, "user.png");
        form.append("image[]", makeupImgBlob, "makeup.png");

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
          return;
        }

        const openaiData = (await openaiRes.json()) as {
          data: { b64_json?: string; url?: string }[];
        };
        const item = openaiData.data?.[0];
        if (!item) {
          await markFailed(supabaseAdmin, fittingId, "no_image_returned");
          await refundHearts(supabaseAdmin, userId, HEART_COST, "openai_no_result", fittingId);
          return;
        }

        const resultBlob = item.b64_json
          ? base64ToBlob(item.b64_json, "image/png")
          : await (await fetch(item.url!)).blob();

        const resultPath = `${userId}/${fittingId}.png`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from("makeup-results")
          .upload(resultPath, resultBlob, { contentType: "image/png", upsert: true });
        if (uploadError) {
          console.error("upload error:", uploadError);
          await markFailed(supabaseAdmin, fittingId, "upload_fail");
          await refundHearts(supabaseAdmin, userId, HEART_COST, "upload_fail", fittingId);
          return;
        }

        await supabaseAdmin
          .from("makeup_fittings")
          .update({
            status: "done",
            result_image_path: resultPath,
            updated_at: new Date().toISOString(),
          })
          .eq("id", fittingId);
      } catch (innerError) {
        console.error("inner error:", innerError);
        await markFailed(
          supabaseAdmin,
          fittingId,
          innerError instanceof Error ? innerError.message : "inner_error",
        );
        await refundHearts(supabaseAdmin, userId, HEART_COST, "inner_error", fittingId);
      }
    })();

    // @ts-ignore EdgeRuntime 은 런타임 전역
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(job);
    } else {
      await job; // 로컬/폴백
    }

    return json(
      { fitting_id: fittingId, status: "pending", balance_after: spendRow.balance_after },
      202,
    );
  } catch (error) {
    console.error("dewy-makeup fatal:", error);
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
  fittingId: string,
  reason: string,
) {
  await client
    .from("makeup_fittings")
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
      p_reason: "refund_failed_makeup",
      p_ref_id: fittingId ?? null,
    });
    if (fittingId) {
      await client
        .from("makeup_fittings")
        .update({ status: "refunded", error_message: reason.substring(0, 500) })
        .eq("id", fittingId);
    }
  } catch (e) {
    console.error("refund failed:", e);
  }
}
