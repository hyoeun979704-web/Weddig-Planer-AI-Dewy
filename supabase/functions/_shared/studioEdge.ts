// AI 스튜디오 엣지 함수 공용 골격 — 단일 소스.
//
// 배경: dewy-fitting/dewy-sdm/dewy-makeup/dewy-dress-recommend/dewy-makeup-recommend 가
// json/downloadFromStorage/downloadFromUrl/base64ToBlob/markFailed/refundHearts/인증
// 보일러플레이트를 각자 복붙하고 있었다(드리프트 위험). 여기로 모은다.
// 테이블·환불 사유 등 함수별 차이는 파라미터로 받는다(동작 불변).
//
// Deno 전용(플랫폼 API 사용) — 순수 프롬프트 모듈(studio/*)과 분리 유지.

import { corsHeaders } from "./cors.ts";
import { MODELS } from "./llm.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type AnyClient = ReturnType<typeof createClient>;

export function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Bearer JWT 검증 → userId. 실패 시 null(호출부가 401 응답). */
export async function authenticateUser(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabaseUser.auth.getClaims(token);
  if (error || !data?.claims) return null;
  return data.claims.sub as string;
}

export async function downloadFromStorage(
  client: AnyClient,
  bucket: string,
  path: string,
): Promise<Blob> {
  const { data, error } = await client.storage.from(bucket).download(path);
  if (error || !data) throw new Error(`storage download fail: ${path}`);
  return data;
}

export async function downloadFromUrl(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`url download fail: ${url}`);
  return await res.blob();
}

export function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * OpenAI images/edits 호출 → 결과 Blob. 일시 장애는 2초 후 재시도 — 네트워크 실패
 * 1회 + HTTP 429/5xx 1회, 최악 총 3회 시도 상한(월클럭 한도 내, 재시도 폭주 금지).
 * 그 외/재실패는 코드 문자열 throw(예: "openai_429") — 호출부가 markFailed/refund 분기.
 */
export async function callImageEdit(args: {
  apiKey: string;
  prompt: string;
  size: string;
  quality?: string;
  images: { blob: Blob; name: string }[];
}): Promise<Blob> {
  const attempt = async (): Promise<Response> => {
    const form = new FormData();
    form.append("model", MODELS.image);
    form.append("prompt", args.prompt);
    form.append("size", args.size);
    form.append("quality", args.quality ?? "medium");
    form.append("n", "1");
    for (const img of args.images) form.append("image[]", img.blob, img.name);
    return await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${args.apiKey}` },
      body: form,
    });
  };

  let res: Response;
  try {
    res = await attempt();
  } catch (e) {
    // 네트워크 단계 실패 — 1회 재시도
    console.warn("image edit network error, retrying once:", e);
    await new Promise((r) => setTimeout(r, 2000));
    res = await attempt();
  }
  if (res.status === 429 || res.status >= 500) {
    console.warn(`OpenAI ${res.status}, retrying once:`, (await res.text()).slice(0, 200));
    await new Promise((r) => setTimeout(r, 2000));
    res = await attempt();
  }
  if (!res.ok) {
    // 원시 외부 에러는 서버 로그에만(클라엔 제네릭 코드 — PII/정책문구 노출 금지)
    console.error(`OpenAI error ${res.status}:`, (await res.text()).slice(0, 300));
    throw new Error(`openai_${res.status}`);
  }
  const data = (await res.json()) as { data: { b64_json?: string; url?: string }[] };
  const item = data.data?.[0];
  if (!item) throw new Error("no_image_returned");
  return item.b64_json
    ? base64ToBlob(item.b64_json, "image/png")
    : await (await fetch(item.url!)).blob();
}

/**
 * 결제 전 사진 품질 게이트 — Gemini Flash 비전으로 얼굴 수·가림을 검사한다.
 * 하트 차감 전에 명백한 무효 사진(얼굴 없음/다인/완전 가림)을 반려해 실패 생성과
 * CS(환불 분쟁)를 예방한다(경쟁 앱 공통 표준 — SNOW·EPIK·妙鸭 업로드 가이드).
 *
 * fail-open: GEMINI_API_KEY 없음·호출 실패·파싱 실패면 통과(머니패스는 게이트
 * 장애로 절대 죽지 않는다). 차단은 확실한 경우만(보수적) — 블러 등 애매한 신호는
 * 차단하지 않는다(멀쩡한 사진 오차단 방지).
 *
 * 반환: null = 통과 / 코드 문자열 = 반려 사유("no_face_detected"|"multiple_faces"|"face_fully_covered")
 */
export async function precheckSourceImage(
  blob: Blob,
  geminiKey: string | undefined,
): Promise<string | null> {
  if (!geminiKey) return null;
  try {
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = "";
    const CHUNK = 8192;
    for (let i = 0; i < buf.length; i += CHUNK) {
      bin += String.fromCharCode(...buf.subarray(i, i + CHUNK));
    }
    const b64 = btoa(bin);
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.geminiFlash}:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              {
                text:
                  "이 사진이 '한 사람'의 AI 합성 소스로 쓸 수 있는지 검사해라. " +
                  "face_count 는 사진 속 실제 사람 얼굴 수(포스터·화면 속 얼굴 제외). " +
                  "face_fully_covered 는 마스크·선글라스 등으로 이목구비 대부분이 가려져 " +
                  "얼굴 식별이 불가능할 때만 true(모자·안경·부분 가림은 false).",
              },
              { inline_data: { mime_type: blob.type || "image/jpeg", data: b64 } },
            ],
          }],
          generationConfig: {
            temperature: 0,
            response_mime_type: "application/json",
            response_schema: {
              type: "object",
              properties: {
                face_count: { type: "integer" },
                face_fully_covered: { type: "boolean" },
              },
              required: ["face_count", "face_fully_covered"],
            },
          },
        }),
      },
    );
    if (!resp.ok) {
      console.warn("precheck gemini", resp.status);
      return null; // fail-open
    }
    const data = await resp.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    const parsed = JSON.parse(text) as { face_count?: number; face_fully_covered?: boolean };
    if (typeof parsed.face_count !== "number") return null;
    if (parsed.face_count === 0) return "no_face_detected";
    if (parsed.face_count > 1) return "multiple_faces";
    if (parsed.face_fully_covered === true) return "face_fully_covered";
    return null;
  } catch (e) {
    console.warn("precheck fail-open:", e);
    return null;
  }
}

/**
 * 잔액 선확인(읽기) — Gemini 품질 게이트가 하트 차감 **앞**이라, 잔액 0 사용자가
 * 게이트(스토리지 다운로드+Gemini 호출)를 무한 반복해 비용을 태울 수 있는 표면을
 * 차단한다. 부족 확정 시에만 false(fail-open: 행 없음/조회 실패는 통과 — 실제
 * 차감 검증은 spend_hearts 가 원자적으로 수행).
 */
export async function hasHeartBalance(
  client: AnyClient,
  userId: string,
  amount: number,
): Promise<boolean> {
  try {
    const { data, error } = await client
      .from("user_hearts")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return true; // fail-open
    return (data.balance as number) >= amount;
  } catch {
    return true;
  }
}

/**
 * 이중 제출(더블탭·재시도) 가드 — 같은 사용자의 최근 N초 내 pending/processing 잡이
 * 있으면 true. 하트 차감 전에 검사해 이중 차감을 막는다(호출부는 409 duplicate_request).
 * 조회 실패 시 false(fail-open — 가드 장애로 머니패스를 막지 않는다).
 */
export async function hasRecentPendingJob(
  client: AnyClient,
  table: string,
  userId: string,
  withinSeconds = 15,
): Promise<boolean> {
  try {
    const since = new Date(Date.now() - withinSeconds * 1000).toISOString();
    const { data, error } = await client
      .from(table)
      .select("id")
      .eq("user_id", userId)
      .in("status", ["pending", "processing"])
      .gte("created_at", since)
      .limit(1);
    if (error) return false;
    return (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * 단건 잡(dress_fittings/makeup_fittings/sdm_previews 계열: status/error_message/
 * hearts_spent 스키마) 실패·환불 핸들러 팩토리. earnReason 은 함수별 기존 문자열 유지.
 */
export function makeJobFailureHandlers(opts: {
  client: AnyClient;
  table: string;
  userId: string;
  amount: number;
  earnReason: string;
}) {
  const { client, table, userId, amount, earnReason } = opts;

  // 원시 예외 메시지는 서버 로그에만 — error_message 는 RLS self-read 로 사용자에게
  // 노출되므로 코드형 문자열만 저장(내부 URL/스택 누출 방지).
  const safeReason = (reason: string) =>
    /^[a-z0-9_]{1,64}$/.test(reason) ? reason : "inner_error";

  const markFailed = async (rowId: string, reason: string) => {
    await client
      .from(table)
      .update({
        status: "failed",
        error_message: safeReason(reason),
        updated_at: new Date().toISOString(),
      })
      .eq("id", rowId);
  };

  // 이중 환불 차단: 상태 전이(pending/failed→refunded)에서 이긴 호출만 earn_hearts.
  // reaper(10분 후 pending→failed+환불)와 함수 환불이 겹쳐도 한쪽만 지급된다.
  // (markFailed 를 먼저 부른 경로도 있으므로 'failed' 도 전이 허용 — 단 reaper 가
  //  이미 'failed'+환불 처리한 행은 reaper 의 error_message='timeout_reaped' 로 식별해 제외.)
  const refund = async (reason: string, rowId?: string) => {
    try {
      if (rowId) {
        const { data: won, error } = await client
          .from(table)
          .update({ status: "refunded", error_message: safeReason(reason) })
          .eq("id", rowId)
          .in("status", ["pending", "failed"])
          .neq("error_message", "timeout_reaped")
          .select("id");
        if (error || !won || won.length === 0) return; // 전이 패배 = 이미 환불(reaper 등)
      }
      await client.rpc("earn_hearts", {
        p_user_id: userId,
        p_amount: amount,
        p_reason: earnReason,
        p_ref_id: rowId ?? null,
      });
    } catch (e) {
      console.error("refund failed:", e);
    }
  };

  return { markFailed, refund };
}

/** spend_hearts 차감. 성공 시 {balanceAfter}, 실패 시 에러 Response 를 반환. */
export async function spendHearts(
  client: AnyClient,
  userId: string,
  amount: number,
  reason: string,
): Promise<{ balanceAfter: number } | Response> {
  const { data, error } = await client.rpc("spend_hearts", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_ref_id: null,
  });
  if (error) {
    console.error("spend_hearts error:", error);
    return json({ error: "hearts_error" }, 500);
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.success) {
    return json({ error: "insufficient_hearts", message: row?.message }, 402);
  }
  return { balanceAfter: row.balance_after as number };
}

/** 응답 후에도 백그라운드 잡 유지(Supabase Edge 런타임) — 로컬/폴백은 await. */
export async function runInBackground(job: Promise<void>): Promise<void> {
  // @ts-ignore EdgeRuntime 은 런타임 전역
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(job);
  } else {
    await job;
  }
}
