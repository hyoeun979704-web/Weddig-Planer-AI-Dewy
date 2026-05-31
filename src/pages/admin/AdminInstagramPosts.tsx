import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Instagram, Loader2, Plus, RefreshCw } from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminLayout from "@/components/admin/AdminLayout";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  type InstagramPostDraft,
  type InstagramPostStatus,
  STATUS_LABEL,
  STATUS_TONE,
} from "@/types/instagramPostDraft";

const STATUS_FILTERS: { value: InstagramPostStatus | "all"; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "draft", label: "초안" },
  { value: "approved", label: "승인" },
  { value: "scheduled", label: "예약" },
  { value: "published", label: "발행완료" },
  { value: "failed", label: "실패" },
];

const AdminInstagramPostsInner = () => {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<InstagramPostDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<InstagramPostStatus | "all">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createTopic, setCreateTopic] = useState("");
  const [createCaption, setCreateCaption] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDrafts = useCallback(async () => {
    setIsLoading(true);
    let query = (supabase as any)
      .from("instagram_post_drafts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (filter !== "all") query = query.eq("status", filter);
    const { data, error } = await query;
    if (error) {
      console.error("instagram drafts fetch failed:", error);
      toast({ title: "불러오기 실패", description: error.message, variant: "destructive" });
    } else {
      setDrafts((data ?? []) as unknown as InstagramPostDraft[]);
    }
    setIsLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  const handleCreate = async () => {
    if (!createTopic.trim()) {
      toast({ title: "주제를 입력해주세요", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const { error } = await (supabase as any).from("instagram_post_drafts").insert({
      topic: createTopic.trim(),
      caption: createCaption.trim() || null,
      source_type: "manual",
      status: "draft",
      created_by: user?.id ?? null,
    });
    setIsSubmitting(false);
    if (error) {
      toast({ title: "초안 생성 실패", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "초안이 생성되었습니다" });
    setIsCreateOpen(false);
    setCreateTopic("");
    setCreateCaption("");
    fetchDrafts();
  };

  return (
    <AdminLayout
      title="인스타그램 카드뉴스"
      description="@dewy 공식 채널 발행 파이프라인 — 초안·승인·예약·발행 결과 관리"
      rightAction={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchDrafts} disabled={isLoading}>
            <RefreshCw className={"w-4 h-4 " + (isLoading ? "animate-spin" : "")} />
          </Button>
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            초안 추가
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 상태 필터 */}
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

        {/* 목록 */}
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

      {/* 수동 초안 생성 다이얼로그 */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>수동 초안 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="ig-topic">주제 *</Label>
              <Input
                id="ig-topic"
                placeholder="예: 5월 옥외 웨딩홀 TOP 5"
                value={createTopic}
                onChange={(e) => setCreateTopic(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ig-caption">초기 캡션 (선택)</Label>
              <Textarea
                id="ig-caption"
                placeholder="비워두면 다음 단계(AI 카피 생성)에서 채웁니다."
                rows={4}
                value={createCaption}
                onChange={(e) => setCreateCaption(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
              취소
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting || !createTopic.trim()}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "생성"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

const EmptyState = ({ onCreate }: { onCreate: () => void }) => (
  <div className="py-16 text-center border border-dashed border-border rounded-2xl bg-background">
    <Instagram className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
    <p className="text-sm font-medium text-foreground">아직 초안이 없어요</p>
    <p className="text-xs text-muted-foreground mt-1 mb-4">
      "초안 추가" 로 직접 만들거나, 다음 단계에서 AI 자동 발굴을 활성화하세요.
    </p>
    <Button size="sm" onClick={onCreate}>
      <Plus className="w-4 h-4 mr-1" />
      첫 초안 만들기
    </Button>
  </div>
);

const DraftRow = ({ draft }: { draft: InstagramPostDraft }) => {
  const created = new Date(draft.created_at).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <Link
      to={`/admin/instagram-posts/${draft.id}`}
      className="flex items-start gap-3 p-4 hover:bg-muted/40 transition-colors"
    >
      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
        {draft.card_image_urls[0] ? (
          <img
            src={draft.card_image_urls[0]}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <Instagram className="w-6 h-6 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={"text-[10px] px-2 py-0.5 rounded-full font-semibold " + STATUS_TONE[draft.status]}>
            {STATUS_LABEL[draft.status]}
          </span>
          <span className="text-[11px] text-muted-foreground">{draft.source_type}</span>
          {draft.card_count > 0 && (
            <span className="text-[11px] text-muted-foreground">· 카드 {draft.card_count}장</span>
          )}
        </div>
        <p className="text-sm font-medium text-foreground mt-1 line-clamp-1">{draft.topic}</p>
        {draft.caption && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{draft.caption}</p>
        )}
        <p className="text-[11px] text-muted-foreground mt-1">{created}</p>
      </div>
    </Link>
  );
};

const AdminInstagramPosts = () => (
  <AdminGuard>
    <AdminInstagramPostsInner />
  </AdminGuard>
);

export default AdminInstagramPosts;
