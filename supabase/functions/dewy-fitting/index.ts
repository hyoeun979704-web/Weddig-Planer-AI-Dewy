// 방구석 드레스 투어 — AI 합성 Edge Function
//
// 흐름:
//   1. 인증 검증
//   2. 입력 검증 (source_image_path, scene_code + 모드별 파라미터)
//   3. 프롬프트 서버 조립 — 클라이언트 prompt 는 받지 않는다(신뢰 경계).
//      · 카탈로그: dress_sample_id → dress_samples 메타를 서버가 조회해 묘사 직렬화
//      · 맞춤: custom_dress(enum 속성 객체) → describeDress 로 직렬화(사전 기반 = 주입 불가)
//      · 신랑: suit_text(살균·300자 제한) → SUIT SCHEMA 슬롯에만 주입
//   4. spend_hearts(5) 차감 → dress_fittings row 생성(pending)
//   5. gpt-image 합성 → dress-results 업로드 → status=done (백그라운드, 202 즉시 반환)
//   6. 실패 시 earn_hearts 환불 + status=refunded
//
// 보안: 본인 사진 source_image_path 는 dress-uploads/{userId}/ 폴더 검증.
// v1 호환: 구 클라이언트가 보내는 body.prompt 는 무시된다(서버 조립만 신뢰).

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
} from "../_shared/studioEdge.ts";
import { buildFittingPrompt, sceneByCode, type SceneCode } from "../_shared/studio/fittingScenes.ts";
import { SHOT_TYPES, type ShotType } from "../_shared/studio/shotTypes.ts";
import { describeDress, type DressMetadata } from "../_shared/studio/dressDescription.ts";
import { parseRetouchLevel } from "../_shared/studio/retouch.ts";
import { cleanSuitText } from "../_shared/studio/stylePreference.ts";

const HEART_COST = 5;

interface RequestBody {
  source_image_path: string; // dress-uploads/{userId}/xxx.jpg
  scene_code: string;
  shot_type?: string;        // full | bust | closeup (기본 full)
  gender?: string;           // bride(기본) | groom
  retouch_level?: string;    // natural(기본) | studio | glam
  dress_sample_id?: string;  // 카탈로그 모드(신부)
  custom_dress?: DressMetadata; // 맞춤 모드(신부) — enum 속성만 유효(사전 기반 직렬화)
  suit_text?: string;        // 신랑 예복 자유 텍스트(살균됨)
}

// dress_samples 메타 컬럼 — 프롬프트 묘사 직렬화 대상(클라 fetchDressMeta 와 동일 집합).
const DRESS_META_COLS =
  "name, silhouette, neckline, sleeve, length, fabric, details, back_design, color, waist, mood";

function parseShotType(v: unknown): ShotType {
  return SHOT_TYPES.some((s) => s.value === v) ? (v as ShotType) : "full";
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
    if (!body.source_image_path || !body.scene_code) {
      return json({ error: "Missing required fields" }, 400);
    }
    if (!body.source_image_path.startsWith(`${userId}/`)) {
      return json({ error: "invalid_source_image" }, 403);
    }
    if (!sceneByCode(body.scene_code as SceneCode)) {
      return json({ error: "unknown_scene" }, 400);
    }
    const sceneCode = body.scene_code as SceneCode;
    const shotType = parseShotType(body.shot_type);
    const gender = body.gender === "groom" ? "groom" as const : "bride" as const;
    const retouch = parseRetouchLevel(body.retouch_level);

    // 카탈로그 모드: 드레스 샘플 조회(레퍼런스 이미지 + 메타 → 서버 프롬프트 조립).
    let dress: { id: string; image_url: string } | null = null;
    let dressDescription = "";
    let custom = true;
    if (gender === "groom") {
      dressDescription = cleanSuitText(body.suit_text) ||
        "a classic well-fitted wedding suit, notch lapel, slim fit, navy or black";
    } else if (body.dress_sample_id) {
      const { data: d, error: dressError } = await supabaseAdmin
        .from("dress_samples")
        .select(`id, image_url, is_active, ${DRESS_META_COLS}`)
        .eq("id", body.dress_sample_id)
        .single();
      if (dressError || !d || !d.is_active) {
        return json({ error: "dress_not_found" }, 404);
      }
      dress = { id: d.id as string, image_url: d.image_url as string };
      dressDescription = describeDress(d as DressMetadata);
      custom = false;
    } else {
      // 맞춤 모드 — enum 속성 객체만 신뢰(사전에 없는 값은 describeDress 가 무시).
      dressDescription = describeDress(body.custom_dress ?? {}) ||
        "- An elegant Korean bridal wedding gown appropriate for the venue.";
    }

    const prompt = buildFittingPrompt(sceneCode, dressDescription, {
      custom,
      shotType,
      gender,
      retouch,
    });

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) return json({ error: "openai_not_configured" }, 500);

    // 이중 제출 가드(15초) — 하트 차감 전 검사(이중 차감 방지). fail-open.
    if (await hasRecentPendingJob(supabaseAdmin, "dress_fittings", userId)) {
      return json({ error: "duplicate_request" }, 409);
    }

    // 결제 전 사진 품질 게이트 — 명백한 무효 사진(얼굴 없음/다인/완전 가림)만 반려.
    // fail-open(키 없음·게이트 장애 시 통과) + 다운로드한 원본은 합성 단계에서 재사용.
    const sourceBlob = await downloadFromStorage(supabaseAdmin, "dress-uploads", body.source_image_path);
    const precheckFail = await precheckSourceImage(sourceBlob, Deno.env.get("GEMINI_API_KEY"));
    if (precheckFail) return json({ error: precheckFail }, 400);

    // 하트 차감
    const spend = await spendHearts(supabaseAdmin, userId, HEART_COST, "dress_fitting");
    if (spend instanceof Response) return spend;

    const { markFailed, refund } = makeJobFailureHandlers({
      client: supabaseAdmin,
      table: "dress_fittings",
      userId,
      amount: HEART_COST,
      earnReason: "refund_failed_generation",
    });

    // dress_fittings row 생성
    const { data: fitting, error: insertError } = await supabaseAdmin
      .from("dress_fittings")
      .insert({
        user_id: userId,
        source_image_path: body.source_image_path,
        selected_sample_id: dress?.id ?? null,
        prompt_params: {
          scene_code: sceneCode,
          shot_type: shotType,
          gender,
          retouch_level: retouch,
          mode: gender === "groom" ? "suit" : custom ? "custom" : "catalog",
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
        const dressImgBlob = dress ? await downloadFromUrl(dress.image_url) : null;

        const images = [{ blob: sourceBlob, name: "user.png" }];
        if (dressImgBlob) images.push({ blob: dressImgBlob, name: "dress.png" });

        const resultBlob = await callImageEdit({
          apiKey: OPENAI_API_KEY,
          prompt,
          size: "1024x1536",
          images,
        });

        const resultPath = `${userId}/${fittingId}.png`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from("dress-results")
          .upload(resultPath, resultBlob, { contentType: "image/png", upsert: true });
        if (uploadError) {
          console.error("upload error:", uploadError);
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
    console.error("dewy-fitting fatal:", error);
    return json({ error: "server_error" }, 500);
  }
});
