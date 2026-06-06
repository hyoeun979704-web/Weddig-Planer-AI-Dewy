// 청첩장 일러스트 변환 — 사용자가 업로드한 사진을 수채화풍 일러스트로 변환.
//
// 흐름:
//   1. 인증
//   2. source_paths 검증 (본인 폴더만)
//   3. 각 path 별로 OpenAI gpt-image-2 (images/edits) 호출 (같은 path 는 1회만)
//   4. 결과 PNG 를 invitation-uploads/{userId}/illustrations/ 에 업로드
//   5. 새 path 들을 반환
//
// 가격 차감은 클라이언트(InvitationFlow)에서 발행 시점에 template.price_hearts
// 로 일괄 spend_hearts 호출. 이 함수는 변환만 담당 (누끼 함수와 동일 정책).
//
// OpenAI Images API: https://platform.openai.com/docs/api-reference/images/createEdit

import { MODELS } from "../_shared/llm.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


// 청첩장 톤에 어울리는 부드러운 수채화 일러스트로 변환하는 프롬프트.
// 인물의 정체성·구도는 유지하되 사진 질감을 일러스트로만 바꾸도록 지시.
const ILLUSTRATION_PROMPT =
  "Transform this photo into a soft, romantic wedding illustration in a delicate " +
  "watercolor style. Keep the same composition, pose, and the people's likeness " +
  "and features recognizable. Use gentle pastel tones, light brush textures, and " +
  "clean lines. Remove harsh photographic noise. The result should look like a " +
  "hand-painted illustration suitable for an elegant wedding invitation. " +
  "Plain or softly washed background.";

// 약도(map) 스타일 — 지도 캡쳐를 청첩장에 어울리는 미니멀 라인아트 약도로.
// 도로/랜드마크/목적지 마커 위치는 정확히 유지하되 UI·로고·노이즈는 제거.
const MAP_PROMPT =
  "Transform this map screenshot into a clean, minimal hand-drawn directions map " +
  "(약도) illustration suitable for an elegant wedding invitation. Keep the streets, " +
  "key landmarks, and the destination marker position accurate and in the same " +
  "layout. Use simple line art, soft muted colors, clear road lines and concise " +
  "Korean labels. Remove app UI, logos, ads, and photographic noise. Flat, " +
  "print-friendly, refined style.";

// style='map' 일러스트는 호출당 정가 차감 (반복 가능한 부가기능).
const MAP_HEART_COST = 3;

interface RequestBody {
  /** invitation-uploads 안 본인 폴더의 사진 경로들 */
  source_paths: string[];
  /** 변환 스타일 — 기본 portrait(사진→수채화), map(지도→약도) */
  style?: "portrait" | "map";
}

interface IllustrationResult {
  /** 원본 path → 변환 결과 path */
  illustration_paths: Record<string, string>;
  /** 화면 표시용 signed URL (24h) */
  illustration_urls: Record<string, string>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ───────── 인증 ─────────
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

    // ───────── 입력 검증 ─────────
    const body = (await req.json()) as RequestBody;
    if (!Array.isArray(body.source_paths) || body.source_paths.length === 0) {
      return json({ error: "Missing source_paths" }, 400);
    }
    for (const p of body.source_paths) {
      if (!p.startsWith(`${userId}/`)) {
        return json({ error: "invalid_source_path", detail: p }, 403);
      }
    }
    const uniquePaths = Array.from(new Set(body.source_paths));
    const style = body.style === "map" ? "map" : "portrait";
    const prompt = style === "map" ? MAP_PROMPT : ILLUSTRATION_PROMPT;

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return json({ error: "openai_not_configured" }, 500);
    }

    // 약도 일러스트는 호출당 3하트 정가 차감 (실패 시 아래에서 환불).
    // portrait 는 발행 시점에 일괄 차감하므로 여기서 과금하지 않음.
    if (style === "map") {
      const { data: spendData, error: spendError } = await supabaseAdmin.rpc(
        "spend_hearts",
        {
          p_user_id: userId,
          p_amount: MAP_HEART_COST,
          p_reason: "map_illustration",
        },
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
    }

    // ───────── 각 path 별로 일러스트 변환 ─────────
    const illustrationPaths: Record<string, string> = {};
    const illustrationUrls: Record<string, string> = {};

    for (const sourcePath of uniquePaths) {
      try {
        // 1) 원본 다운로드
        const { data: srcBlob, error: dlError } = await supabaseAdmin.storage
          .from("invitation-uploads")
          .download(sourcePath);
        if (dlError || !srcBlob) {
          console.error(`download fail ${sourcePath}:`, dlError);
          continue;
        }

        // 2) OpenAI gpt-image-2 호출 (images/edits)
        const form = new FormData();
        form.append("model", MODELS.image);
        form.append("prompt", prompt);
        form.append("size", "1024x1024");
        form.append("quality", "medium");
        form.append("n", "1");
        form.append("image[]", srcBlob, "source.png");

        const openaiRes = await fetch(
          "https://api.openai.com/v1/images/edits",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
            body: form,
          },
        );

        if (!openaiRes.ok) {
          const errText = await openaiRes.text();
          console.error(
            `OpenAI error ${openaiRes.status}:`,
            errText.substring(0, 200),
          );
          continue;
        }

        const openaiData = (await openaiRes.json()) as {
          data: { b64_json?: string; url?: string }[];
        };
        const item = openaiData.data?.[0];
        if (!item) {
          console.error(`no image returned for ${sourcePath}`);
          continue;
        }

        const resultBlob = item.b64_json
          ? base64ToBlob(item.b64_json, "image/png")
          : await (await fetch(item.url!)).blob();

        // 3) 결과 업로드 — illustrations/{uuid}-{원본파일명}.png
        const originalFilename = sourcePath.split("/").pop() ?? "photo.png";
        const illustrationFilename = `illustrations/${crypto.randomUUID()}-${originalFilename.replace(/\.[^.]+$/, "")}.png`;
        const illustrationPath = `${userId}/${illustrationFilename}`;

        const { error: upError } = await supabaseAdmin.storage
          .from("invitation-uploads")
          .upload(illustrationPath, resultBlob, {
            contentType: "image/png",
            upsert: false,
          });
        if (upError) {
          console.error(`upload fail:`, upError);
          continue;
        }

        // 4) signed URL
        const { data: signed } = await supabaseAdmin.storage
          .from("invitation-uploads")
          .createSignedUrl(illustrationPath, 60 * 60 * 24);

        illustrationPaths[sourcePath] = illustrationPath;
        if (signed?.signedUrl) {
          illustrationUrls[sourcePath] = signed.signedUrl;
        }
      } catch (e) {
        console.error(`illustration failed for ${sourcePath}:`, e);
      }
    }

    if (Object.keys(illustrationPaths).length === 0) {
      // 약도 과금분 환불 (earn_hearts 는 service_role 전용)
      if (style === "map") {
        await supabaseAdmin.rpc("earn_hearts", {
          p_user_id: userId,
          p_amount: MAP_HEART_COST,
          p_reason: "map_illustration_refund",
        });
      }
      return json({ error: "illustration_all_failed" }, 502);
    }

    const result: IllustrationResult = {
      illustration_paths: illustrationPaths,
      illustration_urls: illustrationUrls,
    };
    return json(result, 200);
  } catch (error) {
    console.error("invitation-illustration fatal:", error);
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
