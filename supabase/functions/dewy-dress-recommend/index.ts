// AI 드레스/예복 추천 — gpt-image 한 번으로 끝.
//
// 흐름:
//   1. 인증 → 입력 검증 (source_image_path, body_shape, scene_code)
//   2. 프롬프트 서버 조립 — 클라이언트 prompt 는 받지 않는다(신뢰 경계).
//      체형 가이드는 body_shape 코드 → 서버측 BODY_SHAPES 사전에서 조회.
//      개인화(퍼스널컬러 등)는 style_preference 구조화 슬롯(살균)으로만 반영.
//   3. spend_hearts(5) → dress_fittings row(mode=recommend, pending)
//   4. gpt-image 합성 → dress-results 업로드 → done (백그라운드, 202 즉시 반환)
//      — 기존 동기(200) 응답을 dewy-fitting 과 동일한 비동기 패턴으로 통일:
//        워커 월클럭 킬 시에도 reaper 가 환불하고, 클라는 어차피 결과 페이지에서 폴링.
//   5. 실패 시 환불
//
// 카탈로그 시뮬(dewy-fitting)과 다른 점: 참조 드레스 이미지 없음(사용자 사진 1장).

import { adminClient } from "../_shared/supabase.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  json,
  authenticateUser,
  downloadFromStorage,
  callImageEdit,
  makeJobFailureHandlers,
  spendHearts,
  runInBackground,
  precheckSourceImage,
  hasRecentPendingJob,
} from "../_shared/studioEdge.ts";
import { buildRecommendDressPrompt, sceneByCode, type SceneCode } from "../_shared/studio/fittingScenes.ts";
import {
  BODY_SHAPE_BY_VALUE,
  bodyShapeGuide,
  type BodyShape,
} from "../_shared/studio/bodyShapes.ts";
import { parseRetouchLevel } from "../_shared/studio/retouch.ts";
import {
  buildDressStyleAddendum,
  type StylePreferenceInput,
} from "../_shared/studio/stylePreference.ts";

const HEART_COST = 5;

interface RequestBody {
  source_image_path: string;
  body_shape: string;        // BODY_SHAPES 의 UPPER_SNAKE_CASE 코드
  scene_code: string;
  gender?: string;           // bride(기본) | groom
  retouch_level?: string;    // natural(기본) | studio | glam
  style_preference?: StylePreferenceInput; // 개인화 슬롯(서버 살균)
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const userId = await authenticateUser(req);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const supabaseAdmin = adminClient();

    const body = (await req.json()) as RequestBody;
    if (!body.source_image_path || !body.body_shape || !body.scene_code) {
      return json({ error: "Missing required fields" }, 400);
    }
    if (!body.source_image_path.startsWith(`${userId}/`)) {
      return json({ error: "invalid_source_image" }, 403);
    }
    if (!sceneByCode(body.scene_code as SceneCode)) {
      return json({ error: "unknown_scene" }, 400);
    }
    const shape = BODY_SHAPE_BY_VALUE[body.body_shape as BodyShape];
    if (!shape) return json({ error: "invalid_body_shape" }, 400);

    const gender = body.gender === "groom" ? "groom" as const : "bride" as const;
    const retouch = parseRetouchLevel(body.retouch_level);

    const prompt =
      buildRecommendDressPrompt(
        body.scene_code as SceneCode,
        shape.label,
        bodyShapeGuide(shape, gender),
        gender,
        { retouch },
      ) + buildDressStyleAddendum(body.style_preference);

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) return json({ error: "openai_not_configured" }, 500);

    // 이중 제출 가드(15초) + 결제 전 사진 품질 게이트(fail-open). 원본은 합성에 재사용.
    if (await hasRecentPendingJob(supabaseAdmin, "dress_fittings", userId)) {
      return json({ error: "duplicate_request" }, 409);
    }
    const sourceBlob = await downloadFromStorage(supabaseAdmin, "dress-uploads", body.source_image_path);
    const precheckFail = await precheckSourceImage(sourceBlob, Deno.env.get("GEMINI_API_KEY"));
    if (precheckFail) return json({ error: precheckFail }, 400);

    const spend = await spendHearts(supabaseAdmin, userId, HEART_COST, "dress_recommend");
    if (spend instanceof Response) return spend;

    const { markFailed, refund } = makeJobFailureHandlers({
      client: supabaseAdmin,
      table: "dress_fittings",
      userId,
      amount: HEART_COST,
      earnReason: "refund_failed_dress_recommend",
    });

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
          gender,
          retouch_level: retouch,
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

    const job = (async () => {
      try {
        // 원본은 품질 게이트 단계에서 이미 받아둠(sourceBlob) — 재다운로드 없음.
        const resultBlob = await callImageEdit({
          apiKey: OPENAI_API_KEY,
          prompt,
          size: "1024x1536",
          images: [{ blob: sourceBlob, name: "user.png" }],
        });

        const resultPath = `${userId}/${fittingId}.png`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from("dress-results")
          .upload(resultPath, resultBlob, { contentType: "image/png", upsert: true });
        if (uploadError) {
          await markFailed(fittingId, "upload_fail");
          await refund("upload_fail", fittingId);
          return;
        }

        await supabaseAdmin
          .from("dress_fittings")
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
    console.error("dewy-dress-recommend fatal:", error);
    return json({ error: "server_error" }, 500);
  }
});
