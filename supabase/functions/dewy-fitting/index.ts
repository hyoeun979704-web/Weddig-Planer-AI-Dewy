// 방구석 드레스 투어 — AI 합성 Edge Function
//
// 흐름:
//   1. 인증 검증
//   2. 입력 검증 (source_image_path, dress_sample_id, scene_code)
//   3. spend_hearts(5) 차감
//   4. dress_fittings row 생성 (status=pending)
//   5. OpenAI gpt-image-2 호출 (사용자 사진 + 드레스 이미지)
//   6. 결과 이미지를 dress-results 버킷에 업로드
//   7. dress_fittings 업데이트 (status=done, result_image_path)
//   8. 실패 시 earn_hearts 환불 + status=refunded
//
// 보안: 본인 사진 source_image_path 는 dress-uploads/{userId}/ 폴더 검증

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const HEART_COST = 5;

interface RequestBody {
  source_image_path: string; // dress-uploads/{userId}/xxx.jpg
  dress_sample_id: string;
  scene_code: string;
  prompt: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ─────────────────────────────────────────────
    // 1) 인증
    // ─────────────────────────────────────────────
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

    // service_role 클라이언트 — RPC·Storage 쓰기용
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ─────────────────────────────────────────────
    // 2) 입력 검증
    // ─────────────────────────────────────────────
    const body = (await req.json()) as RequestBody;
    if (
      !body.source_image_path ||
      !body.dress_sample_id ||
      !body.scene_code ||
      !body.prompt
    ) {
      return json({ error: "Missing required fields" }, 400);
    }

    // source_image_path 가 본인 폴더인지 확인 (RLS 보강)
    if (!body.source_image_path.startsWith(`${userId}/`)) {
      return json({ error: "invalid_source_image" }, 403);
    }

    // 드레스 샘플 조회 (image_url 필요)
    const { data: dress, error: dressError } = await supabaseAdmin
      .from("dress_samples")
      .select("id, image_url, is_active")
      .eq("id", body.dress_sample_id)
      .single();
    if (dressError || !dress || !dress.is_active) {
      return json({ error: "dress_not_found" }, 404);
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return json({ error: "openai_not_configured" }, 500);
    }

    // ─────────────────────────────────────────────
    // 3) 하트 차감
    // ─────────────────────────────────────────────
    const { data: spendData, error: spendError } = await supabaseAdmin.rpc(
      "spend_hearts",
      {
        p_user_id: userId,
        p_amount: HEART_COST,
        p_reason: "dress_fitting",
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

    // ─────────────────────────────────────────────
    // 4) dress_fittings row 생성
    // ─────────────────────────────────────────────
    const { data: fitting, error: insertError } = await supabaseAdmin
      .from("dress_fittings")
      .insert({
        user_id: userId,
        source_image_path: body.source_image_path,
        selected_sample_id: body.dress_sample_id,
        prompt_params: {
          scene_code: body.scene_code,
        },
        hearts_spent: HEART_COST,
        status: "pending",
      })
      .select("id")
      .single();
    if (insertError || !fitting) {
      // 하트만 차감되고 row 못 만든 케이스 → 환불
      await refundHearts(supabaseAdmin, userId, HEART_COST, "row_insert_fail");
      return json({ error: "insert_fail" }, 500);
    }
    const fittingId = fitting.id as string;

    // ─────────────────────────────────────────────
    // 5) 이미지 다운로드 → OpenAI 전송용 준비
    // ─────────────────────────────────────────────
    try {
      const [userImgBlob, dressImgBlob] = await Promise.all([
        downloadFromStorage(
          supabaseAdmin,
          "dress-uploads",
          body.source_image_path,
        ),
        downloadFromUrl(dress.image_url),
      ]);

      // OpenAI images.edit — multipart/form-data
      const form = new FormData();
      form.append("model", "gpt-image-2");
      form.append("prompt", body.prompt);
      form.append("size", "1024x1536");
      form.append("quality", "medium");
      form.append("n", "1");
      form.append("image[]", userImgBlob, "user.png");
      form.append("image[]", dressImgBlob, "dress.png");

      const openaiRes = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: form,
      });

      if (!openaiRes.ok) {
        const errText = await openaiRes.text();
        console.error(`OpenAI error ${openaiRes.status}:`, errText);
        await markFailed(supabaseAdmin, fittingId, `openai_${openaiRes.status}`);
        await refundHearts(
          supabaseAdmin,
          userId,
          HEART_COST,
          "openai_fail",
          fittingId,
        );
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
        await refundHearts(
          supabaseAdmin,
          userId,
          HEART_COST,
          "openai_no_result",
          fittingId,
        );
        return json({ error: "no_image_returned" }, 502);
      }

      // ─────────────────────────────────────────────
      // 6) 결과 이미지를 dress-results 버킷에 업로드
      // ─────────────────────────────────────────────
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
        console.error("upload error:", uploadError);
        await markFailed(supabaseAdmin, fittingId, "upload_fail");
        await refundHearts(
          supabaseAdmin,
          userId,
          HEART_COST,
          "upload_fail",
          fittingId,
        );
        return json({ error: "upload_fail" }, 500);
      }

      // ─────────────────────────────────────────────
      // 7) status = done
      // ─────────────────────────────────────────────
      await supabaseAdmin
        .from("dress_fittings")
        .update({
          status: "done",
          result_image_path: resultPath,
          updated_at: new Date().toISOString(),
        })
        .eq("id", fittingId);

      // signed URL 생성 (private 버킷)
      const { data: signed } = await supabaseAdmin.storage
        .from("dress-results")
        .createSignedUrl(resultPath, 60 * 60 * 24); // 24h

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
      await refundHearts(
        supabaseAdmin,
        userId,
        HEART_COST,
        "inner_error",
        fittingId,
      );
      return json({ error: "generation_failed" }, 500);
    }
  } catch (error) {
    console.error("dewy-fitting fatal:", error);
    return json({ error: "server_error" }, 500);
  }
});

// ════════════════════════════════════════════════
// 유틸
// ════════════════════════════════════════════════
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
      p_reason: "refund_failed_generation",
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
