// 인앱 메일 보내기 — 인증 사용자. RFC822 작성 후 Gmail messages.send.
// 첨부 합계가 크면(>18MB) Drive 업로드 후 공유 링크를 본문에 넣는다(Gmail 25MB 한도 대응).
// 설계: docs/260616_inapp_email_design.md.
import { corsHeaders } from "../_shared/cors.ts";
import { getValidAccessToken, gmailFetch, driveUploadAndShare } from "../_shared/googleMail.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ATTACH_LIMIT = 18 * 1024 * 1024; // 합계 18MB 초과 → Drive 링크

interface Attachment { filename: string; mimeType: string; dataBase64: string }

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
const b64url = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: cErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (cErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => null);
    const to = String(body?.to ?? "").trim();
    const subject = String(body?.subject ?? "").trim();
    let text = String(body?.body ?? "");
    const attachments: Attachment[] = Array.isArray(body?.attachments) ? body.attachments : [];
    if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return json({ error: "invalid_to" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);
    const token = await getValidAccessToken(admin, userId);
    if (!token) return json({ error: "not_connected" }, 409);

    // 첨부 합계 판정. 크면 Drive 링크로 전환.
    const total = attachments.reduce((n, a) => n + Math.floor((a.dataBase64?.length ?? 0) * 0.75), 0);
    let mimeAttachments: Attachment[] = attachments;
    if (total > ATTACH_LIMIT && attachments.length > 0) {
      const links: string[] = [];
      for (const a of attachments) {
        const link = await driveUploadAndShare(token, a.filename, b64ToBytes(a.dataBase64), a.mimeType || "application/octet-stream");
        if (link) links.push(`• ${a.filename}: ${link}`);
      }
      if (links.length > 0) text += `\n\n[첨부(대용량) — Google Drive 링크]\n${links.join("\n")}`;
      mimeAttachments = []; // 본문 링크로 대체
    }

    // RFC822 작성.
    const enc = new TextEncoder();
    const subjB64 = `=?UTF-8?B?${bytesToB64(enc.encode(subject))}?=`;
    let raw: string;
    if (mimeAttachments.length === 0) {
      raw =
        `To: ${to}\r\nSubject: ${subjB64}\r\nMIME-Version: 1.0\r\n` +
        `Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n` +
        bytesToB64(enc.encode(text));
    } else {
      const boundary = "dewy" + crypto.randomUUID();
      let parts =
        `To: ${to}\r\nSubject: ${subjB64}\r\nMIME-Version: 1.0\r\n` +
        `Content-Type: multipart/mixed; boundary=${boundary}\r\n\r\n` +
        `--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n` +
        bytesToB64(enc.encode(text)) + `\r\n`;
      for (const a of mimeAttachments) {
        // 헤더 인젝션 방지: 파일명에서 CR/LF/따옴표/역슬래시 제거(BCC 등 임의 헤더 주입 차단),
        // MIME 타입은 화이트리스트 패턴만 허용(아니면 기본값).
        const safeName = (a.filename || "file").replace(/[\r\n"\\]/g, "_").slice(0, 200);
        const safeMime = /^[\w.+-]+\/[\w.+-]+$/.test(a.mimeType || "")
          ? a.mimeType
          : "application/octet-stream";
        parts +=
          `--${boundary}\r\nContent-Type: ${safeMime}; name="${safeName}"\r\n` +
          `Content-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename="${safeName}"\r\n\r\n` +
          a.dataBase64 + `\r\n`;
      }
      parts += `--${boundary}--`;
      raw = parts;
    }

    const sendRes = await gmailFetch(token, `/users/me/messages/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw: b64url(raw) }),
    });
    if (!sendRes.ok) {
      console.error("gmail-send failed", sendRes.status, await sendRes.text());
      return json({ error: "send_failed" }, 502);
    }
    return json({ ok: true });
  } catch (e) {
    console.error("gmail-send error", e);
    return json({ error: "internal" }, 500);
  }
});
