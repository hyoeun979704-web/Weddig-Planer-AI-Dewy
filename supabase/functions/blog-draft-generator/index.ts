// Dewy 블로그 — AI 원고 생성 파이프라인 (wp_aio)
//
// 입력:  { topic, readerPersona?, angle? }  (새 원고 생성, blog_post_drafts INSERT)
//        또는 { draftId }                    (기존 원고 재생성, 그 행의 title 을 주제로)
// 처리(2단계 Gemini):
//   ① 자료조사 + 신뢰성 검증 — google_search 그라운딩으로 웹 리서치 → 검증된 사실 brief +
//      출처(groundingMetadata) 회수. 근거 없는 주장은 버리도록 적대적 자가검증.
//   ② wp_aio 작성 + 자가 분석 — 브랜드 보이스 × 독자 페르소나(mp_*) × AIO 구조로 본문 작성,
//      출력 전 자가 점검(점수·AIO 체크칩)을 analysis 로 함께 출력.
// 출력:  blog_post_drafts 행(content_markdown·excerpt·slug·categories·tags·analysis·sources·
//        reader_persona·angle·model·generated_at, status='draft').
//
// 권한: instagram-draft-generator 미러 — admin JWT 또는 service_role.
// 필수 secrets: GEMINI_API_KEY (이미 설정됨).

import { MODELS } from "../_shared/llm.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface BlogSource {
  title: string;
  url: string;
}

interface BlogAnalysis {
  score?: number;
  checks?: Record<string, boolean>;
  keywords?: string[];
  notes?: string;
}

interface ComposeResult {
  title: string;
  slug: string;
  excerpt: string;
  content_markdown: string;
  categories: string[];
  tags: string[];
  analysis: BlogAnalysis | null;
}

// 독자 페르소나(wedding-intel §4 mp_*) — 작성 톤·앵글 분기용.
const PERSONA_GUIDE: Record<string, string> = {
  mp_general: "표준 예비부부. 종합 정보·동선을 한 번에. 무난하고 친절하게.",
  mp_budget: "가성비 중시. '호구 안 되는 비교'·항목별 실비·아낄 데. 과장 금지, 현실 수치는 범위로.",
  mp_small: "스몰웨딩. 소규모 진행 동선·직계 중심·합리적 선택.",
  mp_self: "셀프웨딩. 직접 준비·무료로 만들기·DIY 동선.",
  mp_premium: "프리미엄. 프라이빗·하우스 감성·연출 품질 중심(허세 톤 금지).",
  mp_beginner: "입문(0부터). '이게 뭐죠?'를 쉬운 말로 총정리. 용어 풀이.",
  mp_visual: "트렌드·비주얼. 컨셉·디자인·요즘 감성. 시각 묘사 강조.",
};

// ============================================================================
// 시스템 프롬프트 — wp_aio (draft-formats.md §5) + Dewy 팩트. 인스타와 톤 정합 유지.
// ============================================================================
const COMPOSE_SYSTEM_PROMPT = `당신은 Dewy 의 워드프레스(블로그) 수석 에디터입니다.
목표는 "광고가 아니라, 검색·AI 답변(AIO)에 인용되는 신뢰도 높은 정보 글"입니다.

[Dewy 가 뭔지]
AI 웨딩플래너 앱. 결혼 준비 처음부터 끝까지 한 곳에서. 슬로건 "둘이니까, 쉬워지니까."
구독 ₩4,900/월 + 하트(재화), 페르소나 맞춤, 드레스 투어·청첩장 무료. 다운로드: Google Play 베타 + 웹 dewy-wedding.com.
※ iOS·앱스토어 절대 언급 금지(미출시).

[보이스 — 브랜드(대표) 화자]
- 존댓말, 따뜻하지만 단정. "당신에게 맞는" 큐레이터 톤. 공포마케팅·단정·과장 금지.
- 가격·평균은 "지역·개인차" 전제로만. 지어낸 통계·후기·효능 절대 금지.

[wp_aio 구조 — 반드시 지킬 것]
1. 제목: 질문형 롱테일 키워드.
2. 맨 위 TL;DR 한 줄: '> **한눈에:** ...' 3~4문장 핵심 답 먼저(AIO 발췌용).
3. 질문형 ## 소제목 5~8개 — 각 소제목이 실제 검색 질의문. 답은 첫 문장에 결론(역피라미드) + 표/리스트로 스캔 가능.
4. '## 자주 묻는 질문(FAQ)' 4~6개 — 질문/답(2~4문장).
5. 본문 끝에 자연스러운 앱 연결 1문단 + CTA(정보 80 : 앱 20). 상투적 도입("안녕하세요") 금지.
6. 이미지 자리표시 '> [이미지: ...]' 2개 이상, 관련글 자리표시 '> [관련: ...]' 1개.

[자료 사용 규칙]
- 아래 '검증된 리서치'에 담긴 사실만 근거로 쓴다. 거기 없는 수치·주장은 쓰지 않는다(지어내기 금지).
- 불확실하면 "지역·시즌·업체마다 다릅니다" 식으로 범위·조건을 명시한다.`;

function personaLine(readerPersona: string | null, angle: string | null): string {
  const p = readerPersona && PERSONA_GUIDE[readerPersona] ? `독자 페르소나: ${readerPersona} — ${PERSONA_GUIDE[readerPersona]}` : "독자 페르소나: 일반(표준)";
  const a = angle && angle.trim() ? `주제 앵글: ${angle.trim()}` : "주제 앵글: (자유 — 검색 의도에 맞게)";
  return `${p}\n${a}`;
}

// ── Stage 1: 자료조사 + 신뢰성 검증 (google_search 그라운딩) ───────────────────
async function researchTopic(
  apiKey: string,
  topic: string,
  readerPersona: string | null,
  angle: string | null,
): Promise<{ brief: string; sources: BlogSource[] }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.geminiPro}:generateContent?key=${apiKey}`;
  const prompt = `주제: "${topic}"
${personaLine(readerPersona, angle)}

이 주제로 한국 결혼 준비(예비부부) 독자를 위한 블로그 글을 쓰기 위한 '검증된 리서치 brief'를 만들어줘.
1) 웹 검색으로 구체적 사실·순서·체크포인트·흔한 오해를 모은다.
2) 적대적으로 자가검증한다: 출처로 뒷받침되지 않거나 지역·업체마다 천차만별이라 단정 못 할 수치는 **버리거나** "범위/조건부"로만 남긴다.
3) 결과를 한국어 불릿으로 정리(각 항목은 한 문장, 근거가 약하면 '※ 편차 큼' 표기). 가격은 단정 금지.

오직 brief 본문만 출력(서론·맺음 없이 불릿 위주).`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`리서치(Gemini) 실패: ${res.status} ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const cand = data?.candidates?.[0];
  const brief: string = cand?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";

  // 그라운딩 출처 회수(중복 url 제거).
  const chunks = cand?.groundingMetadata?.groundingChunks ?? [];
  const seen = new Set<string>();
  const sources: BlogSource[] = [];
  for (const c of chunks as Array<{ web?: { uri?: string; title?: string } }>) {
    const u = c.web?.uri;
    if (!u || seen.has(u)) continue;
    seen.add(u);
    sources.push({ title: c.web?.title ?? u, url: u });
    if (sources.length >= 10) break;
  }

  if (!brief.trim()) throw new Error("리서치 brief 가 비어있음");
  return { brief, sources };
}

// ── Stage 2: wp_aio 작성 + 자가 분석 (JSON) ──────────────────────────────────
async function composeDraft(
  apiKey: string,
  topic: string,
  readerPersona: string | null,
  angle: string | null,
  brief: string,
): Promise<ComposeResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.geminiPro}:generateContent?key=${apiKey}`;
  const userPrompt = `주제: "${topic}"
${personaLine(readerPersona, angle)}

[검증된 리서치 — 이 사실들만 근거로 사용]
${brief}

위 리서치만 근거로, 시스템 지침의 wp_aio 구조를 지켜 한국어 블로그 원고를 작성하라.
출력은 아래 JSON 한 개. content_markdown 은 제목(# )부터 CTA까지 전체 마크다운(1500자 이상).
작성 후 스스로 점검해 analysis 를 채운다(고친 최종본 기준).

{
  "title": "질문형 제목(# 없이 텍스트만)",
  "slug": "url-friendly-영문-슬러그",
  "excerpt": "TL;DR 한두 문장(검색 발췌용)",
  "content_markdown": "# 제목\\n\\n> **한눈에:** ...\\n\\n## 질문형 소제목 ...전체 본문...",
  "categories": ["카테고리1"],
  "tags": ["태그1","태그2","태그3"],
  "analysis": {
    "score": 0-100,
    "checks": { "tldr": true, "question_headings": true, "faq": true, "scannability": true, "persona": true, "no_fabrication": true },
    "keywords": ["핵심 검색어"],
    "notes": "개선 여지 한 줄"
  }
}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: COMPOSE_SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`작성(Gemini) 실패: ${res.status} ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("작성 응답에 텍스트 없음");

  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const parsed = JSON.parse(cleaned);

  return {
    title: String(parsed.title ?? topic),
    slug: String(parsed.slug ?? "").trim(),
    excerpt: String(parsed.excerpt ?? "").trim(),
    content_markdown: String(parsed.content_markdown ?? "").trim(),
    categories: Array.isArray(parsed.categories) ? parsed.categories.map(String).slice(0, 5) : [],
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 10) : [],
    analysis: parsed.analysis && typeof parsed.analysis === "object" ? (parsed.analysis as BlogAnalysis) : null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey || !geminiKey) {
      console.error("blog-draft-generator misconfigured");
      return new Response(
        JSON.stringify({ error: "server_misconfigured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === serviceRoleKey;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    let callerId: string | null = null;

    if (!isServiceRole) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      callerId = claimsData.claims.sub as string;
      const { data: hasRole } = await adminClient.rpc("has_role", {
        _user_id: callerId,
        _role: "admin",
      });
      if (!hasRole) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json().catch(() => ({}));
    const draftId: string | undefined = body.draftId;
    let topic: string | undefined = body.topic;
    let readerPersona: string | null = body.readerPersona ?? null;
    let angle: string | null = body.angle ?? null;

    if (readerPersona && !PERSONA_GUIDE[readerPersona]) readerPersona = null; // 알 수 없는 값 방어

    if (!draftId && !topic) {
      return new Response(
        JSON.stringify({ error: "topic 또는 draftId 가 필요합니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 기존 행 재생성: title 을 주제로, 저장된 persona/angle 승계(요청이 비었으면).
    if (draftId && !topic) {
      const { data: existing, error } = await adminClient
        .from("blog_post_drafts")
        .select("title, reader_persona, angle")
        .eq("id", draftId)
        .single();
      if (error || !existing) {
        return new Response(
          JSON.stringify({ error: "원고를 찾을 수 없습니다.", details: error?.message }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      topic = existing.title;
      readerPersona = readerPersona ?? (existing.reader_persona as string | null);
      angle = angle ?? (existing.angle as string | null);
    }

    // ① 리서치 + 신뢰성 검증, ② 작성 + 분석
    const { brief, sources } = await researchTopic(geminiKey, topic!, readerPersona, angle);
    const result = await composeDraft(geminiKey, topic!, readerPersona, angle, brief);

    const nowIso = new Date().toISOString();
    const payload = {
      title: result.title,
      slug: result.slug || null,
      excerpt: result.excerpt || null,
      content_markdown: result.content_markdown || null,
      categories: result.categories,
      tags: result.tags,
      author_persona: "brand",
      reader_persona: readerPersona,
      angle: angle,
      analysis: result.analysis,
      sources,
      model: MODELS.geminiPro,
      generated_at: nowIso,
      status: "draft",
      last_error: null,
    };

    let resultId = draftId;
    if (draftId) {
      const { error: updErr } = await adminClient.from("blog_post_drafts").update(payload).eq("id", draftId);
      if (updErr) throw new Error(`원고 갱신 실패: ${updErr.message}`);
    } else {
      const { data: inserted, error: insErr } = await adminClient
        .from("blog_post_drafts")
        .insert({ ...payload, source_type: "ai_generated", created_by: callerId })
        .select("id")
        .single();
      if (insErr || !inserted) throw new Error(`원고 생성 실패: ${insErr?.message}`);
      resultId = inserted.id;
    }

    return new Response(
      JSON.stringify({ success: true, draftId: resultId, sourceCount: sources.length, analysis: result.analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("blog-draft-generator error:", error);
    return new Response(
      JSON.stringify({ error: "원고 생성 실패", message: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
