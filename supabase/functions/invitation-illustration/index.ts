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

import { adminClient } from "../_shared/supabase.ts";
import { MODELS } from "../_shared/llm.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


// DALL-E용 약도 동적 한글 프롬프트 생성 함수
function buildMapPrompt(
  tone?: string,
  name?: string,
  hint?: string,
  bgColor?: string
): string {
  let basePrompt =
    "이 지도 캡처 이미지를 청첩장에 어울리는 깔끔하고 정갈한 손그림 느낌의 약도 일러스트로 변환해 주세요. " +
    "도로, 주요 랜드마크, 목적지 마커의 위치와 레이아웃은 원본 이미지와 똑같이 유지해야 합니다. " +
    "지도의 검색바, 버튼, 로고, 광고, 불필요한 핀 표시, 그리고 실사 사진 노이즈는 모두 제거해 주세요. " +
    "도로는 단순하고 명확한 선으로 그리고, 지하철역이나 주요 건물 등의 한국어 이름 레이블은 원본의 한글 명칭 그대로 정확하고 읽기 쉽게 표현해 주세요.";

  const normalizedTone = (tone ?? "").toUpperCase();
  let styleDetail = "";

  if (normalizedTone === "CLASSIC" || normalizedTone === "LUXURY") {
    styleDetail =
      " 스타일은 클래식하고 고급스러운 청첩장 디자인에 맞춰야 합니다. 차분하고 우아한 짙은 차콜색 선을 사용하고, 한국어 레이블에는 우아한 Serif 서체 느낌을 적용해 주세요. 정돈되고 품격 있는 라인아트 스타일이어야 합니다.";
  } else if (normalizedTone === "MODERN" || normalizedTone === "MINIMAL") {
    styleDetail =
      " 스타일은 극도로 미니멀하고 현대적인 느낌이어야 합니다. 선명하고 얇은 검은색 단색 선과 깔끔한 Sans-serif(고딕) 서체 느낌의 한국어 레이블을 사용하고, 그라데이션이나 그림자 없이 평면적(Flat)으로 그려주세요. 흑백 혹은 모노톤의 정갈한 그래픽이어야 합니다.";
  } else if (normalizedTone === "ROMANTIC" || normalizedTone === "CUTE") {
    styleDetail =
      " 스타일은 따뜻하고 사랑스러운 느낌이어야 합니다. 부드럽고 자연스러운 손그림 선을 사용하고, 파스텔 톤(예: 연한 핑크, 피치, 베이지)의 포인트 색상을 가미해 주세요. 친근하고 아기자기한 서체 느낌의 한글 레이블을 사용해 주세요.";
  } else {
    styleDetail =
      " 스타일은 군더더기 없이 깔끔한 손그림 일러스트 스타일로, 중성적인 파스텔 톤과 단순한 선을 사용해 인쇄물에 적합하도록 정제된 스타일로 표현해 주세요.";
  }

  basePrompt += styleDetail;

  if (bgColor) {
    basePrompt += ` 약도의 배경은 단색인 ${bgColor} 색상으로 완전히 평평하게 채워서 청첩장 디자인과 자연스럽게 어우러지도록 해주세요.`;
  } else {
    basePrompt += " 배경은 깨끗하고 평평한 흰색(Solid White) 또는 부드러운 아이보리 단색으로 처리해 주세요.";
  }

  if (hint) {
    basePrompt += ` 다음 디자인 컨셉을 적극 반영해 주세요: ${hint}.`;
  }

  return basePrompt;
}

// DALL-E용 인물 일러스트 동적 한글 프롬프트 생성 함수
function buildPortraitPrompt(
  tone?: string,
  hint?: string
): string {
  let basePrompt =
    "이 인물 사진을 세련된 웨딩 청첩장에 어울리는 웨딩 일러스트로 변환해 주세요. " +
    "인물의 구도, 포즈, 이목구비와 특징은 원본 사진을 알아볼 수 있도록 그대로 유지해야 합니다. " +
    "사진 고유의 거친 디지털 노이즈와 너무 강한 대비의 그림자는 제거해 주세요. ";

  const normalizedTone = (tone ?? "").toUpperCase();
  let styleDetail = "";

  if (normalizedTone === "CLASSIC" || normalizedTone === "LUXURY" || normalizedTone === "ROMANTIC") {
    styleDetail =
      "부드럽고 낭만적인 느낌의 섬세한 수채화(Watercolor) 기법을 사용하여, 연한 파스텔 톤의 색감과 가벼운 붓 터치 질감, 맑고 투명한 라인으로 표현해 주세요. 배경은 은은하게 물감이 번진 듯한 느낌이나 단색으로 처리해 주세요.";
  } else if (normalizedTone === "MODERN" || normalizedTone === "MINIMAL") {
    styleDetail =
      "현대적이고 미니멀한 벡터 일러스트(Vector illustration) 스타일로 변환해 주세요. 깔끔한 드로잉 선과 평평한 단색 면 처리, 차분한 뮤트 톤의 색감을 사용하고 명암은 최소한으로 단순화해 주세요. 배경은 깔끔한 단색이어야 합니다.";
  } else {
    styleDetail =
      "은은하고 부드러운 웨딩 일러스트 스타일에 연한 파스텔 톤의 색조, 정갈한 손그림 선을 접목하여 인쇄 및 모바일 화면에 어울리도록 정제해서 표현해 주세요. 배경은 단순하고 부드러운 단색이어야 합니다.";
  }

  basePrompt += styleDetail;

  if (hint) {
    basePrompt += ` 디자인 컨셉 가이드라인: ${hint}.`;
  }

  return basePrompt;
}

// style='map' 일러스트는 호출당 정가 차감 (반복 가능한 부가기능).
const MAP_HEART_COST = 3;

// 남용 방지 상한 — portrait 는 호출 시점에 과금하지 않으므로 (발행 시 일괄 차감)
// 무제한 입력을 허용하면 무료 이미지 변환 API 로 악용될 수 있다.
const MAX_SOURCE_PATHS = 10;
const MAX_HINT_LENGTH = 300;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;

interface RequestBody {
  /** invitation-uploads 안 본인 폴더의 사진 경로들 */
  source_paths: string[];
  /** 변환 스타일 — 기본 portrait(사진→수채화), map(지도→약도) */
  style?: "portrait" | "map";
  template_tone?: string;
  template_name?: string;
  text_prompt_hint?: string;
  bg_color?: string;
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

    const supabaseAdmin = adminClient();

    // ───────── 입력 검증 ─────────
    const body = (await req.json()) as RequestBody;
    if (!Array.isArray(body.source_paths) || body.source_paths.length === 0) {
      return json({ error: "Missing source_paths" }, 400);
    }
    if (body.source_paths.length > MAX_SOURCE_PATHS) {
      return json({ error: "too_many_source_paths" }, 400);
    }
    for (const p of body.source_paths) {
      if (typeof p !== "string" || !p.startsWith(`${userId}/`)) {
        return json({ error: "invalid_source_path" }, 403);
      }
    }
    const uniquePaths = Array.from(new Set(body.source_paths));
    const style = body.style === "map" ? "map" : "portrait";
    // 프롬프트에 합쳐지는 클라이언트 문자열은 길이·형식을 강제 (프롬프트 부풀리기/주입 축소)
    const hint = typeof body.text_prompt_hint === "string"
      ? body.text_prompt_hint.slice(0, MAX_HINT_LENGTH)
      : undefined;
    const bgColor =
      typeof body.bg_color === "string" && HEX_COLOR_RE.test(body.bg_color)
        ? body.bg_color
        : undefined;
    const prompt = style === "map"
      ? buildMapPrompt(body.template_tone, body.template_name, hint, bgColor)
      : buildPortraitPrompt(body.template_tone, hint);

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
