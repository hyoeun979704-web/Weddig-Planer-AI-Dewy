import { corsWith } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 1:1 문의(inquiries) 접수 알림.
// Supabase Database Webhook(INSERT on public.inquiries)이 이 함수를 호출하면
// 운영자 메일로 새 문의를 보낸다. 관리자 UI 없이(=앱 무게 0) 메일로 바로 받고
// 회신할 수 있게 하는 게 목적이다. 전부 서버 사이드라 클라이언트 번들에 영향 없음.
//
// 필요 시크릿(Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY        : Resend(무료) API 키. 메일 발송용.
//   NOTIFY_WEBHOOK_SECRET : 이 엔드포인트 보호용 공유 비밀. Database Webhook 의
//                           커스텀 헤더 'x-webhook-secret' 와 동일하게 설정.
//   NOTIFY_TO   (선택)    : 받는 주소. 기본 kheceo@dewy-wedding.com
//   NOTIFY_FROM (선택)    : 보내는 주소. 기본 'Dewy <onboarding@resend.dev>'
//                           (도메인 인증 후 'Dewy <noreply@dewy-wedding.com>' 권장)
//
// 설치: docs/inquiry-notification-setup.md 참조.

const corsHeaders = corsWith(["x-webhook-secret"]);

const CATEGORY_LABEL: Record<string, string> = {
  reservation: "예약 문의",
  payment: "결제 문의",
  cancel: "취소/환불 문의",
  service: "서비스 이용 문의",
  partnership: "제휴/입점 문의",
  other: "기타 문의",
};

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  // 엔드포인트 보호: 시크릿 미설정이면 mis-config 로 막고, 설정 시 헤더 일치 요구.
  const expected = Deno.env.get("NOTIFY_WEBHOOK_SECRET");
  if (!expected) {
    console.error("notify-inquiry: NOTIFY_WEBHOOK_SECRET not set");
    return new Response("not configured", { status: 500, headers: corsHeaders });
  }
  if (req.headers.get("x-webhook-secret") !== expected) {
    return new Response("forbidden", { status: 401, headers: corsHeaders });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.error("notify-inquiry: RESEND_API_KEY not set");
    return new Response("not configured", { status: 500, headers: corsHeaders });
  }

  let record: Record<string, unknown> = {};
  try {
    const payload = await req.json();
    // Supabase webhook: { type, table, record, old_record, schema }
    record = (payload?.record ?? payload) as Record<string, unknown>;
  } catch {
    return new Response("bad request", { status: 400, headers: corsHeaders });
  }

  const category = String(record.category ?? "");
  const categoryLabel = CATEGORY_LABEL[category] ?? category ?? "문의";
  const title = String(record.title ?? "(제목 없음)");
  const content = String(record.content ?? "");
  const userId = String(record.user_id ?? "");
  const createdAt = String(record.created_at ?? new Date().toISOString());

  // 회신 주소(best-effort): user_id 로 문의자 이메일을 찾아 reply-to 로 설정.
  let replyTo: string | undefined;
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (url && serviceKey && userId) {
      const admin = createClient(url, serviceKey);
      const { data } = await admin.auth.admin.getUserById(userId);
      if (data?.user?.email) replyTo = data.user.email;
    }
  } catch (e) {
    console.error("notify-inquiry: lookup email failed", e);
  }

  const to = Deno.env.get("NOTIFY_TO") || "kheceo@dewy-wedding.com";
  const from = Deno.env.get("NOTIFY_FROM") || "Dewy <onboarding@resend.dev>";
  const subject = `[Dewy 문의] ${categoryLabel} - ${title}`;
  const html =
    `<h2>새 1:1 문의가 접수되었습니다</h2>` +
    `<p><b>유형:</b> ${esc(categoryLabel)}</p>` +
    `<p><b>제목:</b> ${esc(title)}</p>` +
    `<p><b>내용:</b></p><pre style="white-space:pre-wrap;font-family:inherit">${esc(content)}</pre>` +
    `<hr/><p style="color:#888;font-size:12px">문의자 ID: ${esc(userId)}` +
    (replyTo ? ` · 이메일: ${esc(replyTo)}` : "") +
    `<br/>접수 시각: ${esc(createdAt)}</p>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("notify-inquiry: resend failed", res.status, body);
      // 비-200 반환 → Supabase webhook 이 재시도.
      return new Response("send failed", { status: 502, headers: corsHeaders });
    }
  } catch (e) {
    console.error("notify-inquiry: resend error", e);
    return new Response("send error", { status: 502, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
