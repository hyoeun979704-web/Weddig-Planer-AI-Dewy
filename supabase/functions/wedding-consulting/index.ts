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
// Responses API 출력 텍스트 집계 — output[0].content[0].text 가정 금지(추론 항목 등 혼재).
function extractOutputText(resp: any): string {
  if (typeof resp?.output_text === "string") return resp.output_text;
  const out = resp?.output;
  if (!Array.isArray(out)) return "";
  const parts: string[] = [];
  for (const item of out) {
    if (item?.type === "message" && Array.isArray(item.content)) {
      for (const c of item.content) {
        if (c?.type === "output_text" && typeof c.text === "string") parts.push(c.text);
      }
    }
  }
  return parts.join("");
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
 "makeup_corrections":{"eye":"","nose":"","lip":"","jaw":""}, "skin_type_base":"",
 "venue_makeup":{"hall":"","outdoor":"","studio":""},
 "neckline_decollete":"",
 "flower_palette":[{"name":"","hex":"#"}]
}`;

// ───────── Step B: 보드 생성 프롬프트 (고정 프레임 + JSON 강제 바인딩) ─────────
// 분석 JSON 값을 그대로 typeset 하도록 강제. 프레임(밴드 좌표)은 페이지별 고정.
const SHARED =
  "Premium editorial bridal-styling magazine board, A4 portrait (1024x1536). One " +
  "consistent soft palette (cream, blush, sage, warm taupe), elegant serif headers + a " +
  "small UPPERCASE English subtitle, clean sans-serif KOREAN body text, rounded cards, " +
  "hairline rules, generous whitespace. Photorealistic, high production value.\n" +
  "DATA BINDING — RENDER STRICTLY FROM [DATA]: every color swatch is a filled chip using " +
  "its given HEX, labeled with its given Korean name and the HEX text; every text value " +
  "(season, attributes, tips) is typeset VERBATIM from [DATA] — never invent or substitute " +
  "colors or values. Follow the WIREFRAME positions exactly (percent of canvas); do NOT " +
  "rearrange, resize, reorder, add, or remove panels.\n" +
  "SELFIE CONSTRAINT — the provided bride photo is a SELFIE (head & shoulders only). NEVER " +
  "fabricate her full body or full-length figure. Use her photo ONLY in face / hair / " +
  "neckline head-and-shoulders panels; render dresses as faceless croquis on a dress form, " +
  "and bouquets / jewelry / veils / fabrics as real photographic objects — not on her body.\n" +
  "Korean must be correct and legible. HEADER BAND y0–9% (serif title left, EN subtitle " +
  "under it, hairline at band bottom). FOOTER y93–98%: centered 'DEWY · 2026 WEDDING'. " +
  "Avoid: gibberish/broken letters, random Latin filler, watermarks, extra people, face " +
  "over-smoothing.";

function swatches(list: { name?: string; hex?: string }[] = []) {
  return list.map((c) => `${c.name ?? ""}(${c.hex ?? ""})`).join(", ");
}

function boardPrompt(section: Section, a: any): string {
  const data = (s: string) => `\n[DATA] ${s}`;
  if (section === "personal_color") {
    return (
      SHARED +
      data(
        `season=${a.season_ko}/${a.season_en}; axes 언더톤=${a?.axes?.undertone}, 온도=${a?.axes?.temperature}, 명도=${a?.axes?.value}, 채도=${a?.axes?.chroma}, 대비=${a?.axes?.contrast}; ` +
          `impression=${a.overall_impression}; why=${(a.why_reasons ?? []).join(" / ")}; ` +
          `best=${swatches(a.best_colors)}; neutrals=${swatches(a.best_neutrals)}; ` +
          `worst=${(a.worst_colors ?? []).map((c: any) => `${c.name}(${c.hex})-${c.reason}`).join(", ")}; ` +
          `dress_white=${a?.dress_white?.name}(${a?.dress_white?.hex}); metal=${a.metal}; hair=${a?.hair_tone?.name}; lens=${a?.lens?.name}; makeup lip/cheek/eye=${a?.makeup?.lip?.name}/${a?.makeup?.cheek?.name}/${a?.makeup?.eye?.name}`,
      ) +
      "\n[WIREFRAME] TITLE 'YOUR SEASON: " + (a.season_ko ?? "") + "' / SUB '" + (a.season_en ?? "") + " · PERSONAL COLOR'. " +
      "BAND1 y10–30%: [x4–28% 신부 셀카 포트레이트] [x30–63% ① 왜 이 시즌? — why의 3줄 이유 + 키워드칩] [x65–96% ② 컬러 프로파일 6행 표: 언더톤·온도·명도·채도·대비·전체인상, 값은 [DATA] 그대로]. " +
      "HERO BAND2 y31–56%: ③ 베스트 vs 워스트 드레이프 — 신부 얼굴을 좌(베스트 컬러 천을 어깨에 드레이프)·우(워스트 컬러 천) 나란히 비교, 베스트 쪽이 더 화사함을 보여줌. " +
      "BAND3 y57–73%: [x4–55% ④ 베스트 컬러 6 스와치(이름+HEX, [DATA] best 그대로)] [x58–96% ⑤ 베스트 뉴트럴 4 스와치]. " +
      "BAND4 y74–91%: [x4–40% ⑥ 피해야 할 색 4(각 짧은 이유)] [x42–73% ⑦ 베스트 매치 미니그리드: 드레스화이트·헤어·렌즈·립·치크·아이 6칩] [x75–96% ⑧ 베스트 메탈 1줄 + QUICK TIP 1줄]. " +
      "색 휠은 쓰지 말 것 — 색은 스와치로만 표기(중복 금지)."
    );
  }
  if (section === "hair") {
    return (
      SHARED +
      data(
        `face_shape=${a.face_shape}; face_notes=${a.face_notes}; hair=밀도 ${a?.hair_attributes?.density}, 모질 ${a?.hair_attributes?.texture}, 굵기 ${a?.hair_attributes?.diameter}, 탄력 ${a?.hair_attributes?.elasticity}, 포로시티 ${a?.hair_attributes?.porosity}, 모류 ${a?.hair_attributes?.movement}; dye_shades=${swatches(a.dye_shades)}; extension=${a.extension_advice}`,
      ) +
      "\n[WIREFRAME] TITLE 'HAIRSTYLE BOARD' / SUB 'BRIDAL HAIR STYLING GUIDE'. " +
      "BAND1 y10–28%: [x4–28% 신부 셀카 포트레이트] [x30–62% ① 얼굴형·골격: 머리 다이어그램에 볼륨 ADD vs REDUCE 영역 표시] [x64–96% ② 모발 분석 6항목([DATA] 값 그대로)]. " +
      "HERO BAND2 y29–52% (와이드): ③ 추천 컷 6종 — 신부 얼굴에 합성한 가로 2×3 미니썸네일(롱레이어·페이스프레이밍·로브·밥·업스타일·반올림), 각 어울림 %, 6컷은 서로 분명히 다른 헤어. " +
      "BAND3 y53–68% (3컬럼): [④ 앞머리 3옵션 커튼/시스루/없음] [⑤ 스타일링 4옵션 로우번·시뇽·다운웨이브·포니] [⑥ 헤어 컬러 셰이드 스와치 라인업 + 대체톤([DATA] dye_shades)]. " +
      "BAND4 y69–82%: [x4–55% ⑦ 붙임머리·부분가발 커버 구간: 머리 실루엣에 정수리/길이/옆숱] [x58–96% 베일 페어링 + 피해야 할 스타일 1줄]. " +
      "BAND5 y83–91% (와이드): ⑧ YOU IN DIFFERENT LOOKS — 신부 head-and-shoulders 4변형(추천 컷/길이/컬러)."
    );
  }
  if (section === "makeup") {
    return (
      SHARED +
      data(
        `face_shape=${a.face_shape}; corrections 눈=${a?.makeup_corrections?.eye}, 코=${a?.makeup_corrections?.nose}, 입=${a?.makeup_corrections?.lip}, 턱=${a?.makeup_corrections?.jaw}; skin_base=${a.skin_type_base}; ` +
          `venue 홀=${a?.venue_makeup?.hall}, 야외=${a?.venue_makeup?.outdoor}, 스튜디오=${a?.venue_makeup?.studio}; ` +
          `colors lip/cheek/eye=${a?.makeup?.lip?.name}(${a?.makeup?.lip?.hex})/${a?.makeup?.cheek?.name}(${a?.makeup?.cheek?.hex})/${a?.makeup?.eye?.name}(${a?.makeup?.eye?.hex})`,
      ) +
      "\n[WIREFRAME] TITLE 'MAKEUP BOARD' / SUB 'BRIDAL MAKEUP STYLING GUIDE'. " +
      "BAND1 y10–28%: [x4–28% 신부 셀카 포트레이트] [x30–62% ① 페이셜 맵: 얼굴 라인드로잉에 컨투어/하이라이트 존] [x64–96% ② 이목구비 보정: 눈·코·입·턱 각 1팁([DATA])]. " +
      "HERO BAND2 y29–50% (와이드 3패널): ③ 장소별 룩 — 실내홀/야외·자연광/스튜디오, 각 신부 얼굴 미리보기. 세 패널은 마감·강도가 VISIBLY 다르게(홀=세미매트·또렷음영, 야외=속광·내추럴, 스튜디오=HD·고채도) — 같은 얼굴 복붙 금지. " +
      "BAND3 y51–66%: [x4–48% ④ 부위별 컬러 4스와치+제형([DATA] lip/cheek/eye+베이스)] [x52–96% ⑤ 베이스·스킨 가이드: skin_base별 제형·커버]. " +
      "BAND4 y67–84% (와이드 3패널): ⑥ TRY-ON — 신부 얼굴 데이/내추럴/글램, 세 룩 강도가 분명히 다르게. " +
      "BAND5 y85–91%: [x4–55% ⑦ 추천 카테고리(립·치크·아이·픽서 타입)] [x58–96% ⑧ 피해야 할 메이크업 + QUICK TIP]."
    );
  }
  // dress + 부케 (셀카 정직: 전신 금지, 사진풍 오브젝트)
  return (
    SHARED +
    data(
      `face_shape=${a.face_shape}; neckline_decollete=${a.neckline_decollete}; best_necklines=${(a.best_necklines ?? []).join(", ")}; best_silhouettes=${(a.best_silhouettes ?? []).join(", ")}; ` +
        `dress_white=${a?.dress_white?.name}(${a?.dress_white?.hex}); metal=${a.metal}; season=${a.season_ko}; flower_palette=${swatches(a.flower_palette)}`,
    ) +
    "\n[WIREFRAME] TITLE 'DRESS & BOUQUET BOARD' / SUB 'BRIDAL DRESS STYLING GUIDE'. " +
    "BAND1 y10–28%: [x4–32% ① 넥라인 매칭: 신부 셀카(얼굴+목·어깨) 기준 1순위 넥라인을 어깨라인 위 일러스트로 오버레이 + 이유] [x34–64% ② 추천 넥라인 4종: 하트·스퀘어·오프숄더·보트넥 미니 일러스트(faceless 어깨 실루엣), 각 적합도] [x66–96% ③ 드레스 화이트 톤 스와치([DATA] dress_white) + 메탈톤 칩]. " +
    "HERO BAND2 y29–54% (와이드 4컷): ④ 실루엣 CROQUIS 4종 — 볼가운·A라인·머메이드·엠파이어, faceless 패션 일러스트(드레스폼/마네킹), 각 핏·장소·소재 한 줄. 신부 몸 금지. " +
    "BAND3 y55–70% (사진형 3패널): ⑤ 부케 3스타일 — 라운드·캐스케이드·내추럴, 실제 사진풍 부케 + 시즌 플라워 컬러 팔레트 칩([DATA] flower_palette, 이름+HEX). " +
    "BAND4 y71–91% (사진형 3컬럼): [⑥ 패브릭: 실크·새틴·튤·레이스·미카도 실제 원단 텍스처 5종 + 광택·계절감] [⑦ 주얼리: 귀걸이·목걸이·헤드피스 실제 사진풍, BEST 행 vs AVOID 행] [⑧ 베일: 블러셔·엘보우·채플·캐서드럴 길이 CROQUIS + 추천 1종]."
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
    const MODEL = Deno.env.get("OPENAI_CONSULT_MODEL") ?? "gpt-5.5-2026-04-23";

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

      // Step A — Vision 분석 (Responses API; gpt-5.5 = reasoning 모델 권장 경로)
      let analysis: any = {};
      try {
        const effort = Deno.env.get("OPENAI_CONSULT_EFFORT") ?? "low";
        const aiRes = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: MODEL,
            reasoning: { effort },
            instructions: ANALYSIS_GUIDE,
            input: [
              { role: "user", content: [
                { type: "input_text", text: "이 신부 사진을 분석해 위 JSON 을 채워줘." },
                { type: "input_image", image_url: dataUrl },
              ] },
            ],
            // 구조화 출력(JSON) + 추론 토큰까지 감안한 여유분
            text: { format: { type: "json_object" } },
            max_output_tokens: 6000,
          }),
        });
        if (aiRes.ok) {
          const j = await aiRes.json();
          analysis = JSON.parse(extractOutputText(j) || "{}");
        } else {
          console.error("analysis fail", aiRes.status, (await aiRes.text()).slice(0, 300));
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
