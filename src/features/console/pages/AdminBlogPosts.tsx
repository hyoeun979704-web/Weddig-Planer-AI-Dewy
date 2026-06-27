import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Loader2, Plus, RefreshCw, ExternalLink, Sparkles } from "lucide-react";
import AdminGuard from "@/features/console/components/AdminGuard";
import AdminLayout from "@/features/console/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchBlogDraftList, createBlogDraft, generateBlogDraft } from "@/features/console/data/blogPostDraft";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  type BlogPostDraft,
  type BlogPostStatus,
  type ReaderPersona,
  BLOG_STATUS_LABEL,
  BLOG_STATUS_TONE,
  BLOG_PERSONA_LABEL,
  READER_PERSONA_LABEL,
} from "@/types/blogPostDraft";

const PERSONA_OPTIONS = Object.keys(READER_PERSONA_LABEL) as ReaderPersona[];

const STATUS_FILTERS: { value: BlogPostStatus | "all"; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "draft", label: "초안" },
  { value: "review", label: "검수중" },
  { value: "published", label: "발행완료" },
  { value: "failed", label: "실패" },
];

const AdminBlogPostsInner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<BlogPostDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<BlogPostStatus | "all">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createMarkdown, setCreateMarkdown] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // AI 생성
  const [isGenOpen, setIsGenOpen] = useState(false);
  const [genTopic, setGenTopic] = useState("");
  const [genPersona, setGenPersona] = useState<ReaderPersona>("mp_general");
  const [genAngle, setGenAngle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchDrafts = useCallback(async () => {
    setIsLoading(true);
    try {
      setDrafts(await fetchBlogDraftList(filter));
    } catch (e) {
      console.error("blog drafts fetch failed:", e);
      toast({ title: "불러오기 실패", description: e instanceof Error ? e.message : "오류", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  const handleCreate = async () => {
    if (!createTitle.trim()) {
      toast({ title: "제목을 입력해주세요", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await createBlogDraft({
        title: createTitle.trim(),
        content_markdown: createMarkdown.trim() || null,
        source_type: "manual",
        status: "draft",
        created_by: user?.id ?? null,
      });
    } catch (e) {
      setIsSubmitting(false);
      toast({ title: "원고 생성 실패", description: e instanceof Error ? e.message : "오류", variant: "destructive" });
      return;
    }
    setIsSubmitting(false);
    toast({ title: "원고가 생성되었습니다" });
    setIsCreateOpen(false);
    setCreateTitle("");
    setCreateMarkdown("");
    fetchDrafts();
  };

  const handleGenerate = async () => {
    if (!genTopic.trim()) {
      toast({ title: "주제를 입력해주세요", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      const res = await generateBlogDraft({
        topic: genTopic.trim(),
        readerPersona: genPersona,
        angle: genAngle.trim() || null,
      });
      toast({
        title: "AI 원고 생성 완료",
        description: `자료조사 출처 ${res.sourceCount ?? 0}건 · 검수 화면으로 이동합니다.`,
      });
      setIsGenOpen(false);
      setGenTopic("");
      setGenAngle("");
      if (res.draftId) navigate(`/admin/blog-posts/${res.draftId}`);
      else fetchDrafts();
    } catch (e) {
      toast({
        title: "AI 생성 실패",
        description: e instanceof Error ? e.message : "오류",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AdminLayout
      title="블로그 발행"
      description="AI 생성 → 검수·편집(텍스트·사진) → 발행하면 dewy-wedding.com/blog 에 공개"
      rightAction={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchDrafts} disabled={isLoading}>
            <RefreshCw className={"w-4 h-4 " + (isLoading ? "animate-spin" : "")} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            직접 추가
          </Button>
          <Button size="sm" onClick={() => setIsGenOpen(true)}>
            <Sparkles className="w-4 h-4 mr-1" />
            AI 생성
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors " +
                (filter === f.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-muted")
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : drafts.length === 0 ? (
          <EmptyState onCreate={() => setIsCreateOpen(true)} />
        ) : (
          <div className="border border-border rounded-2xl overflow-hidden bg-background divide-y divide-border">
            {drafts.map((d) => (
              <DraftRow key={d.id} draft={d} />
            ))}
          </div>
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>원고 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="blog-title">제목 *</Label>
              <Input
                id="blog-title"
                placeholder="예: 스드메 준비 순서, 언제 뭘 예약할까요?"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="blog-md">본문 Markdown (선택)</Label>
              <Textarea
                id="blog-md"
                placeholder="marketing-draft 의 wp_aio 본문을 붙여넣으세요. 다음 화면에서 슬러그·요약·canonical·태그를 채울 수 있어요."
                rows={8}
                value={createMarkdown}
                onChange={(e) => setCreateMarkdown(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
              취소
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting || !createTitle.trim()}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "생성"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI 원고 생성 다이얼로그 */}
      <Dialog open={isGenOpen} onOpenChange={(o) => !isGenerating && setIsGenOpen(o)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>AI 원고 생성</DialogTitle>
            <DialogDescription>
              자료조사(웹 그라운딩) → 신뢰성 검증 → wp_aio 작성 → 자가 분석까지 자동 수행합니다. 30초~1분 정도 걸려요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="gen-topic">주제 *</Label>
              <Input
                id="gen-topic"
                placeholder="예: 스드메 순서, 뭐부터 예약해야 할까?"
                value={genTopic}
                onChange={(e) => setGenTopic(e.target.value)}
                disabled={isGenerating}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gen-persona">독자 페르소나</Label>
              <Select value={genPersona} onValueChange={(v) => setGenPersona(v as ReaderPersona)} disabled={isGenerating}>
                <SelectTrigger id="gen-persona">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERSONA_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {READER_PERSONA_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gen-angle">주제 앵글 (선택)</Label>
              <Input
                id="gen-angle"
                placeholder="예: 호구 안 되는 비교법 / 0부터 총정리"
                value={genAngle}
                onChange={(e) => setGenAngle(e.target.value)}
                disabled={isGenerating}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenOpen(false)} disabled={isGenerating}>
              취소
            </Button>
            <Button onClick={handleGenerate} disabled={isGenerating || !genTopic.trim()}>
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  생성 중…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-1" />
                  생성
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

const EmptyState = ({ onCreate }: { onCreate: () => void }) => (
  <div className="py-16 text-center border border-dashed border-border rounded-2xl bg-background">
    <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
    <p className="text-sm font-medium text-foreground">아직 원고가 없어요</p>
    <p className="text-xs text-muted-foreground mt-1 mb-4">
      "원고 추가" 로 wp_aio 산출물을 적재한 뒤 검수·발행하세요.
    </p>
    <Button size="sm" onClick={onCreate}>
      <Plus className="w-4 h-4 mr-1" />첫 원고 만들기
    </Button>
  </div>
);

const DraftRow = ({ draft }: { draft: BlogPostDraft }) => {
  const created = new Date(draft.created_at).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <Link
      to={`/admin/blog-posts/${draft.id}`}
      className="flex items-start gap-3 p-4 hover:bg-muted/40 transition-colors"
    >
      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
        {draft.featured_image_url ? (
          <img src={draft.featured_image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <FileText className="w-6 h-6 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={"text-[10px] px-2 py-0.5 rounded-full font-semibold " + BLOG_STATUS_TONE[draft.status]}>
            {BLOG_STATUS_LABEL[draft.status]}
          </span>
          <span className="text-[11px] text-muted-foreground">{BLOG_PERSONA_LABEL[draft.author_persona]}</span>
        </div>
        <p className="text-sm font-medium text-foreground mt-1 line-clamp-1">{draft.title}</p>
        {draft.excerpt && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{draft.excerpt}</p>}
        <div className="flex items-center gap-2 mt-1">
          <p className="text-[11px] text-muted-foreground">{created}</p>
          {draft.status === "published" && draft.slug && (
            <span className="text-[11px] text-emerald-600 inline-flex items-center gap-0.5">
              <ExternalLink className="w-3 h-3" />/blog/{draft.slug}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

const AdminBlogPosts = () => (
  <AdminGuard>
    <AdminBlogPostsInner />
  </AdminGuard>
);

export default AdminBlogPosts;
