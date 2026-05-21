// 청첩장 사진→일러스트 변환 — 사용자 사진을 흑백 핸드드로잉 라인 일러스트로.
//
// 흐름 (invitation-cutout 과 동일한 인프라 패턴):
//   1. 인증
//   2. source_paths 검증 (본인 폴더만)
//   3. 각 path 별로 OpenAI gpt-image-2 호출 (같은 path 가 여러 번 들어와도 1회만)
//   4. 결과 PNG 를 invitation-uploads/{userId}/illustrations/ 에 업로드
//   5. 새 path 들을 반환
//
// 가격 차감은 클라이언트(InvitationFlow)에서 발행 액션 시점에 별도로
// spend_hearts(price_hearts) 호출. 이 함수는 변환 처리만 담당.
// (이유: 청첩장 발행 가격은 변환 호출 개수와 무관하고 템플릿 단위로 책정됨)
//
// gpt-image-2 호출 패턴은 dewy-dress-recommend 참고.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  /** invitation-uploads 안 본인 폴더의 사진 경로들 */
  source_paths: string[];
}

interface IllustrationResult {
  /** 원본 path → 일러스트 결과 path */
  illustration_paths: Record<string, string>;
  /** 화면 표시용 signed URL (24h) */
  illustration_urls: Record<string, string>;
}

// 흑백 라인 일러스트 변환 프롬프트 — 인물 단순화 + 흰 배경.
const ILLUSTRATION_PROMPT = [
  "Convert this photograph into a delicate black-and-white hand-drawn line",
  "illustration, in the style of a fine ink pen sketch for a wedding",
  "invitation card.",
  "",
  "Requirements:",
  "- Pure black continuous line work only, no grayscale shading, no hatching",
  "  fills, no color whatsoever.",
  "- Clean, pure white background (#FFFFFF), fully transparent of any photo",
  "  texture or background scenery — remove the original background entirely.",
  "- Simplify the subject(s): capture the pose, hairstyle, clothing silhouette",
  "  and facial expression with minimal elegant strokes. Avoid photographic",
  "  detail; this should look hand-drawn, not traced.",
  "- Keep the people recognizable but stylized and gentle, romantic mood.",
  "- Even, confident line weight like a single-pen continuous drawing.",
  "- No text, no frames, no decorative borders, no signature.",
].join("\n");

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
    // 중복 제거 — 같은 사진이 여러 슬롯에 매핑됐을 수 있음
    const uniquePaths = Array.from(new Set(body.source_paths));

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return json({ error: "openai_not_configured" }, 500);
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

        // 2) gpt-image-2 호출 (images/edits)
        const form = new FormData();
        form.append("model", "gpt-image-2");
        form.append("prompt", ILLUSTRATION_PROMPT);
        form.append("size", "1024x1536");
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

        // 3) 결과 업로드 — illustrations/{원본파일명}.png
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
        console.error(`illustrate failed for ${sourcePath}:`, e);
      }
    }

    if (Object.keys(illustrationPaths).length === 0) {
      return json({ error: "illustrate_all_failed" }, 502);
    }

    const result: IllustrationResult = {
      illustration_paths: illustrationPaths,
      illustration_urls: illustrationUrls,
    };
    return json(result, 200);
  } catch (error) {
    console.error("invitation-illustrate fatal:", error);
    return json({ error: "server_error" }, 500);
  }
});

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
