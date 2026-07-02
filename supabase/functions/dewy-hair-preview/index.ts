// 헤어 변형 미리보기 — 셀카 1장으로 (단일/스타일 9그리드/컬러 9그리드) 선택 생성.
// NANO BANANA 방식: 동일 인물(이목구비·골격·피부톤 고정), 헤어/컬러만 변경.
// 비동기 잡: processing 즉시 생성 → job_id 반환(202) → EdgeRuntime.waitUntil 로
// 선택 옵션을 병렬 생성 → hair_preview_jobs 갱신. 멈춘 잡은 reaper 가 환불.
//
// 입력: { source_path, options: ("single"|"style"|"color")[], single_style?: string }
// 가격: 옵션당 5하트, 계정당 첫 1회 50% 할인. 실패 옵션 비례 환불.

import { adminClient } from "../_shared/supabase.ts";
import { MODELS } from "../_shared/llm.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  type SubjectGender,
  parseGender,
  faceLock,
  identityLock,
  hairStyleGrid,
  hairColorGrid,
  hairCandidates,
  hairColorCandidates,
  hairRecommendRole,
  subjectFileName,
} from "../_shared/subjectPrompt.ts";
import { precheckSourceImage, hasRecentPendingJob } from "../_shared/studioEdge.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const PER = 5;
type Kind = "single" | "style" | "color";
const VALID: Kind[] = ["single", "style", "color"];

// 정체성 고정·헤어 어휘·9그리드 프롬프트는 성별 인지 공유 모듈(_shared/subjectPrompt)로 이관.
// 신부/신랑 분기를 여기서 하드코딩하지 않는다(체계화).

function singlePrompt(style: string, gender: SubjectGender) {
  const s = (style || (gender === "groom" ? "clean natural style" : "soft natural waves")).slice(0, 160);
  return (
    "Generate ONE image showing the SAME person with the chosen hairstyle from THREE angles, " +
    "side by side left to right: (1) FRONT view, (2) 45-degree SIDE view, (3) BACK view — so " +
    "the hairstyle is shown fully. Restyle ONLY the hair to: " + s + ". The hair must be " +
    "identical and consistent across all three views; label nothing." + faceLock(gender)
  );
}

// ── 추천: 업로드 사진 분석 → 어울리는 스타일/컬러 선택 (Gemini Flash 비전) ──
// 고정 9개를 모두에게 똑같이 찍던 것을 "얼굴 분석 기반 추천"으로 전환.
// 후보 목록·역할 프롬프트는 성별 인지 공유 모듈에서(신부/신랑 분기 단일 소스).
// label 은 영어 고정(이미지 프롬프트에 그대로 들어감), reason 은 한국어 설명.
type Reco = { summary: string; items: { label: string; reason: string }[] };

// 어울림 순 9개 선택. 실패/불완전(키 없음·응답오류·파싱실패)하면 null → 호출부가 고정목록 폴백.
async function recommend(
  imageBase64: string,
  mimeType: string,
  kind: "style" | "color",
  geminiKey: string,
  gender: SubjectGender,
): Promise<Reco | null> {
  const isColor = kind === "color";
  const candidates = isColor ? hairColorCandidates(gender) : hairCandidates(gender);
  const role = hairRecommendRole(gender, kind);
  const prompt =
    `${role}\n아래 후보 목록에서만 9개를 어울리는 순서대로 골라라(label 은 목록의 영어 표현을 그대로 사용).\n` +
    `후보: ${candidates.join(", ")}.\n` +
    `summary 는 분석 요약(한국어 1~2문장). 각 item 의 reason 은 이 인물에게 어울리는 이유(한국어 한 문장).`;
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.geminiFlash}:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
            ],
          }],
          generationConfig: {
            temperature: 0.2,
            response_mime_type: "application/json",
            response_schema: {
              type: "object",
              properties: {
                summary: { type: "string" },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { label: { type: "string" }, reason: { type: "string" } },
                    required: ["label", "reason"],
                  },
                },
              },
              required: ["summary", "items"],
            },
          },
        }),
      },
    );
    if (!resp.ok) { console.warn(`hair recommend ${kind} gemini`, resp.status); return null; }
    const data = await resp.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    const parsed = JSON.parse(text) as Partial<Reco>;
    const seen = new Set<string>();
    const items: { label: string; reason: string }[] = [];
    for (const it of parsed.items ?? []) {
      // 후보 목록 안의 label 만 채택(렌더 불가능한 임의 문자열 차단) + 중복 제거.
      if (!it || typeof it.label !== "string" || !candidates.includes(it.label) || seen.has(it.label)) continue;
      seen.add(it.label);
      items.push({ label: it.label, reason: typeof it.reason === "string" ? it.reason : "" });
    }
    if (items.length === 0) return null; // 유효 추천이 0개면 폴백
    // 9칸 그리드 보장: 모자라면 남은 후보로 채움(어울림 순서는 유지).
    for (const c of candidates) {
      if (items.length >= 9) break;
      if (!seen.has(c)) { seen.add(c); items.push({ label: c, reason: "" }); }
    }
    return { summary: typeof parsed.summary === "string" ? parsed.summary : "", items: items.slice(0, 9) };
  } catch (e) {
    console.warn(`hair recommend ${kind} fail`, e);
    return null;
  }
}

// 추천 결과(어울림 순)로 9그리드 프롬프트를 동적 생성.
function gridPrompt(kind: "style" | "color", items: { label: string }[], gender: SubjectGender): string {
  const ordered = items.slice(0, 9).map((it, i) => `${i + 1}) ${it.label}`).join(", ");
  const what = kind === "color" ? "hair color" : "hairstyle";
  return (
    "Generate a 3x3 grid (9 cells) of ultra-realistic portrait photos of the SAME person " +
    `with different ${what}s, one per cell in this exact order (left-to-right, top-to-bottom): ` +
    ordered + `. Only change the ${what} in each cell, keep perfect facial consistency across all nine.` +
    identityLock(gender)
  );
}

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function base64ToBlob(b64: string, contentType: string): Blob {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: contentType });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const admin = adminClient();

    const body = (await req.json()) as { source_path?: string; options?: string[]; single_style?: string; gender?: string };
    const sourcePath = body.source_path;
    if (!sourcePath || !sourcePath.startsWith(`${userId}/`)) return json({ error: "invalid_source_path" }, 403);
    const options = Array.from(new Set((body.options ?? []).filter((o): o is Kind => VALID.includes(o as Kind))));
    if (options.length === 0) return json({ error: "no_options" }, 400);
    const singleStyle = (body.single_style ?? "").toString();
    // 성별(신부/신랑) — 프론트가 내 role 기준으로 전달. 없으면 신부 기본(기존 동작·회귀 0).
    const gender = parseGender(body.gender);

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) return json({ error: "openai_not_configured" }, 500);

    // 이중 제출 가드(15초) + 결제 전 사진 품질 게이트(fail-open). 원본은 잡에서 재사용.
    if (await hasRecentPendingJob(admin, "hair_preview_jobs", userId)) {
      return json({ error: "duplicate_request" }, 409);
    }
    const { data: sourceBlob } = await admin.storage.from("invitation-uploads").download(sourcePath);
    if (!sourceBlob) return json({ error: "source_download_failed" }, 400);
    const precheckFail = await precheckSourceImage(sourceBlob, Deno.env.get("GEMINI_API_KEY"));
    if (precheckFail) return json({ error: precheckFail }, 400);

    const { data: usageRow } = await admin
      .from("hair_preview_usage").select("used_count").eq("user_id", userId).maybeSingle();
    const usedCount = usageRow?.used_count ?? 0;
    const discounted = usedCount === 0;
    const baseCost = options.length * PER;
    const finalCost = discounted ? Math.round(baseCost / 2) : baseCost;

    const { data: spendData, error: spendError } = await admin.rpc("spend_hearts", {
      p_user_id: userId, p_amount: finalCost, p_reason: "hair_preview",
    });
    const spendRow = Array.isArray(spendData) ? spendData[0] : spendData;
    if (spendError) return json({ error: "hearts_error" }, 500);
    if (!spendRow?.success) return json({ error: "insufficient_hearts", required: finalCost }, 402);

    const refund = async (amount: number) => {
      if (amount > 0) await admin.rpc("earn_hearts", { p_user_id: userId, p_amount: amount, p_reason: "hair_preview_refund" });
    };

    const { data: jobRow, error: jobErr } = await admin
      .from("hair_preview_jobs")
      .insert({ user_id: userId, status: "processing", source_path: sourcePath, options, single_style: singleStyle, results: [], charged: finalCost, discounted })
      .select("id").single();
    if (jobErr || !jobRow) { await refund(finalCost); return json({ error: "job_insert_failed" }, 500); }
    const jobId = jobRow.id as string;

    const finish = async (patch: Record<string, unknown>) => {
      await admin.from("hair_preview_jobs").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", jobId);
    };

    const job = (async () => {
      try {
        // 원본은 품질 게이트 단계에서 이미 받아둠(sourceBlob) — 재다운로드 없음.
        const blob = sourceBlob;

        // 업로드 사진 분석에 쓸 base64(스타일/컬러 추천용). Gemini 키 없으면 추천 생략→고정목록.
        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
        const srcBase64 = base64Encode(await blob.arrayBuffer());
        const srcMime = blob.type || "image/png";

        const results: { kind: Kind; path: string; recommendation?: Reco }[] = [];
        const genOne = async (kind: Kind) => {
          try {
            // single 은 사용자가 고른 단일 스타일. style/color 는 얼굴 분석 기반 추천(실패 시 고정목록).
            let prompt: string;
            let recommendation: Reco | null = null;
            if (kind === "single") {
              prompt = singlePrompt(singleStyle, gender);
            } else {
              recommendation = GEMINI_API_KEY
                ? await recommend(srcBase64, srcMime, kind, GEMINI_API_KEY, gender)
                : null;
              prompt = recommendation
                ? gridPrompt(kind, recommendation.items, gender)
                : (kind === "style" ? hairStyleGrid(gender) : hairColorGrid(gender));
            }
            const form = new FormData();
            form.append("model", MODELS.image);
            form.append("prompt", prompt);
            form.append("size", kind === "single" ? "1536x1024" : "1024x1536");
            form.append("quality", "medium");
            form.append("n", "1");
            form.append("image[]", blob, subjectFileName(gender));
            const res = await fetch("https://api.openai.com/v1/images/edits", {
              method: "POST", headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }, body: form,
            });
            if (!res.ok) { console.error(`hair ${kind} openai`, res.status, (await res.text()).slice(0, 160)); return; }
            const d = (await res.json()) as { data: { b64_json?: string; url?: string }[] };
            const item = d.data?.[0];
            if (!item) return;
            const outBlob = item.b64_json ? base64ToBlob(item.b64_json, "image/png") : await (await fetch(item.url!)).blob();
            const outPath = `${userId}/hair/${kind}-${crypto.randomUUID()}.png`;
            const { error: upErr } = await admin.storage.from("invitation-uploads").upload(outPath, outBlob, { contentType: "image/png", upsert: false });
            if (upErr) return;
            results.push(recommendation ? { kind, path: outPath, recommendation } : { kind, path: outPath });
          } catch (e) { console.error(`hair ${kind} fail`, e); }
        };
        // 옵션 병렬(각 1장) → wall-clock ≈ 가장 느린 옵션
        await Promise.all(options.map((o) => genOne(o as Kind)));

        const ok = results.length;
        const failed = options.length - ok;
        const refundAmt = failed > 0 ? (ok === 0 ? finalCost : Math.round((failed / options.length) * finalCost)) : 0;
        await refund(refundAmt);
        if (ok === 0) { await finish({ status: "failed", error: "all_failed", charged: 0 }); return; }
        await finish({ status: "completed", results, charged: finalCost - refundAmt });
        await admin.from("hair_preview_usage").upsert(
          { user_id: userId, used_count: usedCount + 1, updated_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
      } catch (e) {
        console.error("hair job error:", e);
        await refund(finalCost);
        await finish({ status: "failed", error: "server_error", charged: 0 });
      }
    })();

    // @ts-ignore
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) { /* @ts-ignore */ EdgeRuntime.waitUntil(job); } else { await job; }

    return json({ job_id: jobId, status: "processing", charged: finalCost, discounted }, 202);
  } catch (e) {
    console.error("dewy-hair-preview fatal:", e);
    return json({ error: "server_error" }, 500);
  }
});
