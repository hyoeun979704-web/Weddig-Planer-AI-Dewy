import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Mail, Send, Paperclip, X, RefreshCw, Link2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MailItem { id: string; subject: string; from: string; date: string; snippet: string }
interface Attach { filename: string; mimeType: string; dataBase64: string; size: number }

const DRIVE_HINT = 18 * 1024 * 1024;
const fmt = (n: number) => (n >= 1 << 20 ? `${Math.round(n / (1 << 20))}MB` : `${Math.max(1, Math.round(n / 1024))}KB`);

const readAsBase64 = (f: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] ?? "");
    r.onerror = rej;
    r.readAsDataURL(f);
  });

/**
 * 인앱 메일(Gmail 연결). 앱 안에서 메일 읽기/보내기 + 대용량은 Drive 링크.
 * 설계: docs/260616_inapp_email_design.md. 미연결/미설정이면 '연결하기'만(dead-end 아님).
 */
const MailInbox = () => {
  const [params] = useSearchParams();
  const [checking, setChecking] = useState(true);
  const [connected, setConnected] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const [to, setTo] = useState(params.get("to") ?? "");
  const [subject, setSubject] = useState(params.get("subject") ?? "");
  const [bodyText, setBodyText] = useState(params.get("body") ?? "");
  const [attachments, setAttachments] = useState<Attach[]>([]);
  const [sending, setSending] = useState(false);

  const [items, setItems] = useState<MailItem[]>([]);
  const [listing, setListing] = useState(false);

  const checkStatus = useCallback(async () => {
    setChecking(true);
    const { data, error } = await supabase.rpc("get_my_mail_account" as any);
    if (error) console.error("mail status failed", error);
    const acc = (data ?? {}) as { connected?: boolean; email?: string };
    setConnected(!!acc.connected);
    setEmail(acc.email ?? null);
    setChecking(false);
  }, []);

  const loadMail = useCallback(async () => {
    setListing(true);
    const { data, error } = await supabase.functions.invoke("gmail-list", { body: { max: 20 } });
    setListing(false);
    if (error) { console.error("gmail-list failed", error); return; }
    setItems(((data as any)?.items ?? []) as MailItem[]);
  }, []);

  useEffect(() => { void checkStatus(); }, [checkStatus]);
  useEffect(() => { if (connected) void loadMail(); }, [connected, loadMail]);

  // OAuth 콜백 결과 토스트.
  useEffect(() => {
    const m = params.get("mail");
    if (m === "connected") toast.success("메일을 연결했어요");
    else if (m === "error") toast.error("메일 연결에 실패했어요");
  }, [params]);

  const connect = async () => {
    setConnecting(true);
    const { data, error } = await supabase.functions.invoke("mail-oauth-start", {
      body: { origin: window.location.origin, returnPath: "/mail" },
    });
    setConnecting(false);
    const url = (data as any)?.url;
    if (error || !url) {
      const code = (data as any)?.error;
      toast.error(code === "mail_not_configured" ? "메일 연동이 아직 설정되지 않았어요" : "연결을 시작하지 못했어요");
      return;
    }
    window.location.href = url;
  };

  const disconnect = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("user_mail_accounts" as any).delete().eq("user_id", u.user.id);
    setConnected(false); setEmail(null); setItems([]);
    toast.success("연결을 해제했어요");
  };

  const onPickFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const next: Attach[] = [];
    for (const f of files) {
      next.push({ filename: f.name, mimeType: f.type || "application/octet-stream", dataBase64: await readAsBase64(f), size: f.size });
    }
    setAttachments((p) => [...p, ...next]);
  };

  const totalSize = attachments.reduce((n, a) => n + a.size, 0);

  const send = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to.trim())) { toast.error("받는 사람 메일 주소를 확인해주세요"); return; }
    setSending(true);
    const { data, error } = await supabase.functions.invoke("gmail-send", {
      body: { to: to.trim(), subject, body: bodyText, attachments: attachments.map(({ filename, mimeType, dataBase64 }) => ({ filename, mimeType, dataBase64 })) },
    });
    setSending(false);
    if (error || (data as any)?.error) { toast.error("메일 전송에 실패했어요"); return; }
    toast.success("메일을 보냈어요");
    setSubject(""); setBodyText(""); setAttachments([]);
    void loadMail();
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background app-col mx-auto flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-background app-col mx-auto">
        <PageHeader title="메일" />
        <main className="px-6 py-16 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            업체와 주고받는 메일을 <b>앱 안에서</b> 확인하고 보낼 수 있어요.<br />
            대용량(원본 ZIP 등)은 자동으로 <b>Google Drive 링크</b>로 전달돼요.
          </p>
          <Button className="w-full h-11" onClick={connect} disabled={connecting}>
            {connecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-1.5" />}
            Gmail 연결하기
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background app-col mx-auto pb-10">
      <PageHeader title="메일" />
      <main className="px-4 py-5 space-y-5">
        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
          <span>{email}</span>
          <button onClick={disconnect} className="underline">연결 해제</button>
        </div>

        <section className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <h2 className="text-sm font-bold text-foreground">새 메일</h2>
          <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="받는 사람 (업체 이메일)" />
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="제목" maxLength={200} />
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            placeholder="내용"
            className="w-full h-32 p-3 rounded-md border border-input bg-background text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {attachments.length > 0 && (
            <ul className="space-y-1">
              {attachments.map((a, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-[12px] bg-muted/50 rounded px-2 py-1">
                  <span className="truncate">{a.filename} · {fmt(a.size)}</span>
                  <button onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
                </li>
              ))}
            </ul>
          )}
          {totalSize > DRIVE_HINT && (
            <p className="inline-flex items-center gap-1 text-[12px] text-primary">
              <Link2 className="w-3.5 h-3.5" /> 첨부가 커서 Google Drive 링크로 전달돼요
            </p>
          )}
          <label className="flex items-center justify-center gap-2 h-10 rounded-md border border-dashed border-input text-sm text-muted-foreground cursor-pointer">
            <Paperclip className="w-4 h-4" /> 파일 첨부
            <input type="file" multiple className="hidden" onChange={onPickFiles} />
          </label>
          <Button className="w-full h-10" onClick={send} disabled={sending}>
            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />} 보내기
          </Button>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">받은 메일</h2>
            <button onClick={loadMail} className="text-muted-foreground"><RefreshCw className={`w-4 h-4 ${listing ? "animate-spin" : ""}`} /></button>
          </div>
          {listing ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          ) : items.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">메일이 없어요.</p>
          ) : (
            items.map((m) => (
              <div key={m.id} className="bg-card rounded-xl border border-border p-3">
                <p className="text-[13px] font-semibold text-foreground truncate">{m.subject || "(제목 없음)"}</p>
                <p className="text-[11px] text-muted-foreground truncate">{m.from}</p>
                <p className="text-[12px] text-muted-foreground mt-1 line-clamp-2">{m.snippet}</p>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
};

export default MailInbox;
