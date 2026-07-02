// 2026 웨딩컨설팅 — 신부 사진 분석 + 페이지별 매거진급 A4 보드 "생성" (fan-out 잡).
//
// 월클럭 제한으로 한 워커가 4장을 다 만들다 죽는 문제를 해결:
//   START 모드(사용자): 과금 → 리포트(processing) 생성 → Vision 분석 →
//     섹션마다 자기 자신을 board 모드로 호출(fire). 즉시 202 반환.
//   BOARD 모드(내부 self-invoke): 섹션 1장만 생성(짧은 워커) → consulting_board_done RPC.
//     마지막 보드가 끝나면 RPC가 리포트를 완료/실패로 마감 + 환불 정산.
// 멈춘 잡은 pg_cron reaper(reap_stuck_generation_jobs)가 환불+실패 처리.
//
// verify_jwt=false: START 는 수동 getClaims, BOARD 는 x-internal-secret(서비스 롤 키) 검사.

import { MODELS } from "../_shared/llm.ts";
import { precheckSourceImage, hasRecentPendingJob, hasHeartBalance } from "../_shared/studioEdge.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


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
모든 색은 hex, 모든 텍스트는 한국어. 추천 목록(hair_cuts·bangs·necklines·silhouettes)은 이 신부에게 어울리는 순서로 정렬하고 fit 은 0-100 정수로 근거 있게 차등하라(같은 값 남발 금지). 이름은 한국어:
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
 "hair_cuts":[{"name":"","fit":0,"reason":""}],     // 6, 어울림 순
 "bangs":[{"name":"","fit":0,"reason":""}],         // 3, 어울림 순(예: 커튼/시스루/없음)
 "necklines":[{"name":"","fit":0,"reason":""}],     // 4, 어울림 순
 "silhouettes":[{"name":"","fit":0,"reason":""}],   // 4, 어울림 순
 "flower_palette":[{"name":"","hex":"#"}]
}`;

// 신랑판 분석 스키마 — 신부(부케·드레스·넥라인)를 예복(수트·라펠·타이·그루밍)으로 재설계.
// 같은 4섹션 키(personal_color·hair·makeup→grooming·dress→suit)를 재사용하되 값은 남성 도메인.
const ANALYSIS_GUIDE_GROOM = `너는 한국 웨딩 남성 스타일링(퍼스널컬러·헤어·그루밍·예복) 전문 컨설턴트다.
신랑 사진의 피부 언더톤·명도·눈동자·모발·얼굴형·골격을 관찰해 아래 JSON 만 출력(설명/마크다운 금지).
4축(언더톤 웜/쿨, 명도 라이트/딥, 채도 클리어/뮤트, 대비 하이/로우)으로 시즌을 정하고
12서브타입(봄 라이트/트루/브라이트, 여름 라이트/트루/뮤트, 가을 뮤트/트루/딥, 겨울 딥/트루/브라이트) 중 하나.
모든 색은 hex, 모든 텍스트는 한국어. 추천 목록(hair_cuts·beards·lapels·suit_fits)은 이 신랑에게 어울리는 순서로 정렬하고 fit 은 0-100 정수로 근거 있게 차등하라(같은 값 남발 금지). 이름은 한국어. 남성 예복 맥락(수트/턱시도/셔츠/타이/그루밍)으로만 채운다:
{
 "season_ko":"", "season_en":"", "keywords":["",""],
 "axes":{"undertone":"","temperature":"","value":"","chroma":"","contrast":""},
 "overall_impression":"",
 "why_reasons":["피부 …","눈 …","머리 …"],
 "best_colors":[{"name":"","hex":"#"}],     // 6 (타이·포켓스퀘어·셔츠에 쓸 어울리는 색)
 "best_neutrals":[{"name":"","hex":"#"}],   // 4 (수트 베이스: 네이비·차콜·그레이·블랙·아이보리 계열)
 "worst_colors":[{"name":"","hex":"#","reason":""}], // 4
 "shirt_white":{"name":"","hex":"#"}, "metal":"",   // 어울리는 셔츠 화이트 톤 / 시계·커프스 메탈(골드/실버)
 "hair_tone":{"name":"","hex":"#"}, "lens":{"name":"","hex":"#"},
 "face_shape":"", "face_notes":"",
 "hair_attributes":{"density":"","texture":"","diameter":"","elasticity":"","porosity":"","movement":""},
 "dye_shades":[{"name":"","hex":"#"}], // 3-4 (시즌 연동 남성 염색 톤)
 "grooming_corrections":{"eye":"","nose":"","skin":"","jaw":""}, "skin_type_base":"",
 "venue_grooming":{"hall":"","outdoor":"","studio":""},   // 장소별 그루밍(피부결·유분·눈썹) 톤
 "hair_cuts":[{"name":"","fit":0,"reason":""}],     // 6, 어울림 순(남성 컷: 투블럭·가르마·포마드·크롭 등)
 "beards":[{"name":"","fit":0,"reason":""}],        // 3, 어울림 순(예: 클린쉐이브/짧은수염/정돈된수염)
 "lapels":[{"name":"","fit":0,"reason":""}],        // 4, 어울림 순(노치/피크/숄/만다린)
 "suit_fits":[{"name":"","fit":0,"reason":""}],     // 4, 어울림 순(슬림/레귤러/쓰리피스/턱시도)
 "suit_colors":[{"name":"","hex":"#"}],  // 4-5 추천 수트 컬러 칩(네이비·차콜·그레이·블랙·아이보리)
 "tie_palette":[{"name":"","hex":"#"}]   // 4 타이·포켓스퀘어 컬러(시즌 연동)
}`;

// ───────── Step B: 보드 생성 프롬프트 (고정 프레임 + JSON 강제 바인딩) ─────────
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
  "IDENTITY LOCK — in EVERY panel that shows the bride she must be UNMISTAKABLY the same person " +
  "as the provided photo: reproduce her exact eyes (shape, size, slant, spacing, eyelid type: " +
  "monolid/double, crease height), eyebrows, nose (bridge height & width, tip, nostrils), lips " +
  "(shape, fullness, philtrum), jawline, chin, cheekbones, hairline, face length-to-width ratio, " +
  "skin tone/undertone and any moles or freckles. Do NOT beautify, slim, enlarge eyes, or change age. Maintain " +
  "perfect facial consistency across ALL panels — the identical face in every thumbnail, no drift, " +
  "no stylization. Ultra-realistic, sharp focus.\n" +
  "Korean must be correct and legible. HEADER BAND y0–9% (serif title left, EN subtitle " +
  "under it, hairline at band bottom). FOOTER y93–98%: centered 'DEWY · 2026 WEDDING'. " +
  "Avoid: gibberish/broken letters, random Latin filler, watermarks, extra people, face " +
  "over-smoothing.";

// 신랑판 공통 프레임 — 신부 SHARED 의 대칭. 셀카 정직·정체성 고정은 동일하되 he/him,
// 드레스폼→수트 마네킹, 부케·베일 제거. 톤은 남성 웨딩에 맞춰 약간 차분하게.
const SHARED_GROOM =
  "Premium editorial menswear-styling magazine board, A4 portrait (1024x1536). One " +
  "consistent refined palette (cream, slate, sage, warm taupe, charcoal accents), elegant " +
  "serif headers + a small UPPERCASE English subtitle, clean sans-serif KOREAN body text, " +
  "rounded cards, hairline rules, generous whitespace. Photorealistic, high production value.\n" +
  "DATA BINDING — RENDER STRICTLY FROM [DATA]: every color swatch is a filled chip using " +
  "its given HEX, labeled with its given Korean name and the HEX text; every text value " +
  "(season, attributes, tips) is typeset VERBATIM from [DATA] — never invent or substitute " +
  "colors or values. Follow the WIREFRAME positions exactly (percent of canvas); do NOT " +
  "rearrange, resize, reorder, add, or remove panels.\n" +
  "SELFIE CONSTRAINT — the provided groom photo is a SELFIE (head & shoulders only). NEVER " +
  "fabricate his full body or full-length figure. Use his photo ONLY in face / hair / " +
  "collar head-and-shoulders panels; render suits as faceless croquis on a suit form / " +
  "tailor's mannequin, and ties / watches / shoes / pocket squares / fabrics as real " +
  "photographic objects — not on his body.\n" +
  "IDENTITY LOCK — in EVERY panel that shows the groom he must be UNMISTAKABLY the same person " +
  "as the provided photo: reproduce his exact eyes (shape, size, slant, spacing, eyelid type: " +
  "monolid/double, crease height), eyebrows, nose (bridge height & width, tip, nostrils), lips " +
  "(shape, fullness, philtrum), jawline, chin, cheekbones, hairline, face length-to-width ratio, " +
  "skin tone/undertone, any moles or freckles, and any existing facial hair. Do NOT beautify, slim, enlarge " +
  "eyes, add or remove facial hair beyond the stated grooming, or change age. Maintain perfect " +
  "facial consistency across ALL panels — the identical face in every thumbnail, no drift, no " +
  "stylization. Ultra-realistic, sharp focus.\n" +
  "Korean must be correct and legible. HEADER BAND y0–9% (serif title left, EN subtitle " +
  "under it, hairline at band bottom). FOOTER y93–98%: centered 'DEWY · 2026 WEDDING'. " +
  "Avoid: gibberish/broken letters, random Latin filler, watermarks, extra people, face " +
  "over-smoothing, any bouquet / veil / bridal elements.";

function swatches(list: { name?: string; hex?: string }[] = []) {
  return list.map((c) => `${c.name ?? ""}(${c.hex ?? ""})`).join(", ");
}

// 추천 랭크 목록(이름 fit% 이유) — 이미지 모델이 %를 지어내지 않게 [DATA] 로 바인딩.
function ranked(list: { name?: string; fit?: number; reason?: string }[] = []) {
  return list.map((x) => `${x.name ?? ""} ${x.fit ?? ""}%${x.reason ? `(${x.reason})` : ""}`).join(", ");
}

function boardPrompt(section: Section, a: any, gender: "bride" | "groom" = "bride"): string {
  if (gender === "groom") return groomBoardPrompt(section, a);
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
        `face_shape=${a.face_shape}; face_notes=${a.face_notes}; hair=밀도 ${a?.hair_attributes?.density}, 모질 ${a?.hair_attributes?.texture}, 굵기 ${a?.hair_attributes?.diameter}, 탄력 ${a?.hair_attributes?.elasticity}, 포로시티 ${a?.hair_attributes?.porosity}, 모류 ${a?.hair_attributes?.movement}; dye_shades=${swatches(a.dye_shades)}; extension=${a.extension_advice}; cuts=${ranked(a.hair_cuts)}; bangs=${ranked(a.bangs)}`,
      ) +
      "\n[WIREFRAME] TITLE 'HAIRSTYLE BOARD' / SUB 'BRIDAL HAIR STYLING GUIDE'. " +
      "BAND1 y10–28%: [x4–28% 신부 셀카 포트레이트] [x30–62% ① 얼굴형·골격: 머리 다이어그램에 볼륨 ADD vs REDUCE 영역 표시] [x64–96% ② 모발 분석 6항목([DATA] 값 그대로)]. " +
      "HERO BAND2 y29–52% (와이드): ③ 추천 컷 — [DATA] cuts 의 6종을 어울림 순으로 가로 2×3 미니썸네일(신부 얼굴에 합성, 모두 동일 인물·이목구비 고정, 헤어만 다름). 각 썸네일에 [DATA] cuts 의 한국어 이름과 fit% 를 그대로 크게 표기(숫자 임의 생성 금지)." +
      "BAND3 y53–68% (2컬럼): [x4–46% ④ 앞머리 — [DATA] bangs 옵션을 어울림 순, 각 이름·fit% 를 [DATA] 그대로 표기] [x48–96% ⑤ 헤어 컬러 예시 4종 — 신부 머리를 각 염색 톤으로 실제로 보여주는 작은 미리보기 이미지(동일 인물, 헤어 컬러만 변경) + 이름·HEX([DATA] dye_shades)]. " +
      "BAND4 y69–82%: [x4–55% ⑥ 붙임머리·부분가발 커버 구간: 머리 실루엣에 정수리/길이/옆숱] [x58–96% 베일 페어링 + 피해야 할 스타일 1줄]. " +
      "BAND5 y83–91% (와이드): ⑦ YOU IN DIFFERENT LOOKS — 신부 head-and-shoulders 4변형(추천 컷/길이/컬러), 모두 동일 인물(이목구비 고정)." +
      " ★FACE CONSISTENCY (절대 규칙): 이 보드의 모든 얼굴(①③④⑤⑦)은 제공된 사진과 100% 동일 인물이다 — 이목구비·골격·피부톤·나이가 썸네일들 사이에서 조금도 달라지면 안 되며, 같은 얼굴을 그대로 복제하듯 모든 칸에 동일하게 그린다. 칸마다 다른 사람처럼 보이는 것을 절대 금지." +
      " ★HAIRSTYLE DIFFERENTIATION (절대 규칙): ③의 6개 썸네일은 각각 [DATA] cuts 의 이름이 뜻하는 대로 길이·볼륨·업/다운·가르마·질감이 '한눈에 봐도 확연히 다르게' 보여야 한다 — 같은 헤어를 두 칸 이상에 반복하는 것 절대 금지. ⑤는 칸마다 헤어 컬러가 또렷이 다르게, ⑦은 4개가 서로 명확히 구분되는 룩으로. 차이가 작은 썸네일 크기에서도 분명히 드러나야 한다."
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
      "HERO BAND2 y29–50% (와이드 3패널): ③ 장소별 룩 — 실내홀/야외·자연광/스튜디오, 각 신부 얼굴 미리보기(동일 인물, 이목구비 고정). 세 패널은 메이크업 마감·광·음영이 확연히 다르게(홀=세미매트·또렷음영 / 야외=속광·내추럴·연한 메이크업 / 스튜디오=HD·고채도·또렷 아이라인) — 절대 같은 이미지 복붙 금지, 각 패널 상단에 홀/야외/스튜디오 라벨. " +
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
        `dress_white=${a?.dress_white?.name}(${a?.dress_white?.hex}); metal=${a.metal}; season=${a.season_ko}; necklines=${ranked(a.necklines)}; silhouettes=${ranked(a.silhouettes)}; flower_palette=${swatches(a.flower_palette)}`,
    ) +
    "\n[WIREFRAME] TITLE 'DRESS & BOUQUET BOARD' / SUB 'BRIDAL DRESS STYLING GUIDE'. " +
    "BAND1 y10–28%: [x4–32% ① 넥라인 매칭: 신부 셀카(얼굴+목·어깨) 기준 1순위 넥라인을 어깨라인 위 일러스트로 오버레이 + 이유] [x34–64% ② 추천 넥라인 — [DATA] necklines 4종을 어울림 순 미니 일러스트(faceless 어깨 실루엣), 각 이름·fit% 를 [DATA] 그대로 표기] [x66–96% ③ 드레스 화이트 톤 스와치([DATA] dress_white) + 메탈톤 칩]. " +
    "HERO BAND2 y29–54% (와이드 4컷): ④ 실루엣 CROQUIS — [DATA] silhouettes 4종을 어울림 순 faceless 패션 일러스트(드레스폼/마네킹), 각 컷에 [DATA] 의 이름·fit% 를 그대로 표기 + 핏·장소·소재 한 줄. 신부 몸 금지." +
    "BAND3 y55–70% (사진형 3패널): ⑤ 부케 3스타일 — 라운드·캐스케이드·내추럴, 실제 사진풍 부케 + 시즌 플라워 컬러 팔레트 칩([DATA] flower_palette, 이름+HEX). " +
    "BAND4 y71–91% (사진형 3컬럼): [⑥ 패브릭: 실크·새틴·튤·레이스·미카도 실제 원단 텍스처 5종 + 광택·계절감] [⑦ 주얼리: 귀걸이·목걸이·헤드피스 실제 사진풍, BEST 행 vs AVOID 행] [⑧ 베일: 블러셔·엘보우·채플·캐서드럴 길이 CROQUIS + 추천 1종]."
  );
}

// 신랑판 보드 프롬프트 — 신부 boardPrompt 의 대칭. 같은 4섹션 키를 남성 도메인으로 재설계
// (드레스+부케→예복+타이, 메이크업→그루밍, 넥라인→라펠, 실루엣→수트핏, 부케→타이/액세서리).
function groomBoardPrompt(section: Section, a: any): string {
  const data = (s: string) => `\n[DATA] ${s}`;
  if (section === "personal_color") {
    return (
      SHARED_GROOM +
      data(
        `season=${a.season_ko}/${a.season_en}; axes 언더톤=${a?.axes?.undertone}, 온도=${a?.axes?.temperature}, 명도=${a?.axes?.value}, 채도=${a?.axes?.chroma}, 대비=${a?.axes?.contrast}; ` +
          `impression=${a.overall_impression}; why=${(a.why_reasons ?? []).join(" / ")}; ` +
          `best=${swatches(a.best_colors)}; suit_neutrals=${swatches(a.best_neutrals)}; ` +
          `worst=${(a.worst_colors ?? []).map((c: any) => `${c.name}(${c.hex})-${c.reason}`).join(", ")}; ` +
          `shirt_white=${a?.shirt_white?.name}(${a?.shirt_white?.hex}); metal=${a.metal}; hair=${a?.hair_tone?.name}; lens=${a?.lens?.name}; tie=${swatches(a.tie_palette)}`,
      ) +
      "\n[WIREFRAME] TITLE 'YOUR SEASON: " + (a.season_ko ?? "") + "' / SUB '" + (a.season_en ?? "") + " · PERSONAL COLOR'. " +
      "BAND1 y10–30%: [x4–28% 신랑 셀카 포트레이트] [x30–63% ① 왜 이 시즌? — why의 3줄 이유 + 키워드칩] [x65–96% ② 컬러 프로파일 6행 표: 언더톤·온도·명도·채도·대비·전체인상, 값은 [DATA] 그대로]. " +
      "HERO BAND2 y31–56%: ③ 베스트 vs 워스트 셔츠·타이 드레이프 — 신랑 얼굴을 좌(베스트 컬러 셔츠/타이 원단을 어깨·목 아래 드레이프)·우(워스트 컬러) 나란히 비교, 베스트 쪽이 더 화사하고 혈색이 좋음을 보여줌. " +
      "BAND3 y57–73%: [x4–55% ④ 베스트 컬러 6 스와치(타이·포켓스퀘어용, 이름+HEX, [DATA] best 그대로)] [x58–96% ⑤ 수트 베이스 뉴트럴 4 스와치([DATA] suit_neutrals)]. " +
      "BAND4 y74–91%: [x4–40% ⑥ 피해야 할 색 4(각 짧은 이유)] [x42–73% ⑦ 베스트 매치 미니그리드: 셔츠화이트·헤어·렌즈·타이 칩] [x75–96% ⑧ 베스트 메탈(시계·커프스) 1줄 + QUICK TIP 1줄]. " +
      "색 휠은 쓰지 말 것 — 색은 스와치로만 표기(중복 금지). 신랑 몸 전체·부케·베일 금지."
    );
  }
  if (section === "hair") {
    return (
      SHARED_GROOM +
      data(
        `face_shape=${a.face_shape}; face_notes=${a.face_notes}; hair=밀도 ${a?.hair_attributes?.density}, 모질 ${a?.hair_attributes?.texture}, 굵기 ${a?.hair_attributes?.diameter}, 탄력 ${a?.hair_attributes?.elasticity}, 포로시티 ${a?.hair_attributes?.porosity}, 모류 ${a?.hair_attributes?.movement}; dye_shades=${swatches(a.dye_shades)}; cuts=${ranked(a.hair_cuts)}; beards=${ranked(a.beards)}`,
      ) +
      "\n[WIREFRAME] TITLE 'HAIRSTYLE BOARD' / SUB 'GROOM HAIR STYLING GUIDE'. " +
      "BAND1 y10–28%: [x4–28% 신랑 셀카 포트레이트] [x30–62% ① 얼굴형·골격: 머리 다이어그램에 볼륨 ADD vs REDUCE 영역 표시] [x64–96% ② 모발 분석 6항목([DATA] 값 그대로)]. " +
      "HERO BAND2 y29–52% (와이드): ③ 추천 컷 — [DATA] cuts 의 6종(투블럭·가르마·포마드·크롭 등)을 어울림 순으로 가로 2×3 미니썸네일(신랑 얼굴에 합성, 모두 동일 인물·이목구비 고정, 헤어만 다름). 각 썸네일에 [DATA] cuts 의 한국어 이름과 fit% 를 그대로 크게 표기(숫자 임의 생성 금지). " +
      "BAND3 y53–68% (2컬럼): [x4–46% ④ 수염·그루밍 — [DATA] beards 옵션을 어울림 순, 각 이름·fit% 를 [DATA] 그대로 표기(클린쉐이브/짧은수염/정돈수염을 신랑 얼굴에 각각 미리보기, 동일 인물)] [x48–96% ⑤ 헤어 컬러 예시 4종 — 신랑 머리를 각 염색 톤으로 실제로 보여주는 작은 미리보기(동일 인물, 헤어 컬러만 변경) + 이름·HEX([DATA] dye_shades)]. " +
      "BAND4 y69–82%: [x4–55% ⑥ 스타일링 유지 팁: 왁스/포마드/드라이 방향] [x58–96% 예식 헤어(가르마·볼륨) + 피해야 할 스타일 1줄]. " +
      "BAND5 y83–91% (와이드): ⑦ YOU IN DIFFERENT LOOKS — 신랑 head-and-shoulders 4변형(추천 컷/컬러/수염), 모두 동일 인물(이목구비 고정). " +
      " ★FACE CONSISTENCY (절대 규칙): 이 보드의 모든 얼굴(①③④⑤⑦)은 제공된 사진과 100% 동일 인물이다 — 이목구비·골격·피부톤·나이가 썸네일들 사이에서 조금도 달라지면 안 되며, 같은 얼굴을 그대로 복제하듯 모든 칸에 동일하게 그린다. 칸마다 다른 사람처럼 보이는 것을 절대 금지." +
      " ★HAIRSTYLE DIFFERENTIATION (절대 규칙): ③의 6개 썸네일은 각각 [DATA] cuts 의 이름대로 길이·볼륨·가르마·질감이 '한눈에 봐도 확연히 다르게' 보여야 한다 — 같은 헤어를 두 칸 이상에 반복 금지. ④는 수염 유무·길이가 또렷이 다르게, ⑤는 헤어 컬러가 또렷이 다르게, ⑦은 4개가 서로 명확히 구분되는 룩으로."
    );
  }
  if (section === "makeup") {
    // 신랑판 = 그루밍(메이크업 아님). 립·치크·아이 글램 대신 피부결·눈썹·수염·유분 관리.
    return (
      SHARED_GROOM +
      data(
        `face_shape=${a.face_shape}; corrections 눈가=${a?.grooming_corrections?.eye}, 코=${a?.grooming_corrections?.nose}, 피부=${a?.grooming_corrections?.skin}, 턱선=${a?.grooming_corrections?.jaw}; skin_base=${a.skin_type_base}; ` +
          `venue 홀=${a?.venue_grooming?.hall}, 야외=${a?.venue_grooming?.outdoor}, 스튜디오=${a?.venue_grooming?.studio}`,
      ) +
      "\n[WIREFRAME] TITLE 'GROOMING BOARD' / SUB 'GROOM GROOMING GUIDE'. " +
      "BAND1 y10–28%: [x4–28% 신랑 셀카 포트레이트] [x30–62% ① 페이셜 맵: 얼굴 라인드로잉에 눈썹 정리·수염 라인·피지 존 표시] [x64–96% ② 이목구비 보정: 눈가·코·피부·턱선 각 1팁([DATA])]. " +
      "HERO BAND2 y29–50% (와이드 3패널): ③ 장소별 그루밍 — 실내홀/야외·자연광/스튜디오, 각 신랑 얼굴 미리보기(동일 인물, 이목구비 고정). 세 패널은 피부결·유분감·눈썹 정돈이 확연히 다르게(홀=매트·유분억제·또렷음영 / 야외=속광·자연스러운 피부·가벼운 정돈 / 스튜디오=HD·균일한 피부·또렷한 눈썹) — 절대 같은 이미지 복붙 금지. 색조 메이크업(립·아이섀도)은 금지, 어디까지나 자연스러운 남성 그루밍. 각 패널 상단 홀/야외/스튜디오 라벨. " +
      "BAND3 y51–66%: [x4–48% ④ 스킨 준비 4단계: 클렌징·수분·피지컨트롤·톤보정([DATA] skin_base 기반)] [x52–96% ⑤ 눈썹·수염 정리 가이드: 자연 눈썹결·수염 라인·트리밍 길이]. " +
      "BAND4 y67–84% (와이드 3패널): ⑥ TRY-ON — 신랑 얼굴 자연/정돈/완성, 세 단계 그루밍 강도가 분명히 다르게(모두 동일 인물, 색조화장 없음). " +
      "BAND5 y85–91%: [x4–55% ⑦ 추천 케어 카테고리(수분크림·피지파우더·눈썹칼·트리머 타입)] [x58–96% ⑧ 피해야 할 것(과한 파운데이션·번들거림) + QUICK TIP]."
    );
  }
  // dress → 예복(수트 & 타이). 셀카 정직: 전신 금지, faceless 수트 croquis + 사진풍 오브젝트.
  return (
    SHARED_GROOM +
    data(
      `face_shape=${a.face_shape}; lapels=${ranked(a.lapels)}; suit_fits=${ranked(a.suit_fits)}; ` +
        `shirt_white=${a?.shirt_white?.name}(${a?.shirt_white?.hex}); metal=${a.metal}; season=${a.season_ko}; suit_colors=${swatches(a.suit_colors)}; tie_palette=${swatches(a.tie_palette)}`,
    ) +
    "\n[WIREFRAME] TITLE 'SUIT & TIE BOARD' / SUB 'GROOM SUIT STYLING GUIDE'. " +
    "BAND1 y10–28%: [x4–32% ① 라펠 매칭: 신랑 셀카(얼굴+목·어깨) 기준 1순위 라펠을 어깨라인 위 일러스트로 오버레이 + 이유] [x34–64% ② 추천 라펠 — [DATA] lapels 4종(노치/피크/숄/만다린)을 어울림 순 미니 일러스트(faceless 어깨 실루엣), 각 이름·fit% 를 [DATA] 그대로 표기] [x66–96% ③ 수트 컬러 스와치([DATA] suit_colors) + 셔츠화이트·메탈톤 칩]. " +
    "HERO BAND2 y29–54% (와이드 4컷): ④ 수트 핏 CROQUIS — [DATA] suit_fits 4종(슬림/레귤러/쓰리피스/턱시도)을 어울림 순 faceless 패션 일러스트(수트폼/마네킹), 각 컷에 [DATA] 의 이름·fit% 를 그대로 표기 + 핏·장소·소재 한 줄. 신랑 몸 금지. " +
    "BAND3 y55–70% (사진형 3패널): ⑤ 타이 3스타일 — 넥타이·보타이·노타이(오픈칼라), 실제 사진풍 + 시즌 타이 컬러 팔레트 칩([DATA] tie_palette, 이름+HEX). " +
    "BAND4 y71–91% (사진형 3컬럼): [⑥ 패브릭: 울·새틴(턱시도 라펠)·트위드·리넨·모헤어 실제 원단 텍스처 5종 + 광택·계절감] [⑦ 액세서리: 시계·포켓스퀘어·커프스·구두 실제 사진풍, BEST 행 vs AVOID 행] [⑧ 부토니에르·포켓스퀘어 폴딩 CROQUIS + 추천 1종]. 부케·베일 금지."
  );
}

// 보드 1장 생성 → consulting_board_done RPC 기록(성공 path / 실패 null)
async function generateBoard(
  admin: any,
  openaiKey: string,
  reportId: string,
  userId: string,
  section: Section,
  analysis: any,
  sourcePath: string,
) {
  const done = (path: string | null) =>
    admin.rpc("consulting_board_done", { p_report: reportId, p_section: section, p_path: path });
  try {
    const { data: blob, error: dlErr } = await admin.storage
      .from("invitation-uploads").download(sourcePath);
    if (dlErr || !blob) { await done(null); return; }
    // 성별은 분석 객체에 심어둔 값(START 모드에서 주입)을 신뢰한다. 기본=신부.
    const gender: "bride" | "groom" = analysis?.gender === "groom" ? "groom" : "bride";
    const form = new FormData();
    form.append("model", MODELS.image);
    form.append("prompt", boardPrompt(section, analysis ?? {}, gender));
    form.append("size", "1024x1536");
    // 헤어 보드는 얼굴 썸네일이 18개+라 medium 에선 디테일이 뭉개져(얼굴 드리프트·헤어 미분화)
    // high 로 렌더. 나머지 보드는 사용자 만족도·비용 위해 medium 유지.
    form.append("quality", section === "hair" ? "high" : "medium");
    form.append("n", "1");
    form.append("image[]", blob, `${gender}.png`);
    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: form,
    });
    if (!res.ok) { console.error("board openai", res.status, (await res.text()).slice(0, 160)); await done(null); return; }
    const d = (await res.json()) as { data: { b64_json?: string; url?: string }[] };
    const item = d.data?.[0];
    if (!item) { await done(null); return; }
    const outBlob = item.b64_json ? base64ToBlob(item.b64_json, "image/png") : await (await fetch(item.url!)).blob();
    const outPath = `${userId}/consulting/${section}-${crypto.randomUUID()}.png`;
    const { error: upErr } = await admin.storage
      .from("invitation-uploads").upload(outPath, outBlob, { contentType: "image/png", upsert: false });
    await done(upErr ? null : outPath);
  } catch (e) {
    console.error("board job error:", e);
    await done(null);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const body = (await req.json()) as {
      mode?: string; report_id?: string; section?: string;
      source_path?: string; sections?: string[]; gender?: string;
    };

    // ───────── BOARD 모드 (내부 self-invoke, 섹션 1장) ─────────
    if (body?.mode === "board") {
      if (req.headers.get("x-internal-secret") !== SERVICE_ROLE_KEY) {
        return json({ error: "forbidden" }, 403);
      }
      const reportId = body.report_id;
      const section = body.section as Section;
      if (!reportId || !section || !OPENAI_API_KEY) return json({ error: "bad_board_request" }, 400);
      const { data: rep } = await admin
        .from("wedding_consulting_reports")
        .select("user_id, source_path, analysis, status")
        .eq("id", reportId).single();
      if (!rep || rep.status !== "processing") return json({ ok: true }, 200);

      const boardJob = generateBoard(
        admin, OPENAI_API_KEY, reportId, rep.user_id, section, rep.analysis, rep.source_path,
      );
      // @ts-ignore EdgeRuntime 런타임 전역
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(boardJob);
      } else {
        await boardJob;
      }
      return json({ ok: true }, 202);
    }

    // ───────── START 모드 (사용자) ─────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const sourcePath = body.source_path;
    if (!sourcePath || !sourcePath.startsWith(`${userId}/`)) return json({ error: "invalid_source_path" }, 403);
    const sections = (body.sections ?? []).filter((s): s is Section =>
      (ALL_SECTIONS as readonly string[]).includes(s),
    );
    if (sections.length === 0) return json({ error: "no_sections" }, 400);
    // 성별 — 신랑판(예복·그루밍)은 프론트가 gender="groom" 을 보낸다. 기본=신부(회귀 0).
    const gender: "bride" | "groom" = body.gender === "groom" ? "groom" : "bride";
    if (!OPENAI_API_KEY) return json({ error: "openai_not_configured" }, 500);
    const MODEL = Deno.env.get("OPENAI_CONSULT_MODEL") ?? "gpt-5.5-2026-04-23";

    // 이중 제출 가드(15초) + 결제 전 사진 품질 게이트(fail-open) — 30하트 최고 단가라
    // 무효 사진(얼굴 없음/다인/완전 가림)을 차감 전에 반려. 원본은 분석 단계에서 재사용.
    if (await hasRecentPendingJob(admin, "wedding_consulting_reports", userId)) {
      return json({ error: "duplicate_request" }, 409);
    }
    // 잔액 선확인(읽기) — 잔액 0 사용자의 무료 게이트 폭주 차단(최소 1섹션 반값 기준).
    if (!(await hasHeartBalance(admin, userId, 5))) {
      return json({ error: "insufficient_hearts" }, 402);
    }
    const { data: sourceBlob } = await admin.storage.from("invitation-uploads").download(sourcePath);
    if (!sourceBlob) return json({ error: "source_download_failed" }, 400);
    const precheckFail = await precheckSourceImage(sourceBlob, Deno.env.get("GEMINI_API_KEY"));
    if (precheckFail) return json({ error: precheckFail }, 400);

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

    // 리포트(processing) 먼저 생성 → 워커가 이후 어디서 죽어도 reaper가 환불.
    const { data: rep, error: repErr } = await admin
      .from("wedding_consulting_reports")
      .insert({
        user_id: userId, sections, analysis: {}, results: [],
        status: "processing", source_path: sourcePath,
        charged: finalCost, discounted, boards_remaining: sections.length,
      })
      .select("id").single();
    if (repErr || !rep) { await refund(finalCost); return json({ error: "report_insert_failed" }, 500); }
    const reportId = rep.id as string;

    // 분석 + 팬아웃을 백그라운드로 → 즉시 202. (분석 1회 + 보드 dispatch 는 짧아 워커 한도 내)
    const orchestrate = (async () => {
      // Step A — Vision 분석(1회). 실패해도 빈 분석으로 진행(보드는 생성됨).
      let analysis: any = {};
      // 실패 사유를 어드민이 추적할 수 있도록 실제 원인(OpenAI status/예외)을 기록한다.
      // (이전엔 console.error 로만 남아 어드민에서 "왜 실패했는지" 확인 불가였음.)
      let failReason = "";
      try {
        const effort = Deno.env.get("OPENAI_CONSULT_EFFORT") ?? "low";
        const aiRes = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: MODEL,
            reasoning: { effort },
            instructions: gender === "groom" ? ANALYSIS_GUIDE_GROOM : ANALYSIS_GUIDE,
            input: [
              { role: "user", content: [
                { type: "input_text", text: `이 ${gender === "groom" ? "신랑" : "신부"} 사진을 분석해 위 JSON 을 채워줘.` },
                { type: "input_image", image_url: await (async () => {
                  // 원본은 품질 게이트 단계에서 이미 받아둠(sourceBlob) — 재다운로드 없음.
                  // 1바이트 문자열 연결(O(n) concat)은 20MB 에서 Edge CPU 리밋과 충돌 위험
                  // → 8KB 청크 변환(studioEdge.precheckSourceImage 와 동일 방식).
                  const buf = new Uint8Array(await sourceBlob.arrayBuffer());
                  let bin = "";
                  const CHUNK = 8192;
                  for (let i = 0; i < buf.length; i += CHUNK) {
                    bin += String.fromCharCode(...buf.subarray(i, i + CHUNK));
                  }
                  return `data:${sourceBlob.type || "image/png"};base64,${btoa(bin)}`;
                })() },
              ] },
            ],
            text: { format: { type: "json_object" } },
            max_output_tokens: 6000,
          }),
        });
        if (aiRes.ok) analysis = JSON.parse(extractOutputText(await aiRes.json()) || "{}");
        else {
          const body = (await aiRes.text()).slice(0, 300);
          failReason = `openai_${aiRes.status}: ${body}`;
          console.error("analysis fail", aiRes.status, body);
        }
      } catch (e) {
        failReason = `exception: ${String((e as Error)?.message ?? e)}`;
        console.error("analysis error", e);
      }
      // BOARD 모드(내부 self-invoke)가 성별을 알 수 있도록 분석 객체에 gender 를 심는다
      // (별도 컬럼 없이 jsonb 재사용 — 마이그레이션 불필요). 빈 분석이면 아래 analysisOk 에서 걸러짐.
      if (analysis && typeof analysis === "object") analysis.gender = gender;
      await admin.from("wedding_consulting_reports")
        .update({ analysis, updated_at: new Date().toISOString() }).eq("id", reportId);

      // 분석이 비면(모델 실패·파싱실패 등) 'undefined' 박힌 깨진 보드 대신 환불·실패 처리.
      const analysisOk = !!analysis && typeof analysis === "object" &&
        (!!analysis.season_ko || !!analysis.axes ||
          (Array.isArray(analysis.best_colors) && analysis.best_colors.length > 0));
      if (!analysisOk) {
        // 상태 전이 승자만 환불 — reaper(10분 후 processing 환불)와 이중 환불 차단.
        // 실제 원인(있으면) + 분석 비었음 표시. 어드민 실패 목록(admin_list_ai_failures)에서 확인.
        const errDetail = (failReason || "analysis_empty: 모델 응답이 비었거나 파싱 실패").slice(0, 500);
        const { data: won } = await admin.from("wedding_consulting_reports")
          .update({ status: "failed", error: errDetail, charged: 0, updated_at: new Date().toISOString() })
          .eq("id", reportId)
          .eq("status", "processing")
          .select("id");
        if (won && won.length > 0) await refund(finalCost);
        return;
      }

      // Step B — 섹션별 board 모드 self-invoke (각자 1장, 짧은 워커). 보드는 즉시 202.
      const selfUrl = `${SUPABASE_URL}/functions/v1/wedding-consulting`;
      await Promise.allSettled(
        sections.map((s) =>
          fetch(selfUrl, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              apikey: ANON_KEY,
              "x-internal-secret": SERVICE_ROLE_KEY,
            },
            body: JSON.stringify({ mode: "board", report_id: reportId, section: s }),
          }),
        ),
      );
    })();
    // @ts-ignore EdgeRuntime 런타임 전역
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(orchestrate);
    } else {
      await orchestrate;
    }

    return json({ report_id: reportId, status: "processing", charged: finalCost, discounted }, 202);
  } catch (e) {
    console.error("wedding-consulting fatal:", e);
    return json({ error: "server_error" }, 500);
  }
});
