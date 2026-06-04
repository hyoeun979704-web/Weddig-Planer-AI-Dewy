// 2026 웨딩컨설팅 — 신부 사진 분석 + 페이지별 매거진급 A4 보드 "생성".
//
// 하이브리드: (Step A) Vision 분석 1회로 시즌·팔레트·얼굴/모발/체형 결정값 산출 →
// (Step B) 섹션별 gpt-image-2 (images/edits, 신부 사진 입력)로 A4 분석 보드 1장 생성.
// 코드 렌더가 아니라 모델이 보드를 그림(레퍼런스 5~8 = gpt-image-2 결과).
//
// 입력: { source_path, sections: ("personal_color"|"hair"|"makeup"|"dress")[] }
// 가격: 섹션당 10하트, 4섹션(종합) 30하트. 계정당 첫 1회 50% 할인(반올림). 부분 실패 비례 환불.
// 출력: { results: {section,url,path}[], analysis, charged, discounted }

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
function base64ToBlob(b64: string, contentType: string): Blob {
  const byteChars = atob(b64);
  const arr = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) arr[i] = byteChars.charCodeAt(i);
  return new Blob([arr], { type: contentType });
}

// ───────── Step A: Vision 분석 스키마(도메인 결정값) ─────────
const ANALYSIS_GUIDE = `너는 한국 웨딩 퍼스널컬러·헤어·메이크업·드레스 전문 컨설턴트다.
신부 사진의 피부 언더톤·명도·눈동자·모발·얼굴형·체형을 관찰해 아래 JSON 만 출력(설명/마크다운 금지).
4축(언더톤 웜/쿨, 명도 라이트/딥, 채도 클리어/뮤트, 대비 하이/로우)으로 시즌을 정하고
12서브타입(봄 라이트/트루/브라이트, 여름 라이트/트루/뮤트, 가을 뮤트/트루/딥, 겨울 딥/트루/브라이트) 중 하나.
모든 색은 hex, 모든 텍스트는 한국어:
{
 "season_ko":"", "season_en":"", "keywords":["",""],
 "axes":{"undertone":"","temperature":"","value":"","chroma":"","contrast":""},
 "overall_impression":"",
 "why_reasons":["피부 …","눈 …","머리 …"],
 "best_colors":[{"name":"","hex":"#"}],     // 6
 "best_neutrals":[{"name":"","hex":"#"}],   // 4
 "worst_colors":[{"name":"","hex":"#","reason":""}], // 4
 "dress_white":{"name":"","hex":"#"}, "metal":"",
 "hair_tone":{"name":"","hex":"#"}, "lens":{"name":"","hex":"#"},
 "makeup":{"lip":{"name":"","hex":"#"},"cheek":{"name":"","hex":"#"},"eye":{"name":"","hex":"#"}},
 "face_shape":"", "face_notes":"",
 "hair_attributes":{"density":"","texture":"","diameter":"","elasticity":"","porosity":"","movement":""},
 "dye_shades":[{"name":"","hex":"#"}], // 3-4 (시즌 연동)
 "extension_advice":"",
 "body_notes":"", "best_silhouettes":["",""], "best_necklines":["",""],
 "makeup_corrections":{"eye":"","nose":"","lip":"","jaw":""}, "skin_type_base":""
}`;

// ───────── Step B: 보드 생성 프롬프트 ─────────
const PREAMBLE =
  "A premium editorial wedding-styling magazine board, A4 portrait orientation. " +
  "Luxury beauty-magazine spread: clean modular grid of rounded panels, hairline rules, " +
  "generous whitespace, soft palette (cream, blush, sage, warm taupe), elegant serif " +
  "headers with a small English subtitle plus clean sans-serif Korean body text. " +
  "Use the provided bride photo as the hero portrait; keep her face and identity EXACTLY " +
  "the same. Color swatches are filled circles/rounded chips, each labeled with its Korean " +
  "color name and HEX code. All labels short, clean, correct KOREAN. Footer reads " +
  "'DEWY · 2026 WEDDING'. Photorealistic, high production value. " +
  "Avoid: gibberish or broken letters, random Latin filler text, watermarks, extra people, " +
  "over-smoothing of the face.";

function swatches(list: { name?: string; hex?: string }[] = []) {
  return list.map((c) => `${c.name ?? ""}(${c.hex ?? ""})`).join(", ");
}

function boardPrompt(section: Section, a: any): string {
  const inj = (s: string) => `\n[DETERMINED ANALYSIS] ${s}`;
  if (section === "personal_color") {
    return (
      PREAMBLE +
      inj(
        `season=${a.season_ko}/${a.season_en}; axes 언더톤=${a?.axes?.undertone}, 명도=${a?.axes?.value}, 채도=${a?.axes?.chroma}, 대비=${a?.axes?.contrast}; ` +
          `best=${swatches(a.best_colors)}; neutrals=${swatches(a.best_neutrals)}; ` +
          `worst=${(a.worst_colors ?? []).map((c: any) => `${c.name}(${c.hex})-${c.reason}`).join(", ")}; ` +
          `dress_white=${a?.dress_white?.name}(${a?.dress_white?.hex}); metal=${a.metal}; hair=${a?.hair_tone?.name}; lens=${a?.lens?.name}; makeup lip/cheek/eye=${a?.makeup?.lip?.name}/${a?.makeup?.cheek?.name}/${a?.makeup?.eye?.name}`,
      ) +
      "\n[PANELS] Title 'YOUR SEASON: " +
      (a.season_ko ?? "") +
      "' with keyword chips. A '왜 이 시즌?' panel with 3 short reasons and 3 small zoom crops of her skin/eyes/hair. A '컬러 프로파일' table (언더톤·온도·명도·채도·대비·전체인상). A large BEST color donut wheel of the 6 best colors and a small WORST mini-wheel. A '베스트 컬러' grid (6 named hex swatches) and a '베스트 뉴트럴' grid (4). A '피해야 할 색' row (4 swatches each with a short Korean reason). A '베스트 매치' mini-grid with swatches for 드레스 화이트·헤어·렌즈·립·치크·아이. A '베스트 메탈' note. A 'QUICK TIP' one-liner."
    );
  }
  if (section === "hair") {
    return (
      PREAMBLE +
      inj(
        `face_shape=${a.face_shape}; face_notes=${a.face_notes}; hair=밀도 ${a?.hair_attributes?.density}, 모질 ${a?.hair_attributes?.texture}, 굵기 ${a?.hair_attributes?.diameter}, 탄력 ${a?.hair_attributes?.elasticity}, 포로시티 ${a?.hair_attributes?.porosity}, 모류 ${a?.hair_attributes?.movement}; dye_shades=${swatches(a.dye_shades)}; extension=${a.extension_advice}`,
      ) +
      "\n[PANELS] Title 'HAIRSTYLE BOARD'. Panels: 얼굴형·골격 analysis with a head diagram marking where to ADD vs REDUCE volume. 모발 분석 (밀도·모질·굵기·탄력·포로시티·모류). A row of 6 recommended haircut thumbnails generated ON HER FACE (롱레이어, 페이스프레이밍, 로브, 밥, 업스타일, 반올림), each with a 어울림 percentage and a one-line effect. 앞머리(뱅) 3 options (커튼뱅/시스루뱅/없음) with suitability. 스타일링 옵션 (로우번·시뇽·다운웨이브·포니). A 헤어 컬러 lineup of real dye-shade swatches + 대체톤. A '붙임머리·부분가발 커버 구간' diagram on a head silhouette (정수리/길이/옆숱). 베일 페어링 one line. '피해야 할 스타일' + 이유. Bottom 'YOU IN DIFFERENT LOOKS': 4 variations of HER with recommended cut/length/color."
    );
  }
  if (section === "makeup") {
    return (
      PREAMBLE +
      inj(
        `face_shape=${a.face_shape}; corrections 눈=${a?.makeup_corrections?.eye}, 코=${a?.makeup_corrections?.nose}, 입=${a?.makeup_corrections?.lip}, 턱=${a?.makeup_corrections?.jaw}; skin_base=${a.skin_type_base}; makeup colors lip/cheek/eye=${a?.makeup?.lip?.name}(${a?.makeup?.lip?.hex})/${a?.makeup?.cheek?.name}(${a?.makeup?.cheek?.hex})/${a?.makeup?.eye?.name}(${a?.makeup?.eye?.hex})`,
      ) +
      "\n[PANELS] Title 'MAKEUP BOARD'. Panels: a facial map line-drawing marking contour & highlight zones. 이목구비 보정 포인트 (눈·코·입·턱 each one tip). '장소별 룩' 3 panels (실내 홀 = 세미매트·또렷 음영 / 야외·자연광 = 속광·워터프루프 / 스튜디오 = HD·정밀) each previewing the look ON HER FACE + color chips. '부위별 컬러' 4 swatches (립·치크·아이·베이스) each with 제형 (매트/글로시/시머). A try-on grid of HER face in 데이/내추럴/글램. '피해야 할 메이크업' + 이유."
    );
  }
  // dress
  return (
    PREAMBLE +
    inj(
      `body_notes=${a.body_notes}; best_silhouettes=${(a.best_silhouettes ?? []).join(", ")}; best_necklines=${(a.best_necklines ?? []).join(", ")}; dress_white=${a?.dress_white?.name}; metal=${a.metal}; season=${a.season_ko}`,
    ) +
    "\n[PANELS] Title 'DRESS & BOUQUET BOARD'. Panels: 체형·넥라인 가이드 (어깨/허리/키 비율 → 추천 실루엣·넥라인). '장소별 드레스' 3 panels (홀·호텔 = 볼가운/A라인 + 미카도/새틴 / 야외·가든 = A라인/시스 + 시폰/오간자/레이스 / 스튜디오 = 크레이프 컬럼) with silhouette illustrations + fabric notes. '소재별' rows (실크·새틴·튤·레이스·머메이드) 광택·핏·계절감. 넥라인 매칭 (하트/스퀘어/오프숄더…) with face/shoulder reasons. A '부케' panel: style matched to silhouette + a seasonal flower color palette (chips with name+hex). '주얼리·액세서리' best vs avoid (메탈톤·목걸이↔넥라인·귀걸이↔헤어·베일 길이). A preview of HER in a recommended dress silhouette."
  );
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

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = (await req.json()) as { source_path?: string; sections?: string[] };
    const sourcePath = body.source_path;
    if (!sourcePath || !sourcePath.startsWith(`${userId}/`)) return json({ error: "invalid_source_path" }, 403);
    const sections = (body.sections ?? []).filter((s): s is Section =>
      (ALL_SECTIONS as readonly string[]).includes(s),
    );
    if (sections.length === 0) return json({ error: "no_sections" }, 400);

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) return json({ error: "openai_not_configured" }, 500);
    const MODEL = Deno.env.get("OPENAI_CONSULT_MODEL") ?? "gpt-4o";

    // 첫 1회 50% 할인 + 과금
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

    const refund = async (amount: number) => {
      if (amount > 0)
        await admin.rpc("earn_hearts", { p_user_id: userId, p_amount: amount, p_reason: "wedding_consulting_refund" });
    };

    try {
      // 신부 사진 다운로드 (분석 dataURL + 생성 입력 공용)
      const { data: blob, error: dlErr } = await admin.storage.from("invitation-uploads").download(sourcePath);
      if (dlErr || !blob) { await refund(finalCost); return json({ error: "source_download_failed" }, 502); }
      const buf = new Uint8Array(await blob.arrayBuffer());
      let bin = ""; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      const dataUrl = `data:${blob.type || "image/png"};base64,${btoa(bin)}`;

      // Step A — Vision 분석
      let analysis: any = {};
      try {
        const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: MODEL,
            temperature: 0.5,
            max_tokens: 2600,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: ANALYSIS_GUIDE },
              { role: "user", content: [
                { type: "text", text: "이 신부 사진을 분석해 위 JSON 을 채워줘." },
                { type: "image_url", image_url: { url: dataUrl } },
              ] },
            ],
          }),
        });
        if (aiRes.ok) {
          const j = await aiRes.json();
          analysis = JSON.parse(j?.choices?.[0]?.message?.content ?? "{}");
        } else {
          console.error("analysis fail", aiRes.status, (await aiRes.text()).slice(0, 200));
        }
      } catch (e) {
        console.error("analysis error", e);
      }

      // Step B — 섹션별 보드 생성 (병렬)
      const gen = async (section: Section) => {
        const form = new FormData();
        form.append("model", "gpt-image-2");
        form.append("prompt", boardPrompt(section, analysis));
        form.append("size", "1024x1536");
        form.append("quality", "high");
        form.append("n", "1");
        form.append("image[]", blob, "bride.png");
        const res = await fetch("https://api.openai.com/v1/images/edits", {
          method: "POST",
          headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
          body: form,
        });
        if (!res.ok) throw new Error(`openai ${res.status}: ${(await res.text()).slice(0, 160)}`);
        const data = (await res.json()) as { data: { b64_json?: string; url?: string }[] };
        const item = data.data?.[0];
        if (!item) throw new Error("no image");
        const outBlob = item.b64_json ? base64ToBlob(item.b64_json, "image/png") : await (await fetch(item.url!)).blob();
        const outPath = `${userId}/consulting/${section}-${crypto.randomUUID()}.png`;
        const { error: upErr } = await admin.storage.from("invitation-uploads").upload(outPath, outBlob, { contentType: "image/png", upsert: false });
        if (upErr) throw new Error("upload fail");
        const { data: signed } = await admin.storage.from("invitation-uploads").createSignedUrl(outPath, 60 * 60 * 24 * 7);
        return { section, url: signed?.signedUrl ?? null, path: outPath };
      };

      const settled = await Promise.allSettled(sections.map(gen));
      const results = settled.flatMap((s) => (s.status === "fulfilled" ? [s.value] : []));
      settled.forEach((s) => { if (s.status === "rejected") console.error("board fail", s.reason); });

      const ok = results.length;
      const failed = sections.length - ok;
      const refundAmt = failed > 0 ? (ok === 0 ? finalCost : Math.round((failed / sections.length) * finalCost)) : 0;
      await refund(refundAmt);
      if (ok === 0) return json({ error: "all_failed" }, 502);

      const { data: rep } = await admin.from("wedding_consulting_reports")
        .insert({ user_id: userId, sections, analysis: { ...analysis, results } })
        .select("id").single();
      await admin.from("wedding_consulting_usage").upsert(
        { user_id: userId, used_count: usedCount + 1, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );

      return json({ results, analysis, report_id: rep?.id ?? null, charged: finalCost - refundAmt, discounted }, 200);
    } catch (e) {
      console.error("consulting error:", e);
      await refund(finalCost);
      return json({ error: "consulting_failed" }, 502);
    }
  } catch (e) {
    console.error("wedding-consulting fatal:", e);
    return json({ error: "server_error" }, 500);
  }
});
