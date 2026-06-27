import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ChevronLeft,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  Save,
  Send,
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
  publishToWordpress,
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
  notes: string;
}

const FEATURED_BUCKET = "instagram-cards"; // 공개 버킷 재사용(WP 가 fetch 가능해야 함)

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
  const [publishing, setPublishing] = useState<"draft" | "publish" | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

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
  const persist = useCallback(async (): Promise<BlogPostDraft | null> => {
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
      notes: form.notes.trim() || null,
      reviewed_by: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    };
    const updated = await updateBlogDraft(id, payload);
    if (updated) {
      setDraft(updated);
      setForm(buildForm(updated));
    }
    return updated;
  }, [id, form, user?.id]);

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

  const handlePublish = async (wpStatus: "draft" | "publish") => {
    if (!id) return;
    setPublishing(wpStatus);
    try {
      // 항상 최신 폼을 먼저 저장한 뒤 발행(검수 내용 반영).
      const saved = await persist();
      if (!saved) {
        setPublishing(null);
        return;
      }
      const result = await publishToWordpress(id, wpStatus);
      toast({
        title: wpStatus === "publish" ? "워드프레스 발행 완료" : "워드프레스 임시저장 완료",
        description: result.wpUrl ? "글 링크가 생성됐어요." : undefined,
      });
      await load();
    } catch (e) {
      toast({
        title: "워드프레스 발행 실패",
        description: e instanceof Error ? e.message : "함수 호출 오류",
        variant: "destructive",
      });
      await load(); // status=failed·last_error 반영
    } finally {
      setPublishing(null);
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
  const busy = isSaving || publishing !== null;

  return (
    <AdminLayout
      title="블로그 원고 검수·발행"
      description="워드프레스 REST 자동 발행 — 검수 후 임시저장 또는 발행"
      rightAction={
        <Button variant="outline" size="sm" onClick={() => navigate("/admin/blog-posts")}>
          <ChevronLeft className="w-4 h-4 mr-1" />목록
        </Button>
      }
    >
      <div className="space-y-5 max-w-3xl">
        {/* 상태 + WP 결과 */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className={"text-[11px] px-2 py-0.5 rounded-full font-semibold " + BLOG_STATUS_TONE[draft.status]}>
            {BLOG_STATUS_LABEL[draft.status]}
          </span>
          {draft.wp_status && (
            <span className="text-xs text-muted-foreground">WP 상태: {draft.wp_status}</span>
          )}
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

        {draft.status === "failed" && draft.last_error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <p className="font-semibold mb-0.5">마지막 발행 실패 (재시도 {draft.retry_count}회)</p>
            <p className="break-words">{draft.last_error}</p>
          </div>
        )}

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
              placeholder="비우면 제목에서 자동 생성"
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
            <Label htmlFor="f-excerpt">요약 (TL;DR → WP excerpt)</Label>
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
              placeholder="네이버 등 원본에 먼저 게시했다면 그 원본 URL (중복 SEO 회피)"
              value={form.canonical_url}
              onChange={(e) => set({ canonical_url: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground">
              Yoast/RankMath SEO 플러그인이 설치돼 있어야 적용됩니다(둘 다 메타로 전달).
            </p>
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
          <Label htmlFor="f-md">본문 (Markdown)</Label>
          <Textarea
            id="f-md"
            rows={18}
            className="font-mono text-xs"
            placeholder="wp_aio 본문(Markdown). 발행 시 HTML 로 변환됩니다."
            value={form.content_markdown}
            onChange={(e) => set({ content_markdown: e.target.value })}
          />
        </div>

        {/* 내부 메모 */}
        <div className="space-y-1.5">
          <Label htmlFor="f-notes">내부 메모 (선택)</Label>
          <Textarea
            id="f-notes"
            rows={2}
            value={form.notes}
            onChange={(e) => set({ notes: e.target.value })}
          />
        </div>

        {/* 액션 */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          <Button onClick={handleSave} disabled={busy} variant="outline">
            {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            저장
          </Button>
          <Button onClick={() => handlePublish("draft")} disabled={busy} variant="secondary">
            {publishing === "draft" ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 mr-1" />
            )}
            WP 임시저장
          </Button>
          <Button onClick={() => handlePublish("publish")} disabled={busy}>
            {publishing === "publish" ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-1" />
            )}
            워드프레스 발행
          </Button>
          {draft.wp_post_id && (
            <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" />WP #{draft.wp_post_id}
            </span>
          )}
          <div className="flex-1" />
          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setIsDeleteOpen(true)} disabled={busy}>
            <Trash2 className="w-4 h-4 mr-1" />삭제
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          "WP 임시저장" 은 워드프레스에 비공개 초안으로, "워드프레스 발행" 은 공개 글로 올립니다. 이미 발행한 글을 다시 누르면 같은 글이 갱신돼요.
        </p>
      </div>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>원고를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없어요. 이미 워드프레스에 발행된 글은 워드프레스에서 별도로 삭제해야 합니다.
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
