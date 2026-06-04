// 2026 웨딩컨설팅 — 신부 사진 Vision 분석 → 섹션별 구조화 JSON.
//
// 하이브리드: 여기서는 "분석(텍스트/컬러)"만 생성하고, A4 리포트 렌더링은
// 클라이언트(정확한 한글·컬러휠·swatch)가 담당. 생성형 이미지로 차트를 그리지
// 않아 글자·수치가 정확함.
//
// 입력: { source_path, sections: ("personal_color"|"hair"|"makeup"|"dress")[] }
// 가격: 섹션당 10하트, 4섹션(종합) 30하트. 계정당 첫 1회 50% 할인(반올림).
// 출력: { analysis, report_id, charged, discounted }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALL_SECTIONS = ["personal_color", "hair", "makeup", "dress"] as const;
type Section = (typeof ALL_SECTIONS)[number];

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function costOf(n: number): number {
  return n >= 4 ? 30 : n * 10;
}

const SCHEMA_GUIDE = `\n요청된 섹션만 포함해 아래 JSON 구조로만 응답(설명·마크다운 금지):
{
  "summary": "전체 한 줄 요약",
  "personal_color": {
    "season": "예: 봄 웜 라이트",
    "undertone": "웜/쿨/뉴트럴 중",
    "best_colors": [{"name":"코랄","hex":"#FF7F6E"}],  // 6개
    "worst_colors": [{"name":"","hex":"#"}],            // 4개
    "best_hair_color": {"name":"","hex":"#"},
    "best_lens_color": {"name":"","hex":"#"},
    "best_makeup": {"lip":{"name":"","hex":"#"},"cheek":{"name":"","hex":"#"},"eye":{"name":"","hex":"#"}},
    "best_dress": {"name":"","hex":"#"}
  },
  "hair": {
    "analysis": "현재 헤어(길이·결·분량) 분석",
    "recommendations": [{"style":"","why":""}],          // 3개
    "color": {"name":"","hex":"#"},
    "extension_zones": "붙임머리·부분가발로 커버 가능한 구간 설명"
  },
  "makeup": {
    "by_venue": [{"venue":"실내 홀","look":"","colors":[{"name":"","hex":"#"}]}],  // 홀/야외/스튜디오 3개
    "by_area": [{"area":"립","desc":"","colors":[{"name":"","hex":"#"}]}]            // 립/치크/아이/베이스
  },
  "dress": {
    "by_venue": [{"venue":"","silhouette":"","fabric":"","why":""}],     // 홀/야외/스튜디오
    "by_material": [{"material":"","desc":""}],
    "bouquet": [{"venue":"","flowers":"","colors":[{"name":"","hex":"#"}]}]
  }
}`;

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

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = (await req.json()) as { source_path?: string; sections?: string[] };
    const sourcePath = body.source_path;
    if (!sourcePath || !sourcePath.startsWith(`${userId}/`)) {
      return json({ error: "invalid_source_path" }, 403);
    }
    const sections = (body.sections ?? []).filter((s): s is Section =>
      (ALL_SECTIONS as readonly string[]).includes(s),
    );
    if (sections.length === 0) return json({ error: "no_sections" }, 400);

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) return json({ error: "openai_not_configured" }, 500);
    const MODEL = Deno.env.get("OPENAI_CONSULT_MODEL") ?? "gpt-4o";

    // 첫 1회 50% 할인(계정당)
    const { data: usageRow } = await admin
      .from("wedding_consulting_usage").select("used_count").eq("user_id", userId).maybeSingle();
    const usedCount = usageRow?.used_count ?? 0;
    const discounted = usedCount === 0;
    const base = costOf(sections.length);
    const finalCost = discounted ? Math.round(base / 2) : base;

    const { data: spendData, error: spendError } = await admin.rpc("spend_hearts", {
      p_user_id: userId, p_amount: finalCost, p_reason: "wedding_consulting",
    });
    const spendRow = Array.isArray(spendData) ? spendData[0] : spendData;
    if (spendError) return json({ error: "hearts_error" }, 500);
    if (!spendRow?.success) return json({ error: "insufficient_hearts", required: finalCost }, 402);

    const refund = async () => {
      await admin.rpc("earn_hearts", { p_user_id: userId, p_amount: finalCost, p_reason: "wedding_consulting_refund" });
    };

    try {
      // 사진 다운로드 → data URL
      const { data: blob, error: dlErr } = await admin.storage.from("invitation-uploads").download(sourcePath);
      if (dlErr || !blob) { await refund(); return json({ error: "source_download_failed" }, 502); }
      const buf = new Uint8Array(await blob.arrayBuffer());
      let bin = ""; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      const dataUrl = `data:${blob.type || "image/png"};base64,${btoa(bin)}`;

      const sysPrompt =
        "당신은 한국 웨딩 퍼스널컬러·헤어·메이크업·드레스 전문 컨설턴트입니다. " +
        "신부 사진의 피부 언더톤·명도·얼굴형·현재 헤어를 관찰해 맞춤 제안을 합니다. " +
        "모든 값은 한국어, 색은 hex 로. 의료·진단 단정이 아닌 스타일링 제안 수준으로. " +
        "반드시 요청된 섹션 키만 포함한 유효한 JSON 객체만 출력.";
      const userPrompt = `요청 섹션: ${sections.join(", ")}.` + SCHEMA_GUIDE;

      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.6,
          max_tokens: 2200,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: sysPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: userPrompt },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
        }),
      });
      if (!aiRes.ok) {
        console.error(`OpenAI ${aiRes.status}:`, (await aiRes.text()).slice(0, 300));
        await refund();
        return json({ error: "analysis_failed" }, 502);
      }
      const aiData = await aiRes.json();
      const content = aiData?.choices?.[0]?.message?.content;
      if (!content) { await refund(); return json({ error: "analysis_failed" }, 502); }
      let analysis: unknown;
      try { analysis = JSON.parse(content); }
      catch { await refund(); return json({ error: "analysis_parse_failed" }, 502); }

      const { data: rep } = await admin
        .from("wedding_consulting_reports")
        .insert({ user_id: userId, sections, analysis })
        .select("id").single();

      await admin.from("wedding_consulting_usage").upsert(
        { user_id: userId, used_count: usedCount + 1, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );

      return json({ analysis, report_id: rep?.id ?? null, charged: finalCost, discounted }, 200);
    } catch (e) {
      console.error("consulting error:", e);
      await refund();
      return json({ error: "analysis_failed" }, 502);
    }
  } catch (e) {
    console.error("wedding-consulting fatal:", e);
    return json({ error: "server_error" }, 500);
  }
});
