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
 * OpenAI images/edits 1회 호출 → 결과 Blob. 실패 시 코드 문자열 throw
 * (예: "openai_429" / "no_image_returned") — 호출부가 markFailed/refund 분기.
 */
export async function callImageEdit(args: {
  apiKey: string;
  prompt: string;
  size: string;
  quality?: string;
  images: { blob: Blob; name: string }[];
}): Promise<Blob> {
  const form = new FormData();
  form.append("model", MODELS.image);
  form.append("prompt", args.prompt);
  form.append("size", args.size);
  form.append("quality", args.quality ?? "medium");
  form.append("n", "1");
  for (const img of args.images) form.append("image[]", img.blob, img.name);

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${args.apiKey}` },
    body: form,
  });
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

  const markFailed = async (rowId: string, reason: string) => {
    await client
      .from(table)
      .update({
        status: "failed",
        error_message: reason.substring(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", rowId);
  };

  const refund = async (reason: string, rowId?: string) => {
    try {
      await client.rpc("earn_hearts", {
        p_user_id: userId,
        p_amount: amount,
        p_reason: earnReason,
        p_ref_id: rowId ?? null,
      });
      if (rowId) {
        await client
          .from(table)
          .update({ status: "refunded", error_message: reason.substring(0, 500) })
          .eq("id", rowId);
      }
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
