// 스드메 미리보기 — 장소+메이크업+헤어+드레스 합본 AI 합성 Edge Function.
//
// dewy-fitting 과 동일 골격(공용: _shared/studioEdge.ts). 차이: 10하트, sdm_previews
// 테이블, reference_mode 에 따라 드레스 레퍼런스 이미지 첨부 여부 결정.
//
// 프롬프트 서버 조립(신뢰 경계) — 클라이언트 prompt 는 받지 않는다:
//   · 드레스: dress_sample_id → 메타 서버 조회 / custom_dress(enum 객체) / 신랑 suit_text(살균)
//   · 메이크업: custom_makeup(enum 객체) → describeMakeup(사전 기반)
//   · 헤어: hair_style 은 성별별 허용 목록(sdmHairStyles)만 통과
//   · 보정 강도: retouch_level (natural/studio/glam)

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
} from "../_shared/studioEdge.ts";
import { sceneByCode, type SceneCode } from "../_shared/studio/fittingScenes.ts";
import { buildSdmPrompt, sdmHairStyles, type SdmReferenceMode } from "../_shared/studio/sdmPrompt.ts";
import { SHOT_TYPES, type ShotType } from "../_shared/studio/shotTypes.ts";
import { describeDress, type DressMetadata } from "../_shared/studio/dressDescription.ts";
import { describeMakeup, type MakeupMetadata } from "../_shared/studio/makeupDescription.ts";
import { parseRetouchLevel } from "../_shared/studio/retouch.ts";
import { cleanSuitText } from "../_shared/studio/stylePreference.ts";

const HEART_COST = 10;

interface RequestBody {
  source_image_path: string;   // sdm-uploads/{userId}/xxx
  scene_code: string;
  hair_style: string;          // sdmHairStyles(gender) 의 value 만 허용
  shot_type?: string;          // full | bust | closeup
  reference_mode?: string;     // image | text
  gender?: string;             // bride(기본) | groom
  retouch_level?: string;      // natural(기본) | studio | glam
  makeup_summary?: string;     // 추적용(ko 요약) — 프롬프트에 미사용
  dress_sample_id?: string;    // 카탈로그(신부)
  custom_dress?: DressMetadata;   // 맞춤(신부)
  custom_makeup?: MakeupMetadata; // 메이크업 속성(신부)
  suit_text?: string;          // 신랑 예복 자유 텍스트(살균)
}

const DRESS_META_COLS =
  "name, silhouette, neckline, sleeve, length, fabric, details, back_design, color, waist, mood";

function parseShotType(v: unknown): ShotType {
  return SHOT_TYPES.some((s) => s.value === v) ? (v as ShotType) : "full";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const userId = await authenticateUser(req);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const supabaseAdmin = adminClient();

    const body = (await req.json()) as RequestBody;
    if (!body.source_image_path || !body.scene_code || !body.hair_style) {
      return json({ error: "Missing required fields" }, 400);
    }
    // 본인 폴더 검증(RLS 보강)
    if (!body.source_image_path.startsWith(`${userId}/`)) {
      return json({ error: "invalid_source_image" }, 403);
    }
    if (!sceneByCode(body.scene_code as SceneCode)) {
      return json({ error: "unknown_scene" }, 400);
    }
    const gender = body.gender === "groom" ? "groom" as const : "bride" as const;
    // 헤어는 성별별 허용 목록만 통과(임의 문자열 주입 차단). 신부/신랑 목록 교차 허용은
    // 하지 않는다 — 프론트가 항상 같은 목록에서 고르므로 미스매치는 곧 조작 신호.
    if (!sdmHairStyles(gender).some((h) => h.value === body.hair_style)) {
      return json({ error: "invalid_hair_style" }, 400);
    }
    const shotType = parseShotType(body.shot_type);
    const referenceMode: SdmReferenceMode = body.reference_mode === "text" ? "text" : "image";
    const retouch = parseRetouchLevel(body.retouch_level);

    // 드레스/예복 묘사 — 서버 조립.
    let dress: { id: string; image_url: string } | null = null;
    let dressDescription = "";
    let dressLength: string | null = null;
    let dressCustom = true;
    if (gender === "groom") {
      dressDescription = cleanSuitText(body.suit_text) ||
        "a classic well-fitted Korean wedding suit, notch lapel, navy or black";
    } else if (body.dress_sample_id) {
      const { data: d, error: dErr } = await supabaseAdmin
        .from("dress_samples")
        .select(`id, image_url, is_active, ${DRESS_META_COLS}`)
        .eq("id", body.dress_sample_id)
        .single();
      if (dErr || !d || !d.is_active) return json({ error: "dress_not_found" }, 404);
      dress = { id: d.id as string, image_url: d.image_url as string };
      dressDescription = describeDress(d as DressMetadata);
      dressLength = (d.length as string | null) ?? null;
      dressCustom = false;
    } else {
      const custom = body.custom_dress ?? {};
      dressDescription = describeDress(custom);
      dressLength = (custom.length as string | null) ?? null;
    }

    const makeupDescription = gender === "groom" ? "" : describeMakeup(body.custom_makeup ?? {});

    const prompt = buildSdmPrompt({
      sceneCode: body.scene_code as SceneCode,
      makeupDescription,
      hairStyle: body.hair_style,
      dressDescription,
      dressCustom,
      dressLength,
      shotType,
      referenceMode: gender === "groom" ? "text" : referenceMode,
      gender,
      retouch,
    });

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) return json({ error: "openai_not_configured" }, 500);

    // 하트 차감
    const spend = await spendHearts(supabaseAdmin, userId, HEART_COST, "sdm_preview");
    if (spend instanceof Response) return spend;

    const { markFailed, refund } = makeJobFailureHandlers({
      client: supabaseAdmin,
      table: "sdm_previews",
      userId,
      amount: HEART_COST,
      earnReason: "refund_failed_generation",
    });

    // 카탈로그 드레스 + image 모드일 때만 드레스 레퍼런스 이미지 첨부.
    const attachDressImage = !!dress && referenceMode === "image" && gender === "bride";

    // row 생성
    const { data: row, error: insertError } = await supabaseAdmin
      .from("sdm_previews")
      .insert({
        user_id: userId,
        source_image_path: body.source_image_path,
        selected_dress_id: dress?.id ?? null,
        prompt_params: {
          scene_code: body.scene_code,
          hair_style: body.hair_style,
          makeup_summary: body.makeup_summary?.slice(0, 200) ?? null,
          shot_type: shotType,
          reference_mode: referenceMode,
          gender,
          retouch_level: retouch,
        },
        hearts_spent: HEART_COST,
        status: "pending",
      })
      .select("id")
      .single();
    if (insertError || !row) {
      await refund("row_insert_fail");
      return json({ error: "insert_fail" }, 500);
    }
    const previewId = row.id as string;

    const jobRun = (async () => {
      try {
        const [userImgBlob, dressImgBlob] = await Promise.all([
          downloadFromStorage(supabaseAdmin, "sdm-uploads", body.source_image_path),
          attachDressImage && dress ? downloadFromUrl(dress.image_url) : Promise.resolve(null),
        ]);

        const images = [{ blob: userImgBlob, name: "user.png" }];
        if (dressImgBlob) images.push({ blob: dressImgBlob, name: "dress.png" });

        // quality: high 는 지연 과다(실사용 피드백) → medium 유지.
        const resultBlob = await callImageEdit({
          apiKey: OPENAI_API_KEY,
          prompt,
          size: "1024x1536",
          images,
        });

        const resultPath = `${userId}/${previewId}.png`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from("sdm-results")
          .upload(resultPath, resultBlob, { contentType: "image/png", upsert: true });
        if (uploadError) {
          console.error("upload error:", uploadError);
          await markFailed(previewId, "upload_fail");
          await refund("upload_fail", previewId);
          return;
        }
        await supabaseAdmin
          .from("sdm_previews")
          .update({ status: "done", result_image_path: resultPath, updated_at: new Date().toISOString() })
          .eq("id", previewId);
      } catch (innerError) {
        console.error("inner error:", innerError);
        const reason = innerError instanceof Error ? innerError.message : "inner_error";
        await markFailed(previewId, reason);
        await refund(reason, previewId);
      }
    })();

    await runInBackground(jobRun);

    return json({ preview_id: previewId, status: "pending", balance_after: spend.balanceAfter }, 202);
  } catch (error) {
    console.error("dewy-sdm fatal:", error);
    return json({ error: "server_error" }, 500);
  }
});
