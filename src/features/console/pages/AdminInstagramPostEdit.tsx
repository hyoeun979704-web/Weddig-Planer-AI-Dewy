import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Check,
  ChevronLeft,
  ExternalLink,
  Image as ImageIcon,
  Info,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import AdminGuard from "@/features/console/components/AdminGuard";
import AdminLayout from "@/features/console/components/AdminLayout";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { fetchDraft, updateDraft, deleteDraft } from "@/features/console/data/instagramPostDraft";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  type InstagramCardText,
  type InstagramPostDraft,
  type InstagramPostSourceType,
  type InstagramPostStatus,
  STATUS_LABEL,
  STATUS_TONE,
} from "@/types/instagramPostDraft";

/**
 * 인스타 카드뉴스 초안 상세·편집 페이지.
 *
 * 1단계: 운영자가 수동으로 caption / card_texts / hashtags / 예약시각 편집,
 *        승인·예약·삭제 등 라이프사이클 전이.
 * 2단계(예정): card_image_urls 를 자동 렌더링하는 워커가 채움 — 이 페이지에서는
 *        read-only placeholder 만 표시.
 */

const MAX_HASHTAGS = 5; // 2026 인스타 정책 — 캡션 효율 위해 5개 권장 상한

const SOURCE_OPTIONS: { value: InstagramPostSourceType; label: string }[] = [
  { value: "manual", label: "수동" },
  { value: "tip_blog", label: "팁 · 블로그" },
  { value: "tip_instagram", label: "팁 · 인스타" },
  { value: "tip_video", label: "팁 · 영상" },
  { value: "partner_deal", label: "파트너 딜" },
  { value: "promotional_event", label: "프로모션" },
  { value: "place", label: "장소" },
  { value: "season", label: "시즌" },
];

const STATUS_OPTIONS: InstagramPostStatus[] = [
  "draft",
  "approved",
  "scheduled",
  "publishing",
  "published",
  "failed",
];

/** PostgREST 가 돌려주는 row → 우리 타입. text[]·jsonb 가 null 로 올 수도 있어 방어. */
const normalizeDraft = (row: Record<string, unknown>): InstagramPostDraft => {
  const cardTexts = Array.isArray(row.card_texts)
    ? (row.card_texts as InstagramCardText[])
    : [];
  return {
    id: String(row.id ?? ""),
    topic: String(row.topic ?? ""),
    source_type: (row.source_type ?? "manual") as InstagramPostSourceType,
    source_id: (row.source_id as string | null) ?? null,
    caption: (row.caption as string | null) ?? null,
    hashtags: Array.isArray(row.hashtags) ? (row.hashtags as string[]) : [],
    card_count: typeof row.card_count === "number" ? row.card_count : cardTexts.length,
    card_image_urls: Array.isArray(row.card_image_urls)
      ? (row.card_image_urls as string[])
      : [],
    card_texts: cardTexts,
    status: (row.status ?? "draft") as InstagramPostStatus,
    scheduled_for: (row.scheduled_for as string | null) ?? null,
    published_at: (row.published_at as string | null) ?? null,
    published_permalink: (row.published_permalink as string | null) ?? null,
    published_media_id: (row.published_media_id as string | null) ?? null,
    last_error: (row.last_error as string | null) ?? null,
    retry_count: typeof row.retry_count === "number" ? row.retry_count : 0,
    created_by: (row.created_by as string | null) ?? null,
    approved_by: (row.approved_by as string | null) ?? null,
    approved_at: (row.approved_at as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
};

/** ISO timestamp → <input type="datetime-local"> 호환 문자열 (로컬 timezone 기준). */
const toDatetimeLocal = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes())
  );
};

/** datetime-local 문자열 → DB ISO. 빈 값은 null. */
const fromDatetimeLocal = (s: string): string | null => {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

const formatKstDateTime = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

interface FormState {
  topic: string;
  caption: string;
  hashtags: string[];
  card_texts: InstagramCardText[];
  source_type: InstagramPostSourceType;
  source_id: string;
  scheduled_for: string; // datetime-local 입력값
  status: InstagramPostStatus;
}

const buildFormFromDraft = (d: InstagramPostDraft): FormState => ({
  topic: d.topic,
  caption: d.caption ?? "",
  hashtags: [...d.hashtags],
  card_texts: d.card_texts.length > 0 ? d.card_texts.map((c) => ({ ...c })) : [],
  source_type: d.source_type,
  source_id: d.source_id ?? "",
  scheduled_for: toDatetimeLocal(d.scheduled_for),
  status: d.status,
});

const AdminInstagramPostEditInner = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [draft, setDraft] = useState<InstagramPostDraft | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isMutating, setIsMutating] = useState(false); // 승인/예약/되돌리기/삭제 등
  const [hashtagInput, setHashtagInput] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchDraft = useCallback(async () => {
    if (!id) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    let data: Record<string, unknown> | null = null;
    try {
      data = await fetchDraft(id);
    } catch (e) {
      setIsLoading(false);
      console.error("draft fetch failed:", e);
      // PostgREST 406 / 인터넷 끊김 등은 load error 로 표시.
      setLoadError(e instanceof Error ? e.message : "오류");
      return;
    }
    setIsLoading(false);
    if (!data) {
      setNotFound(true);
      return;
    }
    const normalized = normalizeDraft(data);
    setDraft(normalized);
    setForm(buildFormFromDraft(normalized));
  }, [id]);

  useEffect(() => {
    fetchDraft();
  }, [fetchDraft]);

  // ---- 해시태그 -----------------------------------------------------------
  const addHashtag = () => {
    if (!form) return;
    const cleaned = hashtagInput.trim().replace(/^#+/, "");
    if (!cleaned) return;
    if (form.hashtags.length >= MAX_HASHTAGS) {
      toast({
        title: "최대 5개까지",
        description: "2026 인스타 정책 — 캡션 효율을 위해 5개 권장 상한입니다.",
        variant: "destructive",
      });
      return;
    }
    if (form.hashtags.includes(cleaned)) {
      toast({ title: "이미 추가된 해시태그입니다" });
      setHashtagInput("");
      return;
    }
    setForm({ ...form, hashtags: [...form.hashtags, cleaned] });
    setHashtagInput("");
  };

  const removeHashtag = (idx: number) => {
    if (!form) return;
    const next = [...form.hashtags];
    next.splice(idx, 1);
    setForm({ ...form, hashtags: next });
  };

  // ---- 카드 텍스트 --------------------------------------------------------
  const addCard = () => {
    if (!form) return;
    setForm({
      ...form,
      card_texts: [...form.card_texts, { title: "", body: "", footer: "" }],
    });
  };

  const removeCard = (idx: number) => {
    if (!form) return;
    const next = [...form.card_texts];
    next.splice(idx, 1);
    setForm({ ...form, card_texts: next });
  };

  const moveCard = (idx: number, dir: -1 | 1) => {
    if (!form) return;
    const target = idx + dir;
    if (target < 0 || target >= form.card_texts.length) return;
    const next = [...form.card_texts];
    const tmp = next[idx];
    next[idx] = next[target];
    next[target] = tmp;
    setForm({ ...form, card_texts: next });
  };

  const updateCard = (idx: number, patch: Partial<InstagramCardText>) => {
    if (!form) return;
    const next = [...form.card_texts];
    next[idx] = { ...next[idx], ...patch };
    setForm({ ...form, card_texts: next });
  };

  // ---- 저장 ---------------------------------------------------------------
  const buildUpdatePayload = (
    f: FormState,
  ): Record<string, unknown> => {
    return {
      topic: f.topic.trim(),
      caption: f.caption.trim() || null,
      hashtags: f.hashtags,
      card_texts: f.card_texts,
      card_count: f.card_texts.length,
      source_type: f.source_type,
      source_id: f.source_id.trim() || null,
      scheduled_for: fromDatetimeLocal(f.scheduled_for),
      status: f.status,
    };
  };

  const handleSave = async (): Promise<boolean> => {
    if (!id || !form || !draft) return false;
    if (!form.topic.trim()) {
      toast({ title: "주제는 비울 수 없어요", variant: "destructive" });
      return false;
    }
    setIsSaving(true);
    // 낙관적 업데이트: 기존 draft snapshot 보관, 즉시 반영. 실패 시 롤백.
    const prevDraft = draft;
    const optimistic: InstagramPostDraft = {
      ...draft,
      topic: form.topic.trim(),
      caption: form.caption.trim() || null,
      hashtags: form.hashtags,
      card_texts: form.card_texts,
      card_count: form.card_texts.length,
      source_type: form.source_type,
      source_id: form.source_id.trim() || null,
      scheduled_for: fromDatetimeLocal(form.scheduled_for),
      status: form.status,
    };
    setDraft(optimistic);

    let data: Record<string, unknown> | null = null;
    let saveError: Error | null = null;
    try {
      data = await updateDraft(id, buildUpdatePayload(form));
    } catch (e) {
      saveError = e instanceof Error ? e : new Error("오류");
    }
    setIsSaving(false);

    if (saveError || !data) {
      setDraft(prevDraft);
      toast({
        title: "저장 실패",
        description: saveError?.message ?? "응답이 비어있어요",
        variant: "destructive",
      });
      return false;
    }
    const normalized = normalizeDraft(data);
    setDraft(normalized);
    setForm(buildFormFromDraft(normalized));
    toast({ title: "저장 완료" });
    return true;
  };

  // ---- 라이프사이클 액션 --------------------------------------------------
  const applyLifecycleUpdate = async (
    patch: Record<string, unknown>,
    successTitle: string,
  ) => {
    if (!id || !draft) return;
    setIsMutating(true);
    let data: Record<string, unknown> | null = null;
    let mutError: Error | null = null;
    try {
      data = await updateDraft(id, patch);
    } catch (e) {
      mutError = e instanceof Error ? e : new Error("오류");
    }
    setIsMutating(false);
    if (mutError || !data) {
      toast({
        title: "처리 실패",
        description: mutError?.message ?? "응답이 비어있어요",
        variant: "destructive",
      });
      return;
    }
    const normalized = normalizeDraft(data);
    setDraft(normalized);
    setForm(buildFormFromDraft(normalized));
    toast({ title: successTitle });
  };

  const handleApprove = async () => {
    // 저장 안된 변경 먼저 반영
    const ok = await handleSave();
    if (!ok) return;
    await applyLifecycleUpdate(
      {
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: user?.id ?? null,
      },
      "승인 완료",
    );
  };

  const handleSchedule = async () => {
    if (!form) return;
    if (!form.scheduled_for) {
      toast({
        title: "예약 시각을 먼저 입력하세요",
        variant: "destructive",
      });
      return;
    }
    const ok = await handleSave();
    if (!ok) return;
    await applyLifecycleUpdate({ status: "scheduled" }, "예약 완료");
  };

  const handleRevertToDraft = async () => {
    await applyLifecycleUpdate(
      {
        status: "draft",
        approved_at: null,
        approved_by: null,
      },
      "초안으로 되돌렸어요",
    );
  };

  const handleDelete = async () => {
    if (!id) return;
    setIsMutating(true);
    let delError: Error | null = null;
    try {
      await deleteDraft(id);
    } catch (e) {
      delError = e instanceof Error ? e : new Error("오류");
    }
    setIsMutating(false);
    setConfirmDelete(false);
    if (delError) {
      toast({
        title: "삭제 실패",
        description: delError.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "삭제됨" });
    navigate("/admin/instagram-posts", { replace: true });
  };

  // ---- dirty 체크 (저장 버튼 활성화) --------------------------------------
  const isDirty = useMemo(() => {
    if (!draft || !form) return false;
    return JSON.stringify(buildFormFromDraft(draft)) !== JSON.stringify(form);
  }, [draft, form]);

  // ---- 렌더 ---------------------------------------------------------------
  const headerRightAction = (
    <div className="flex items-center gap-2">
      {draft && (
        <span
          className={
            "text-[10px] px-2 py-0.5 rounded-full font-semibold " +
            STATUS_TONE[draft.status]
          }
        >
          {STATUS_LABEL[draft.status]}
        </span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate("/admin/instagram-posts")}
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        목록
      </Button>
    </div>
  );

  return (
    <AdminLayout
      title="카드뉴스 초안 편집"
      description={draft ? draft.topic : "—"}
      rightAction={headerRightAction}
    >
      {isLoading ? (
        <div className="py-24 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          <p className="font-semibold mb-1">불러오기 실패</p>
          <p className="text-xs">{loadError}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => fetchDraft()}>
              다시 시도
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/admin/instagram-posts")}
            >
              목록으로
            </Button>
          </div>
        </div>
      ) : notFound || !draft || !form ? (
        <div className="rounded-2xl border border-dashed border-border bg-background p-10 text-center">
          <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">
            존재하지 않는 초안이에요
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            이미 삭제되었거나, 접근 권한이 없을 수 있어요.
          </p>
          <Button
            size="sm"
            className="mt-4"
            onClick={() => navigate("/admin/instagram-posts")}
          >
            목록으로
          </Button>
        </div>
      ) : (
        <div className="space-y-6 max-w-4xl">
          {/* 메타 정보 */}
          <div className="rounded-2xl border border-border bg-background p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <MetaCell label="생성일" value={formatKstDateTime(draft.created_at)} />
            <MetaCell label="수정일" value={formatKstDateTime(draft.updated_at)} />
            <MetaCell
              label="생성자"
              value={draft.created_by ? draft.created_by.slice(0, 8) + "…" : "—"}
              mono
            />
            <MetaCell
              label="승인일"
              value={formatKstDateTime(draft.approved_at)}
            />
          </div>

          {/* 발행 결과 (있을 때만) */}
          {(draft.published_at ||
            draft.published_permalink ||
            draft.last_error) && (
            <div className="rounded-2xl border border-border bg-background p-4 space-y-2">
              <h2 className="text-sm font-semibold text-foreground">발행 결과</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <MetaCell
                  label="발행시각"
                  value={formatKstDateTime(draft.published_at)}
                />
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    퍼머링크
                  </p>
                  {draft.published_permalink ? (
                    <a
                      href={draft.published_permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary inline-flex items-center gap-1 break-all"
                    >
                      {draft.published_permalink}
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
                <MetaCell
                  label="재시도"
                  value={String(draft.retry_count)}
                />
              </div>
              {draft.last_error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive whitespace-pre-wrap">
                  <p className="font-semibold mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    마지막 에러
                  </p>
                  {draft.last_error}
                </div>
              )}
            </div>
          )}

          {/* 기본 편집 필드 */}
          <div className="rounded-2xl border border-border bg-background p-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-topic">주제 *</Label>
              <Input
                id="edit-topic"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-caption">캡션</Label>
              <Textarea
                id="edit-caption"
                rows={8}
                value={form.caption}
                onChange={(e) => setForm({ ...form, caption: e.target.value })}
                placeholder="인스타 캡션 본문. 해시태그는 별도 필드에 입력하세요."
              />
              <p className="text-[10px] text-muted-foreground">
                {form.caption.length} / 2200자 (인스타 제한)
              </p>
            </div>

            {/* 해시태그 */}
            <div className="space-y-1.5">
              <Label>
                해시태그 ({form.hashtags.length} / {MAX_HASHTAGS})
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {form.hashtags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeHashtag(idx)}
                      className="hover:text-destructive"
                      aria-label={tag + " 제거"}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <Input
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addHashtag();
                    }
                  }}
                  placeholder="# 없이 입력 (예: 강남웨딩홀)"
                  disabled={form.hashtags.length >= MAX_HASHTAGS}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addHashtag}
                  disabled={
                    form.hashtags.length >= MAX_HASHTAGS || !hashtagInput.trim()
                  }
                >
                  추가
                </Button>
              </div>
              {form.hashtags.length >= MAX_HASHTAGS && (
                <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 flex items-start gap-1">
                  <Info className="w-3 h-3 mt-0.5 shrink-0" />
                  2026 인스타 정책 — 캡션 효율을 위해 최대 5개까지 입력합니다.
                </p>
              )}
            </div>

            {/* 출처 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-source-type">출처 유형</Label>
                <Select
                  value={form.source_type}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      source_type: v as InstagramPostSourceType,
                    })
                  }
                >
                  <SelectTrigger id="edit-source-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-source-id">출처 ID (선택)</Label>
                <Input
                  id="edit-source-id"
                  value={form.source_id}
                  onChange={(e) =>
                    setForm({ ...form, source_id: e.target.value })
                  }
                  placeholder="원본 row 의 UUID 또는 식별자"
                />
              </div>
            </div>
          </div>

          {/* 카드 텍스트 편집 */}
          <div className="rounded-2xl border border-border bg-background p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  카드 텍스트 ({form.card_texts.length}장)
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  각 카드의 제목·본문·푸터. 순서는 발행 순서와 동일.
                </p>
              </div>
              <Button type="button" size="sm" onClick={addCard}>
                <Plus className="w-4 h-4 mr-1" />
                카드 추가
              </Button>
            </div>

            {form.card_texts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-xs text-muted-foreground">
                아직 카드가 없어요. "카드 추가"로 시작하세요.
              </div>
            ) : (
              <div className="space-y-3">
                {form.card_texts.map((card, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-border bg-muted/20 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">
                        카드 {idx + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0"
                          onClick={() => moveCard(idx, -1)}
                          disabled={idx === 0}
                          aria-label="위로"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0"
                          onClick={() => moveCard(idx, 1)}
                          disabled={idx === form.card_texts.length - 1}
                          aria-label="아래로"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => removeCard(idx)}
                          aria-label="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <Input
                        value={card.title ?? ""}
                        onChange={(e) =>
                          updateCard(idx, { title: e.target.value })
                        }
                        placeholder="제목 (선택)"
                      />
                      <Textarea
                        value={card.body ?? ""}
                        onChange={(e) =>
                          updateCard(idx, { body: e.target.value })
                        }
                        placeholder="본문 (선택)"
                        rows={3}
                      />
                      <Input
                        value={card.footer ?? ""}
                        onChange={(e) =>
                          updateCard(idx, { footer: e.target.value })
                        }
                        placeholder="푸터 (선택)"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 카드 이미지 미리보기 (read-only placeholder) */}
          <div className="rounded-2xl border border-border bg-background p-4 space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                카드 이미지 미리보기
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                이번 단계는 placeholder만 표시합니다. 2단계 렌더러가 각 카드를
                PNG 로 만들어 채워요.
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground flex items-start gap-2">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                card_image_urls 는 read-only. 카드 텍스트가 확정되면 다음 단계에서
                자동 렌더링됩니다.
              </span>
            </div>
            {form.card_texts.length === 0 ? (
              <p className="text-xs text-muted-foreground">카드를 먼저 추가하세요.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {form.card_texts.map((_, idx) => {
                  const url = draft.card_image_urls[idx];
                  return (
                    <div
                      key={idx}
                      className="aspect-square rounded-lg border border-dashed border-border bg-muted/30 overflow-hidden flex items-center justify-center text-muted-foreground"
                    >
                      {url ? (
                        <img
                          src={url}
                          alt={"카드 " + (idx + 1)}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-[10px]">
                          <ImageIcon className="w-5 h-5" />
                          <span>카드 {idx + 1}</span>
                          <span className="text-[9px]">렌더 대기</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 라이프사이클 */}
          <div className="rounded-2xl border border-border bg-background p-4 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">라이프사이클</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-status">상태 (수동 전이)</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm({ ...form, status: v as InstagramPostStatus })
                  }
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  버튼으로 보통의 전이를 처리하고, 이 select 는 비정상 케이스용.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-scheduled">예약 시각</Label>
                <Input
                  id="edit-scheduled"
                  type="datetime-local"
                  value={form.scheduled_for}
                  onChange={(e) =>
                    setForm({ ...form, scheduled_for: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              <Button
                onClick={handleSave}
                disabled={isSaving || isMutating || !isDirty}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                저장
              </Button>
              {draft.status === "draft" && (
                <Button
                  variant="outline"
                  onClick={handleApprove}
                  disabled={isSaving || isMutating}
                >
                  <Check className="w-4 h-4 mr-1" />
                  승인
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleSchedule}
                disabled={isSaving || isMutating}
              >
                <CalendarClock className="w-4 h-4 mr-1" />
                예약
              </Button>
              {draft.status !== "draft" && (
                <Button
                  variant="outline"
                  onClick={handleRevertToDraft}
                  disabled={isSaving || isMutating}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  초안으로 되돌리기
                </Button>
              )}
              <Button
                variant="destructive"
                onClick={() => setConfirmDelete(true)}
                disabled={isSaving || isMutating}
                className="ml-auto"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                삭제
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이 초안을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제 후엔 복구할 수 없어요. 발행된 게시물은 인스타에서 별도로
              삭제해야 합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isMutating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isMutating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "삭제"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

const MetaCell = ({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) => (
  <div className="space-y-0.5">
    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
      {label}
    </p>
    <p
      className={
        "text-foreground " + (mono ? "font-mono text-[11px]" : "text-xs")
      }
    >
      {value}
    </p>
  </div>
);

const AdminInstagramPostEdit = () => (
  <AdminGuard>
    <AdminInstagramPostEditInner />
  </AdminGuard>
);

export default AdminInstagramPostEdit;
