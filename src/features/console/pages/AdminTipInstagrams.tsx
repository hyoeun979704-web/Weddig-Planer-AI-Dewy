import { useEffect, useState, useCallback } from "react";
import { Loader2, Check, X, Plus, ExternalLink, Instagram, AlertCircle, Trash2, ImageDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AdminGuard from "@/features/console/components/AdminGuard";
import AdminLayout from "@/features/console/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Instagram 게시물 큐레이션 + 검토 페이지.
 *
 * 흐름:
 *  1. 운영자가 인스타 URL + 메타 (제목·작성자·카테고리·썸네일) 입력
 *  2. INSERT (moderation_status='pending')
 *  3. 검토 후 승인 → 사용자 화면 노출
 *
 * 인스타 자체 API 제약으로 og:image 자동 fetch 는 한계 — 일단 운영자가 직접
 * 썸네일 URL 입력하거나 빈 채로 등록 (UI 에서 placeholder 그라데이션 fallback).
 */

const CATEGORIES = [
  { value: "wedding_hall", label: "웨딩홀" },
  { value: "studio", label: "스튜디오" },
  { value: "dress_shop", label: "드레스" },
  { value: "makeup_shop", label: "메이크업" },
  { value: "hanbok", label: "한복" },
  { value: "tailor_shop", label: "예복" },
  { value: "honeymoon", label: "신혼여행" },
  { value: "wedding_gifts", label: "예단·예물" },
  { value: "newlywed_home", label: "신혼집" },
  { value: "family_meeting", label: "상견례" },
  { value: "bridal_care", label: "신부관리" },
  { value: "ceremony", label: "본식" },
  { value: "invitation_venue", label: "청첩장" },
  { value: "appliance", label: "혼수" },
  { value: "pregnancy_wedding", label: "임신 결혼" },
  { value: "remarriage_family", label: "재혼 가족" },
  { value: "international_wedding", label: "국제결혼" },
  { value: "self_no_ceremony", label: "노웨딩" },
  { value: "groom_focus", label: "신랑 단독" },
  { value: "general", label: "일반" },
];

interface InstagramPost {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  author: string | null;
  thumbnail_url: string | null;
  categories: string[];
  moderation_status: string;
  moderation_note: string | null;
  collected_at: string;
}

interface FormState {
  url: string;
  title: string;
  description: string;
  author: string;
  thumbnail_url: string;
  category: string;
}

const emptyForm: FormState = {
  url: "",
  title: "",
  description: "",
  author: "",
  thumbnail_url: "",
  category: "general",
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: "검토 대기", color: "bg-amber-100 text-amber-700" },
  approved: { label: "노출중", color: "bg-green-100 text-green-700" },
  rejected: { label: "반려", color: "bg-destructive/10 text-destructive" },
};

// 자주 쓰이는 인스타 큐레이션 반려 사유. 다중 선택 + '기타' textarea 로 보완.
const REJECT_REASONS = [
  "웨딩 관련 콘텐츠 부족",
  "광고/홍보 과다",
  "비활성 (최근 게시물 없음)",
  "중복 계정",
  "비공개 / 접근 불가",
  "게시물 수 부족",
  "이미지 품질 낮음",
  "카테고리 매칭 안 됨",
] as const;

// 릴스 자동 수집 패널 — 큐레이션한 비즈니스 계정 소스 관리 + "지금 수집"(Business Discovery).
function ReelAutoCollect({ onCollected }: { onCollected: () => void }) {
  interface Acc { username: string; category: string; is_active: boolean; last_synced_at: string | null; last_sync_new: number | null; last_sync_error: string | null }
  const [accounts, setAccounts] = useState<Acc[]>([]);
  const [username, setUsername] = useState("");
  const [category, setCategory] = useState("general");
  const [busy, setBusy] = useState(false);
  const [collecting, setCollecting] = useState(false);

  const load = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("tip_instagram_accounts")
      .select("username,category,is_active,last_synced_at,last_sync_new,last_sync_error")
      .order("added_at", { ascending: false });
    setAccounts((data ?? []) as Acc[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const addAccount = async () => {
    const u = username.trim().replace(/^@/, "");
    if (!u) return;
    setBusy(true);
    const { error } = await (supabase as any)
      .from("tip_instagram_accounts")
      .upsert({ username: u, category }, { onConflict: "username" });
    setBusy(false);
    if (error) { toast({ title: "추가 실패", description: error.message, variant: "destructive" }); return; }
    setUsername("");
    await load();
  };
  const removeAccount = async (u: string) => {
    await (supabase as any).from("tip_instagram_accounts").delete().eq("username", u);
    await load();
  };
  const collect = async () => {
    setCollecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("instagram-collect-reels", { body: {} });
      if (error) throw error;
      const r = data as { total_new?: number; accounts?: number; error?: string };
      if (r.error) throw new Error(r.error);
      toast({ title: "수집 완료", description: `${r.accounts ?? 0}개 계정에서 신규 릴스 ${r.total_new ?? 0}건` });
      await load();
      onCollected();
    } catch (e) {
      toast({ title: "수집 실패", description: e instanceof Error ? e.message : "Meta 토큰/앱 설정을 확인하세요", variant: "destructive" });
    } finally {
      setCollecting(false);
    }
  };

  return (
    <div className="mb-5 rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold">릴스 자동 수집 <span className="font-normal text-muted-foreground">· 비즈니스 계정</span></h3>
        <Button size="sm" onClick={collect} disabled={collecting || accounts.length === 0}>
          {collecting ? <Loader2 className="w-4 h-4 animate-spin" /> : "지금 수집"}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">
        큐레이션한 비즈니스/크리에이터 계정의 최근 릴스를 Business Discovery 로 수집해 검토 대기로 적재합니다. (Meta 토큰·앱 심사 필요)
      </p>
      <div className="flex gap-2 mb-3">
        <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@username (비즈니스 계정)" className="flex-1" />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={addAccount} disabled={busy || !username.trim()}>추가</Button>
      </div>
      {accounts.length > 0 && (
        <div className="space-y-1.5">
          {accounts.map((a) => (
            <div key={a.username} className="flex items-center gap-2 text-xs">
              <span className="font-medium text-foreground">@{a.username}</span>
              <span className="text-muted-foreground">{CATEGORIES.find((c) => c.value === a.category)?.label ?? a.category}</span>
              {a.last_synced_at && <span className="text-muted-foreground">· 신규 {a.last_sync_new ?? 0}</span>}
              {a.last_sync_error && <span className="text-destructive truncate max-w-[140px]" title={a.last_sync_error}>· 오류</span>}
              <button onClick={() => removeAccount(a.username)} className="ml-auto p-1 hover:bg-muted rounded" aria-label="삭제">
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const AdminTipInstagrams = () => {
  const [items, setItems] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [mirroring, setMirroring] = useState(false);
  const [mirroringId, setMirroringId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReasons, setRejectReasons] = useState<string[]>([]);
  const [rejectNote, setRejectNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    let q = (supabase as any)
      .from("tip_instagrams")
      .select(
        "id, url, title, description, author, thumbnail_url, categories, moderation_status, moderation_note, collected_at",
      )
      .order("collected_at", { ascending: false });
    if (filter === "pending") q = q.eq("moderation_status", "pending");
    const { data, error } = await q;
    setLoading(false);
    if (error) {
      toast({ title: "불러오기 실패", description: error.message, variant: "destructive" });
      return;
    }
    setItems((data ?? []) as InstagramPost[]);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!form.url.trim() || !form.url.includes("instagram.com")) {
      toast({ title: "Instagram URL 을 입력해주세요", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      url: form.url.trim(),
      title: form.title.trim() || null,
      description: form.description.trim() || null,
      author: form.author.trim().replace(/^@/, "") || null,
      thumbnail_url: form.thumbnail_url.trim() || null,
      categories: [form.category],
      source: "admin",
    };
    const { error } = await (supabase as any).from("tip_instagrams").insert(payload);
    setSaving(false);
    if (error) {
      if (error.code === "23505") {
        toast({ title: "이미 등록된 URL", description: "같은 URL 이 이미 있어요.", variant: "destructive" });
      } else {
        toast({ title: "등록 실패", description: error.message, variant: "destructive" });
      }
      return;
    }
    toast({ title: "등록 완료", description: "검토 대기 상태로 추가됐어요." });
    setAddOpen(false);
    setForm(emptyForm);
    await load();
  };

  // 외부 이미지 URL(또는 og:image 가 있는 페이지)을 공개 Storage(tip-thumbnails)로
  // 미러링해서 핫링크 차단 없이 뜨는 thumbnail_url 을 받아온다. 성공 시 공개 URL 반환.
  // Instagram 프로필/게시물 페이지 자체는 서버 fetch 가 막혀 실패 → 직접 이미지 URL 필요.
  const mirror = async (sourceUrl: string): Promise<string | null> => {
    const trimmed = sourceUrl.trim();
    if (!trimmed) {
      toast({ title: "미러링할 URL 이 없어요", description: "썸네일/이미지 URL 을 먼저 입력하세요.", variant: "destructive" });
      return null;
    }
    const { data, error } = await supabase.functions.invoke("mirror-image", { body: { url: trimmed } });
    if (error) {
      let msg = error.message;
      try {
        const ctx = await (error as { context?: { json?: () => Promise<{ hint?: string; error?: string }> } }).context?.json?.();
        if (ctx?.hint || ctx?.error) msg = ctx.hint ?? ctx.error ?? msg;
      } catch { /* 본문 파싱 실패는 무시 */ }
      toast({ title: "미러링 실패", description: msg, variant: "destructive" });
      return null;
    }
    const url = (data as { thumbnail_url?: string } | null)?.thumbnail_url;
    if (!url) {
      toast({ title: "미러링 실패", description: "응답에 thumbnail_url 이 없어요.", variant: "destructive" });
      return null;
    }
    return url;
  };

  const approve = async (id: string) => {
    const { error } = await (supabase as any)
      .from("tip_instagrams")
      .update({ moderation_status: "approved", moderation_note: null })
      .eq("id", id);
    if (error) {
      toast({ title: "승인 실패", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "승인됨", description: "사용자에게 노출됩니다." });
    await load();
  };

  const reject = async () => {
    if (!rejectTarget) return;
    const parts = [...rejectReasons];
    const trimmedNote = rejectNote.trim();
    if (trimmedNote) parts.push(trimmedNote);
    const combined = parts.length > 0 ? parts.join(", ") : null;

    const { error } = await (supabase as any)
      .from("tip_instagrams")
      .update({ moderation_status: "rejected", moderation_note: combined })
      .eq("id", rejectTarget);
    if (error) {
      toast({ title: "반려 실패", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "반려됨" });
    setRejectTarget(null);
    setRejectReasons([]);
    setRejectNote("");
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm("이 게시물을 영구 삭제할까요?")) return;
    const { error } = await (supabase as any).from("tip_instagrams").delete().eq("id", id);
    if (error) {
      toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "삭제됨" });
    await load();
  };

  return (
    <AdminGuard>
      <AdminLayout
        title="Instagram 큐레이션"
        description="결혼 준비 인스타 게시물 등록·검토. 승인된 게시물만 사용자 화면 노출."
        rightAction={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> 새 게시물
          </Button>
        }
      >
        <ReelAutoCollect onCollected={load} />

        <div className="flex items-center gap-2 mb-4">
          <Button size="sm" variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")}>
            검토 대기만
          </Button>
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
            전체
          </Button>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          <span className="text-xs text-muted-foreground ml-auto">{items.length}건</span>
        </div>

        {items.length === 0 && !loading ? (
          <div className="text-center py-16">
            <Instagram className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {filter === "pending" ? "검토 대기 게시물이 없어요" : "등록된 게시물이 없어요"}
            </p>
            <Button size="sm" className="mt-4" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> 첫 게시물 등록
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((p) => {
              const st = STATUS_LABEL[p.moderation_status] ?? STATUS_LABEL.pending;
              return (
                <div key={p.id} className="rounded-xl border border-border bg-card p-3 flex gap-3">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-primary/15 to-accent/30 flex-shrink-0 flex items-center justify-center">
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Instagram className="w-5 h-5 text-primary/60" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                      {p.author && <span className="text-[11px] text-muted-foreground">@{p.author}</span>}
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-primary inline-flex items-center gap-0.5 ml-auto"
                      >
                        URL <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    {p.title && (
                      <p className="text-[13px] font-semibold text-foreground line-clamp-1">{p.title}</p>
                    )}
                    {p.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{p.description}</p>
                    )}
                    {p.categories?.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {p.categories.map((c) => (
                          <span key={c} className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            {CATEGORIES.find((x) => x.value === c)?.label ?? c}
                          </span>
                        ))}
                      </div>
                    )}
                    {p.moderation_status === "rejected" && p.moderation_note && (
                      <p className="text-[10px] text-destructive mt-1">반려 사유: {p.moderation_note}</p>
                    )}
                    <div className="flex gap-1.5 mt-2">
                      {p.moderation_status !== "approved" && (
                        <Button size="sm" onClick={() => approve(p.id)}>
                          <Check className="w-3 h-3 mr-0.5" /> 승인
                        </Button>
                      )}
                      {p.moderation_status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setRejectTarget(p.id);
                            // 기존 노트가 있으면 알려진 사유는 체크박스로 복원, 나머지는 textarea 로.
                            const existing = p.moderation_note ?? "";
                            const parts = existing.split(",").map((s) => s.trim()).filter(Boolean);
                            const known = parts.filter((s) => (REJECT_REASONS as readonly string[]).includes(s));
                            const unknown = parts.filter((s) => !(REJECT_REASONS as readonly string[]).includes(s));
                            setRejectReasons(known);
                            setRejectNote(unknown.join(", "));
                          }}
                        >
                          <X className="w-3 h-3 mr-0.5" /> 반려
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={mirroringId === p.id}
                        title="썸네일 URL(없으면 게시물 URL)을 공개 Storage로 미러링"
                        onClick={async () => {
                          setMirroringId(p.id);
                          const mirrored = await mirror(p.thumbnail_url ?? p.url);
                          if (mirrored) {
                            const { error } = await (supabase as any)
                              .from("tip_instagrams")
                              .update({ thumbnail_url: mirrored })
                              .eq("id", p.id);
                            if (error) {
                              toast({ title: "저장 실패", description: error.message, variant: "destructive" });
                            } else {
                              toast({ title: "썸네일 미러링 완료" });
                              await load();
                            }
                          }
                          setMirroringId(null);
                        }}
                      >
                        {mirroringId === p.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <ImageDown className="w-3 h-3" />
                        )}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => remove(p.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 등록 다이얼로그 */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Instagram 게시물 등록</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">URL *</Label>
                <Input
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://www.instagram.com/p/XXX/"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">제목</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="예: 강남 호텔 웨딩 데코 영감"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">설명</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="짧은 캡션 또는 추천 이유"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">작성자 (@ 없이)</Label>
                  <Input
                    value={form.author}
                    onChange={(e) => setForm({ ...form, author: e.target.value })}
                    placeholder="username"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">카테고리 *</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">썸네일 URL (선택)</Label>
                <div className="flex gap-1.5">
                  <Input
                    value={form.thumbnail_url}
                    onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                    placeholder="https://... (비워두면 그라데이션 fallback)"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="flex-shrink-0"
                    disabled={mirroring}
                    title="입력한 이미지 URL을 공개 Storage로 미러링 (핫링크 차단 우회)"
                    onClick={async () => {
                      setMirroring(true);
                      const mirrored = await mirror(form.thumbnail_url);
                      if (mirrored) {
                        setForm((f) => ({ ...f, thumbnail_url: mirrored }));
                        toast({ title: "미러링 완료", description: "공개 Storage URL 로 교체했어요." });
                      }
                      setMirroring(false);
                    }}
                  >
                    {mirroring ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageDown className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  직접 이미지 URL 을 넣고 <ImageDown className="inline w-2.5 h-2.5" /> 를 누르면 공개 Storage 로 복사해
                  핫링크 차단 없이 떠요. Instagram 페이지 URL 은 서버 fetch 가 막혀 미러링 불가.
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 p-2 text-[11px] text-muted-foreground flex gap-1.5">
                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>등록 시 자동으로 검토 대기 상태. 등록자가 직접 승인 가능합니다.</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>취소</Button>
              <Button onClick={handleAdd} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "등록"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 반려 사유 다이얼로그 — 체크박스 다중 선택 + 기타 자유입력 */}
        <Dialog
          open={!!rejectTarget}
          onOpenChange={(open) => {
            if (!open) {
              setRejectTarget(null);
              setRejectReasons([]);
              setRejectNote("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>반려 사유</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-2">자주 쓰는 사유 (다중 선택 가능)</p>
                <div className="flex flex-wrap gap-1.5">
                  {REJECT_REASONS.map((r) => {
                    const active = rejectReasons.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() =>
                          setRejectReasons((prev) =>
                            active ? prev.filter((x) => x !== r) : [...prev, r],
                          )
                        }
                        className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                          active
                            ? "bg-destructive text-destructive-foreground border-destructive"
                            : "bg-background text-foreground border-border hover:border-destructive/50"
                        }`}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">기타 (선택)</p>
                <Textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="추가 메모"
                  rows={2}
                />
              </div>
              {(rejectReasons.length > 0 || rejectNote.trim()) && (
                <p className="text-[11px] text-muted-foreground">
                  저장될 사유: {[...rejectReasons, rejectNote.trim()].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectTarget(null)}>취소</Button>
              <Button variant="destructive" onClick={reject}>반려</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </AdminGuard>
  );
};

export default AdminTipInstagrams;
