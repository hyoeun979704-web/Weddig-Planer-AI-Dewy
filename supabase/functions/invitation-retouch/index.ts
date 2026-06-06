// 사진 AI 보정 — 화질 개선 + (선택) 자연스러운 몸매 보정.
//
// 정체성(얼굴·이목구비·헤어·의상)을 유지한 채 해상도·선명도를 올리고,
// 요청 시 실루엣을 자연스럽게 보정한다(정확한 kg/cm 수치 제어는 생성형 특성상
// 불가 — 정성 프리셋으로 처리).
//
// 과금: 계정당 첫 1회 무료(photo_retouch_usage), 이후 1회당 5하트.
// 실패 시 차감분 환불(earn_hearts).
//
// 입력: { source_path: string, body?: BodyPreset }
// 출력: { path, url, charged, was_free }

import { adminClient } from "../_shared/supabase.ts";
import { MODELS } from "../_shared/llm.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const HEART_COST = 5;

type BodyPreset =
  | "none"
  | "slim_soft"
  | "slim_strong"
  | "proportion"
  | "eighthead";

// 공통: 정체성·구도 보존 + 화질 개선 (모든 보정의 기본).
const BASE_PROMPT =
  "Enhance this wedding photo to higher resolution and clarity. " +
  "CRITICAL: preserve the exact identity of every person — their face, facial " +
  "features, expression, hairstyle, skin tone, and clothing must stay the same and " +
  "recognizable. Keep the same pose, framing, and background. Reduce noise, blur, " +
  "and compression artifacts; sharpen fine detail; keep colors natural and true to " +
  "the original. Photorealistic result, no illustration or stylization.";

// 몸매 프리셋(정성) — 자연스러움·비왜곡 방지·얼굴 불변을 명시.
const BODY_PROMPTS: Record<BodyPreset, string> = {
  none: "",
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
  eighthead:
    " Adjust the figure toward tall, balanced 8-head-tall proportions by gently " +
    "lengthening the legs and refining posture. Keep it natural and believable, " +
    "avoid stretching the background or distorting limbs, and keep the face and " +
    "identity exactly the same.",
};

interface RequestBody {
  source_path: string;
  body?: BodyPreset;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ───── 인증 ─────
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

    // ───── 입력 검증 ─────
    const reqBody = (await req.json()) as RequestBody;
    const sourcePath = reqBody.source_path;
    if (!sourcePath || typeof sourcePath !== "string") {
      return json({ error: "Missing source_path" }, 400);
    }
    if (!sourcePath.startsWith(`${userId}/`)) {
      return json({ error: "invalid_source_path" }, 403);
    }
    const bodyPreset: BodyPreset = (
      ["none", "slim_soft", "slim_strong", "proportion", "eighthead"] as const
    ).includes(reqBody.body as BodyPreset)
      ? (reqBody.body as BodyPreset)
      : "none";
    const prompt = BASE_PROMPT + (BODY_PROMPTS[bodyPreset] ?? "");

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) return json({ error: "openai_not_configured" }, 500);

    // ───── 첫 1회 무료 판정(계정당) ─────
    const { data: usageRow } = await supabaseAdmin
      .from("photo_retouch_usage")
      .select("used_count")
      .eq("user_id", userId)
      .maybeSingle();
    const usedCount = usageRow?.used_count ?? 0;
    const isFree = usedCount === 0;

    // ───── 과금(무료 아니면) ─────
    let charged = false;
    if (!isFree) {
      const { data: spendData, error: spendError } = await supabaseAdmin.rpc(
        "spend_hearts",
        { p_user_id: userId, p_amount: HEART_COST, p_reason: "photo_retouch" },
      );
      const spendRow = Array.isArray(spendData) ? spendData[0] : spendData;
      if (spendError) {
        console.error("spend_hearts error:", spendError);
        return json({ error: "hearts_error" }, 500);
      }
      if (!spendRow?.success) {
        return json(
          { error: "insufficient_hearts", message: spendRow?.message },
          402,
        );
      }
      charged = true;
    }

    const refund = async () => {
      if (charged) {
        await supabaseAdmin.rpc("earn_hearts", {
          p_user_id: userId,
          p_amount: HEART_COST,
          p_reason: "photo_retouch_refund",
        });
      }
    };

    try {
      // 1) 원본 다운로드
      const { data: srcBlob, error: dlError } = await supabaseAdmin.storage
        .from("invitation-uploads")
        .download(sourcePath);
      if (dlError || !srcBlob) {
        await refund();
        return json({ error: "source_download_failed" }, 502);
      }

      // 2) OpenAI gpt-image-2 (images/edits) — 입력 비율 유지(auto), 고화질
      const form = new FormData();
      form.append("model", MODELS.image);
      form.append("prompt", prompt);
      form.append("size", "auto");
      form.append("quality", "high");
      form.append("n", "1");
      form.append("image[]", srcBlob, "source.png");

      const openaiRes = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: form,
      });
      if (!openaiRes.ok) {
        const errText = await openaiRes.text();
        console.error(`OpenAI ${openaiRes.status}:`, errText.substring(0, 300));
        await refund();
        // 정책/모델이 거부한 경우 구분해 안내
        const blocked =
          openaiRes.status === 400 &&
          /safety|policy|moderation|rejected/i.test(errText);
        return json(
          { error: blocked ? "content_policy" : "retouch_failed" },
          blocked ? 422 : 502,
        );
      }
      const openaiData = (await openaiRes.json()) as {
        data: { b64_json?: string; url?: string }[];
      };
      const item = openaiData.data?.[0];
      if (!item) {
        await refund();
        return json({ error: "retouch_failed" }, 502);
      }
      const resultBlob = item.b64_json
        ? base64ToBlob(item.b64_json, "image/png")
        : await (await fetch(item.url!)).blob();

      // 3) 업로드 — retouched/{uuid}-{원본명}.png
      const originalFilename = sourcePath.split("/").pop() ?? "photo.png";
      const outPath = `${userId}/retouched/${crypto.randomUUID()}-${originalFilename.replace(/\.[^.]+$/, "")}.png`;
      const { error: upError } = await supabaseAdmin.storage
        .from("invitation-uploads")
        .upload(outPath, resultBlob, {
          contentType: "image/png",
          upsert: false,
        });
      if (upError) {
        await refund();
        return json({ error: "upload_failed" }, 500);
      }
      const { data: signed } = await supabaseAdmin.storage
        .from("invitation-uploads")
        .createSignedUrl(outPath, 60 * 60 * 24);

      // 4) 사용 횟수 증가(첫 무료 소진 기록)
      await supabaseAdmin.from("photo_retouch_usage").upsert(
        {
          user_id: userId,
          used_count: usedCount + 1,
          first_free_used: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      return json(
        {
          path: outPath,
          url: signed?.signedUrl ?? null,
          charged,
          was_free: isFree,
        },
        200,
      );
    } catch (e) {
      console.error("retouch error:", e);
      await refund();
      return json({ error: "retouch_failed" }, 502);
    }
  } catch (error) {
    console.error("invitation-retouch fatal:", error);
    return json({ error: "server_error" }, 500);
  }
});

function base64ToBlob(b64: string, contentType: string): Blob {
  const byteChars = atob(b64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: contentType });
}

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
