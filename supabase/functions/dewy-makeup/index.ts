// 메이크업 시뮬레이션 — AI 합성 Edge Function
//
// 흐름은 dewy-fitting 과 동일 골격(공용: _shared/studioEdge.ts):
//   1. 인증 → 입력 검증
//   2. 프롬프트 서버 조립 — 클라이언트 prompt 는 받지 않는다(신뢰 경계).
//      · 카탈로그: makeup_sample_id → makeup_samples 메타 서버 조회 → describeMakeup
//      · 맞춤: custom_makeup(enum 속성 객체) → describeMakeup(사전 기반 = 주입 불가)
//   3. spend_hearts(5, "makeup_fitting") → makeup_fittings row(pending)
//   4. gpt-image(셀카 + 카탈로그면 레퍼런스 이미지) → makeup-results 업로드 → done
//   5. 실패 시 환불(reason="refund_failed_makeup")
//
// 보안: source_image_path 가 makeup-uploads/{userId}/ 폴더인지 강제.

import { adminClient } from "../_shared/supabase.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  json,
  authenticateUser,
  downloadFromStorage,
  downloadFromUrl,
  callImageEdit,
  makeJobFailureHandlers,
  spendHearts,
  runInBackground,
  precheckSourceImage,
  hasRecentPendingJob,
  hasHeartBalance,
} from "../_shared/studioEdge.ts";
import {
  buildMakeupPrompt,
  makeupSceneByCode,
  type MakeupSceneCode,
} from "../_shared/studio/makeupScenes.ts";
import { describeMakeup, type MakeupMetadata } from "../_shared/studio/makeupDescription.ts";
import { parseRetouchLevel } from "../_shared/studio/retouch.ts";

const HEART_COST = 5;

interface RequestBody {
  source_image_path: string;
  scene_code: string;
  makeup_sample_id?: string;      // 카탈로그 모드
  custom_makeup?: MakeupMetadata; // 맞춤 모드 — enum 속성만 유효
  retouch_level?: string;         // natural(기본) | studio | glam
}

// makeup_samples 메타 컬럼 — 클라 fetchMakeupMeta 와 동일 집합.
const MAKEUP_META_COLS =
  "name, base_finish, lip_color, lip_finish, eye_style, eye_color, blush_color, blush_placement, brow_shape, contour_intensity, details, mood";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const userId = await authenticateUser(req);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const supabaseAdmin = adminClient();

    const body = (await req.json()) as RequestBody;
    if (!body.source_image_path || !body.scene_code) {
      return json({ error: "Missing required fields" }, 400);
    }
    if (!body.source_image_path.startsWith(`${userId}/`)) {
      return json({ error: "invalid_source_image" }, 403);
    }
    if (!makeupSceneByCode(body.scene_code as MakeupSceneCode)) {
      return json({ error: "unknown_scene" }, 400);
    }
    const retouch = parseRetouchLevel(body.retouch_level);

    // 카탈로그 모드: 메이크업 샘플 조회(레퍼런스 이미지 + 메타 → 서버 프롬프트 조립).
    let makeup: { id: string; image_url: string } | null = null;
    let makeupDescription = "";
    let custom = true;
    if (body.makeup_sample_id) {
      const { data: m, error: makeupError } = await supabaseAdmin
        .from("makeup_samples")
        .select(`id, image_url, is_active, ${MAKEUP_META_COLS}`)
        .eq("id", body.makeup_sample_id)
        .single();
      if (makeupError || !m || !m.is_active) {
        return json({ error: "makeup_not_found" }, 404);
      }
      makeup = { id: m.id as string, image_url: m.image_url as string };
      makeupDescription = describeMakeup(m as MakeupMetadata);
      custom = false;
    } else {
      makeupDescription = describeMakeup(body.custom_makeup ?? {});
    }

    const prompt = buildMakeupPrompt(body.scene_code as MakeupSceneCode, makeupDescription, {
      custom,
      retouch,
    });

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) return json({ error: "openai_not_configured" }, 500);

    // 이중 제출 가드(15초) + 결제 전 사진 품질 게이트(fail-open). 원본은 합성에 재사용.
    if (await hasRecentPendingJob(supabaseAdmin, "makeup_fittings", userId)) {
      return json({ error: "duplicate_request" }, 409);
    }
    // 잔액 선확인(읽기) — 잔액 0 사용자의 무료 게이트(다운로드+Gemini) 폭주 차단.
    if (!(await hasHeartBalance(supabaseAdmin, userId, HEART_COST))) {
      return json({ error: "insufficient_hearts" }, 402);
    }
    let sourceBlob: Blob;
    try {
      sourceBlob = await downloadFromStorage(supabaseAdmin, "makeup-uploads", body.source_image_path);
    } catch {
      // 코드형 400 — 클라 studioErrors 매핑("사진을 불러오지 못했어요"). 하트 미차감.
      return json({ error: "source_download_failed" }, 400);
    }
    const precheckFail = await precheckSourceImage(sourceBlob, Deno.env.get("GEMINI_API_KEY"));
    if (precheckFail) return json({ error: precheckFail }, 400);

    const spend = await spendHearts(supabaseAdmin, userId, HEART_COST, "makeup_fitting");
    if (spend instanceof Response) return spend;

    const { markFailed, refund } = makeJobFailureHandlers({
      client: supabaseAdmin,
      table: "makeup_fittings",
      userId,
      amount: HEART_COST,
      earnReason: "refund_failed_makeup",
    });

    const { data: fitting, error: insertError } = await supabaseAdmin
      .from("makeup_fittings")
      .insert({
        user_id: userId,
        source_image_path: body.source_image_path,
        selected_sample_id: makeup?.id ?? null,
        prompt_params: {
          scene_code: body.scene_code,
          retouch_level: retouch,
          mode: custom ? "custom" : "catalog",
        },
        hearts_spent: HEART_COST,
        status: "pending",
      })
      .select("id")
      .single();
    if (insertError || !fitting) {
      await refund("row_insert_fail");
      return json({ error: "insert_fail" }, 500);
    }
    const fittingId = fitting.id as string;

    // 백그라운드 합성 — 페이지 이탈/창닫음에도 서버에서 계속 진행(202 즉시 반환).
    const job = (async () => {
      try {
        // 원본은 품질 게이트 단계에서 이미 받아둠(sourceBlob) — 재다운로드 없음.
        const makeupImgBlob = makeup ? await downloadFromUrl(makeup.image_url) : null;

        const images = [{ blob: sourceBlob, name: "user.png" }];
        if (makeupImgBlob) images.push({ blob: makeupImgBlob, name: "makeup.png" });

        // 메이크업은 정사각 클로즈업이 더 자연스러움
        const resultBlob = await callImageEdit({
          apiKey: OPENAI_API_KEY,
          prompt,
          size: "1024x1024",
          images,
        });

        const resultPath = `${userId}/${fittingId}.png`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from("makeup-results")
          .upload(resultPath, resultBlob, { contentType: "image/png", upsert: true });
        if (uploadError) {
          console.error("upload error:", uploadError);
          await markFailed(fittingId, "upload_fail");
          await refund("upload_fail", fittingId);
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
        const reason = innerError instanceof Error ? innerError.message : "inner_error";
        await markFailed(fittingId, reason);
        await refund(reason, fittingId);
      }
    })();

    await runInBackground(job);

    return json(
      { fitting_id: fittingId, status: "pending", balance_after: spend.balanceAfter },
      202,
    );
  } catch (error) {
    console.error("dewy-makeup fatal:", error);
    return json({ error: "server_error" }, 500);
  }
});
