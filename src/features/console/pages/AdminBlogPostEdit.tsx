import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Code2,
  Copy,
  ExternalLink,
  Eye,
  Loader2,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import AdminGuard from "@/features/console/components/AdminGuard";
import AdminLayout from "@/features/console/components/AdminLayout";
import ImageUploader from "@/components/ImageUploader";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  fetchBlogDraft,
  updateBlogDraft,
  deleteBlogDraft,
} from "@/features/console/data/blogPostDraft";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  type BlogAuthorPersona,
  type BlogPostDraft,
  BLOG_STATUS_LABEL,
  BLOG_STATUS_TONE,
} from "@/types/blogPostDraft";

interface FormState {
  title: string;
  slug: string;
  excerpt: string;
  canonical_url: string;
  author_persona: BlogAuthorPersona;
  categories: string; // 콤마 구분
  tags: string; // 콤마 구분
  content_markdown: string;
  featured_image_url: string;
  wp_url: string; // 직접 발행한 글의 공개 URL(수동 기록)
  notes: string;
}

const FEATURED_BUCKET = "instagram-cards"; // 공개 버킷 재사용

function buildForm(d: BlogPostDraft): FormState {
  return {
    title: d.title ?? "",
    slug: d.slug ?? "",
    excerpt: d.excerpt ?? "",
    canonical_url: d.canonical_url ?? "",
    author_persona: d.author_persona ?? "brand",
    categories: (d.categories ?? []).join(", "),
    tags: (d.tags ?? []).join(", "),
    content_markdown: d.content_markdown ?? "",
    featured_image_url: d.featured_image_url ?? "",
    wp_url: d.wp_url ?? "",
    notes: d.notes ?? "",
  };
}

function splitList(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

const AdminBlogPostEditInner = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [draft, setDraft] = useState<BlogPostDraft | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [marking, setMarking] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  // HTML 복사용 — 화면 밖에 마크다운을 렌더해 innerHTML 을 추출.
  const htmlRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const d = await fetchBlogDraft(id);
      if (!d) {
        setLoadError("원고를 찾을 수 없어요.");
        return;
      }
      setDraft(d);
      setForm(buildForm(d));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "불러오기 오류");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  /** 폼 → DB 저장. 성공 시 갱신된 draft 반환. */
  const persist = useCallback(
    async (extra?: Record<string, unknown>): Promise<BlogPostDraft | null> => {
      if (!id || !form) return null;
      if (!form.title.trim()) {
        toast({ title: "제목은 비울 수 없어요", variant: "destructive" });
        return null;
      }
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || null,
        excerpt: form.excerpt.trim() || null,
        canonical_url: form.canonical_url.trim() || null,
        author_persona: form.author_persona,
        categories: splitList(form.categories),
        tags: splitList(form.tags),
        content_markdown: form.content_markdown.trim() || null,
        featured_image_url: form.featured_image_url.trim() || null,
        wp_url: form.wp_url.trim() || null,
        notes: form.notes.trim() || null,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
        ...extra,
      };
      const updated = await updateBlogDraft(id, payload);
      if (updated) {
        setDraft(updated);
        setForm(buildForm(updated));
      }
      return updated;
    },
    [id, form, user?.id],
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await persist();
      if (updated) toast({ title: "저장됐어요" });
    } catch (e) {
      toast({ title: "저장 실패", description: e instanceof Error ? e.message : "오류", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const copyText = async (text: string, label: string) => {
    if (!text.trim()) {
      toast({ title: "복사할 내용이 없어요", variant: "destructive" });
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} 복사됨`, description: "워드프레스 편집기에 붙여넣으세요." });
    } catch {
      toast({ title: "복사 실패", description: "클립보드 접근이 막혔어요.", variant: "destructive" });
    }
  };

  const handleCopyMarkdown = () => copyText(form?.content_markdown ?? "", "마크다운");
  const handleCopyHtml = () => {
    const html = htmlRef.current?.innerHTML ?? "";
    copyText(html, "HTML");
  };

  /** 운영자가 워드프레스에 직접 올린 뒤 "발행 완료"로 표시(수동 상태 추적). */
  const handleMarkPublished = async () => {
    setMarking(true);
    try {
      const updated = await persist({
        status: "published",
        wp_status: "publish",
        wp_published_at: new Date().toISOString(),
      });
      if (updated) toast({ title: "발행 완료로 표시했어요" });
    } catch (e) {
      toast({ title: "처리 실패", description: e instanceof Error ? e.message : "오류", variant: "destructive" });
    } finally {
      setMarking(false);
    }
  };

  /** 발행 표시를 되돌려 다시 검수 상태로. */
  const handleRevertToReview = async () => {
    setMarking(true);
    try {
      const updated = await persist({ status: "review", wp_status: null, wp_published_at: null });
      if (updated) toast({ title: "검수 상태로 되돌렸어요" });
    } catch (e) {
      toast({ title: "처리 실패", description: e instanceof Error ? e.message : "오류", variant: "destructive" });
    } finally {
      setMarking(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteBlogDraft(id);
      toast({ title: "원고를 삭제했어요" });
      navigate("/admin/blog-posts");
    } catch (e) {
      toast({ title: "삭제 실패", description: e instanceof Error ? e.message : "오류", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="블로그 원고">
        <div className="py-20 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (loadError || !draft || !form) {
    return (
      <AdminLayout title="블로그 원고">
        <div className="py-16 text-center">
          <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-3" />
          <p className="text-sm text-foreground">{loadError ?? "원고를 불러오지 못했어요."}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/admin/blog-posts")}>
            <ChevronLeft className="w-4 h-4 mr-1" />목록으로
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const set = (patch: Partial<FormState>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const busy = isSaving || marking;
  const isPublished = draft.status === "published";

  return (
    <AdminLayout
      title="블로그 원고 검수"
      description="wp_aio 원고 검수 → 복사해서 워드프레스에 직접 발행 → 발행 완료 표시"
      rightAction={
        <Button variant="outline" size="sm" onClick={() => navigate("/admin/blog-posts")}>
          <ChevronLeft className="w-4 h-4 mr-1" />목록
        </Button>
      }
    >
      <div className="space-y-5 max-w-3xl">
        {/* 상태 + 발행 링크 */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className={"text-[11px] px-2 py-0.5 rounded-full font-semibold " + BLOG_STATUS_TONE[draft.status]}>
            {BLOG_STATUS_LABEL[draft.status]}
          </span>
          {draft.wp_url && (
            <a
              href={draft.wp_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />발행된 글 보기
            </a>
          )}
          {draft.wp_published_at && (
            <span className="text-xs text-muted-foreground">
              · {new Date(draft.wp_published_at).toLocaleString("ko-KR")}
            </span>
          )}
        </div>

        {/* 메타 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="f-title">제목 *</Label>
            <Input id="f-title" value={form.title} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-slug">슬러그 (URL)</Label>
            <Input
              id="f-slug"
              placeholder="워드프레스에서 정해도 됨"
              value={form.slug}
              onChange={(e) => set({ slug: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-persona">화자</Label>
            <Select
              value={form.author_persona}
              onValueChange={(v) => set({ author_persona: v as BlogAuthorPersona })}
            >
              <SelectTrigger id="f-persona">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brand">Dewy(브랜드)</SelectItem>
                <SelectItem value="me">효은(개인)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="f-excerpt">요약 (TL;DR)</Label>
            <Textarea
              id="f-excerpt"
              rows={2}
              placeholder="검색 결과·AIO 에 노출되는 한두 문장 요약"
              value={form.excerpt}
              onChange={(e) => set({ excerpt: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="f-canonical">Canonical URL</Label>
            <Input
              id="f-canonical"
              placeholder="네이버 등 원본에 먼저 게시했다면 그 원본 URL (워드프레스에서 SEO 설정에 입력)"
              value={form.canonical_url}
              onChange={(e) => set({ canonical_url: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-cats">카테고리 (콤마 구분)</Label>
            <Input
              id="f-cats"
              placeholder="웨딩준비, 스드메"
              value={form.categories}
              onChange={(e) => set({ categories: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-tags">태그 (콤마 구분)</Label>
            <Input
              id="f-tags"
              placeholder="예비신부, 웨딩촬영"
              value={form.tags}
              onChange={(e) => set({ tags: e.target.value })}
            />
          </div>
        </div>

        {/* 대표 이미지 */}
        <div className="space-y-1.5">
          <Label>대표 이미지 (featured)</Label>
          <ImageUploader
            bucket={FEATURED_BUCKET}
            pathPrefix="blog-featured/"
            initialUrl={form.featured_image_url || undefined}
            onUploaded={(_path, url) => set({ featured_image_url: url })}
          />
          {form.featured_image_url && (
            <button
              type="button"
              className="text-[11px] text-muted-foreground hover:text-destructive"
              onClick={() => set({ featured_image_url: "" })}
            >
              대표 이미지 제거
            </button>
          )}
        </div>

        {/* 본문 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="f-md">본문 (Markdown)</Label>
            <div className="flex items-center gap-1.5">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsPreviewOpen(true)}>
                <Eye className="w-3.5 h-3.5 mr-1" />미리보기
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleCopyMarkdown}>
                <Copy className="w-3.5 h-3.5 mr-1" />마크다운 복사
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleCopyHtml}>
                <Code2 className="w-3.5 h-3.5 mr-1" />HTML 복사
              </Button>
            </div>
          </div>
          <Textarea
            id="f-md"
            rows={18}
            className="font-mono text-xs"
            placeholder="wp_aio 본문(Markdown). 복사 버튼으로 워드프레스에 붙여넣으세요."
            value={form.content_markdown}
            onChange={(e) => set({ content_markdown: e.target.value })}
          />
          <p className="text-[11px] text-muted-foreground">
            "HTML 복사" 는 워드프레스 블록 편집기에, "마크다운 복사" 는 마크다운 지원 블록/플러그인에 붙여넣기 좋아요. (표 등 GFM 문법은 마크다운 복사를 권장)
          </p>
        </div>

        {/* 발행 기록 */}
        <div className="space-y-1.5">
          <Label htmlFor="f-wpurl">발행된 글 URL (직접 올린 뒤 붙여넣기)</Label>
          <Input
            id="f-wpurl"
            placeholder="https://post.dewy-wedding.com/..."
            value={form.wp_url}
            onChange={(e) => set({ wp_url: e.target.value })}
          />
        </div>

        {/* 내부 메모 */}
        <div className="space-y-1.5">
          <Label htmlFor="f-notes">내부 메모 (선택)</Label>
          <Textarea id="f-notes" rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
        </div>

        {/* 액션 */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          <Button onClick={handleSave} disabled={busy} variant="outline">
            {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            저장
          </Button>
          {isPublished ? (
            <Button onClick={handleRevertToReview} disabled={busy} variant="secondary">
              {marking ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-1" />}
              검수 상태로 되돌리기
            </Button>
          ) : (
            <Button onClick={handleMarkPublished} disabled={busy}>
              {marking ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              발행 완료로 표시
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setIsDeleteOpen(true)} disabled={busy}>
            <Trash2 className="w-4 h-4 mr-1" />삭제
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          이 화면에서 원고를 검수·복사해 워드프레스에 직접 게시한 뒤, 위에 발행된 글 URL 을 넣고 "발행 완료로 표시" 를 누르면 상태가 기록돼요.
        </p>
      </div>

      {/* HTML 추출용 숨김 렌더(화면 밖). 복사 버튼이 innerHTML 을 읽음. */}
      <div ref={htmlRef} aria-hidden className="sr-only">
        <ReactMarkdown>{form.content_markdown}</ReactMarkdown>
      </div>

      {/* 미리보기 */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.title || "미리보기"}</DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm max-w-none text-sm leading-relaxed [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-4 [&_h3]:font-semibold [&_h3]:mt-3 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground">
            {form.content_markdown.trim() ? (
              <ReactMarkdown>{form.content_markdown}</ReactMarkdown>
            ) : (
              <p className="text-muted-foreground">본문이 비어 있어요.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>원고를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없어요. 이미 워드프레스에 올린 글은 워드프레스에서 별도로 삭제해야 합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

const AdminBlogPostEdit = () => (
  <AdminGuard>
    <AdminBlogPostEditInner />
  </AdminGuard>
);

export default AdminBlogPostEdit;
