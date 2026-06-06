// 청첩장 누끼 — 사용자가 업로드한 사진의 배경을 제거.
//
// 흐름:
//   1. 인증
//   2. source_paths 검증 (본인 폴더만)
//   3. 각 path 별로 remove.bg 호출 (같은 path 가 여러 번 들어와도 1회만)
//   4. 결과 PNG 를 invitation-uploads/{userId}/cutouts/ 에 업로드
//   5. 새 path 들을 반환
//
// 가격 차감은 클라이언트(InvitationFlow)에서 발행 액션 시점에 별도로
// spend_hearts(price_hearts) 호출. 이 함수는 누끼 처리만 담당.
// (이유: 청첩장 발행 가격은 누끼 호출 개수와 무관하고 템플릿 단위로 책정됨)
//
// remove.bg API: https://www.remove.bg/api

import { adminClient } from "../_shared/supabase.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


interface RequestBody {
  /** invitation-uploads 안 본인 폴더의 사진 경로들 */
  source_paths: string[];
}

interface CutoutResult {
  /** 원본 path → 누낀 결과 path */
  cutout_paths: Record<string, string>;
  /** 화면 표시용 signed URL (24h) */
  cutout_urls: Record<string, string>;
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

    const supabaseAdmin = adminClient();

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

    const REMOVEBG_API_KEY = Deno.env.get("REMOVEBG_API_KEY");
    if (!REMOVEBG_API_KEY) {
      return json({ error: "removebg_not_configured" }, 500);
    }

    // ───────── 각 path 별로 누끼 처리 ─────────
    const cutoutPaths: Record<string, string> = {};
    const cutoutUrls: Record<string, string> = {};

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

        // 2) remove.bg 호출
        const form = new FormData();
        form.append("image_file", srcBlob, "source.png");
        form.append("size", "auto");
        form.append("format", "png");

        const removebgRes = await fetch(
          "https://api.remove.bg/v1.0/removebg",
          {
            method: "POST",
            headers: { "X-Api-Key": REMOVEBG_API_KEY },
            body: form,
          },
        );

        if (!removebgRes.ok) {
          const errText = await removebgRes.text();
          console.error(
            `remove.bg error ${removebgRes.status}:`,
            errText.substring(0, 200),
          );
          continue;
        }

        const cutoutBlob = await removebgRes.blob();

        // 3) 결과 업로드 — cutouts/{원본파일명}.png
        const originalFilename = sourcePath.split("/").pop() ?? "photo.png";
        const cutoutFilename = `cutouts/${crypto.randomUUID()}-${originalFilename.replace(/\.[^.]+$/, "")}.png`;
        const cutoutPath = `${userId}/${cutoutFilename}`;

        const { error: upError } = await supabaseAdmin.storage
          .from("invitation-uploads")
          .upload(cutoutPath, cutoutBlob, {
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
          .createSignedUrl(cutoutPath, 60 * 60 * 24);

        cutoutPaths[sourcePath] = cutoutPath;
        if (signed?.signedUrl) {
          cutoutUrls[sourcePath] = signed.signedUrl;
        }
      } catch (e) {
        console.error(`cutout failed for ${sourcePath}:`, e);
      }
    }

    if (Object.keys(cutoutPaths).length === 0) {
      return json({ error: "cutout_all_failed" }, 502);
    }

    const result: CutoutResult = {
      cutout_paths: cutoutPaths,
      cutout_urls: cutoutUrls,
    };
    return json(result, 200);
  } catch (error) {
    console.error("invitation-cutout fatal:", error);
    return json({ error: "server_error" }, 500);
  }
});

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
