import { useState } from "react";
import { Loader2, Megaphone, Pin, Trash2, Plus, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/features/console/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { relativeTime } from "@/lib/relativeTime";
import {
  useCommunityAnnouncements,
  useAnnouncementAdmin,
  type CommunityAnnouncement,
} from "@/hooks/useCommunityAnnouncements";

const emptyDraft = { title: "", body: "", pinned: false, is_active: true };

/**
 * 운영자 — 커뮤니티 공지 관리(작성·수정·노출 토글·고정·삭제).
 * 공지는 커뮤니티 상단 배너에 활성·고정 우선으로 노출된다.
 */
const AdminCommunityAnnouncements = () => {
  const { data: announcements = [], isLoading } = useCommunityAnnouncements({ includeInactive: true });
  const { create, update, remove } = useAnnouncementAdmin();

  // editing === "new" → 신규 작성, uuid → 해당 공지 수정, null → 폼 닫힘.
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);

  const openNew = () => {
    setDraft(emptyDraft);
    setEditing("new");
  };
  const openEdit = (a: CommunityAnnouncement) => {
    setDraft({ title: a.title, body: a.body, pinned: a.pinned, is_active: a.is_active });
    setEditing(a.id);
  };
  const closeForm = () => {
    setEditing(null);
    setDraft(emptyDraft);
  };

  const save = async () => {
    if (!draft.title.trim() || !draft.body.trim()) {
      toast.error("제목과 내용을 모두 입력해주세요.");
      return;
    }
    const payload = {
      title: draft.title.trim(),
      body: draft.body.trim(),
      pinned: draft.pinned,
      is_active: draft.is_active,
    };
    try {
      if (editing === "new") {
        await create.mutateAsync(payload);
        toast.success("공지를 등록했어요.");
      } else if (editing) {
        await update.mutateAsync({ id: editing, ...payload });
        toast.success("공지를 수정했어요.");
      }
      closeForm();
    } catch {
      toast.error("저장에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
  };

  const toggleActive = async (a: CommunityAnnouncement) => {
    try {
      await update.mutateAsync({
        id: a.id,
        title: a.title,
        body: a.body,
        pinned: a.pinned,
        is_active: !a.is_active,
      });
    } catch {
      toast.error("노출 상태를 바꾸지 못했어요.");
    }
  };

  const handleDelete = async (a: CommunityAnnouncement) => {
    if (!window.confirm(`"${a.title}" 공지를 삭제할까요? 복구할 수 없어요.`)) return;
    try {
      await remove.mutateAsync(a.id);
      toast.success("공지를 삭제했어요.");
    } catch {
      toast.error("삭제에 실패했어요.");
    }
  };

  const saving = create.isPending || update.isPending;

  return (
    <AdminLayout
      title="커뮤니티 공지"
      description="커뮤니티 상단에 노출되는 운영자 공지를 관리합니다."
      rightAction={
        editing === null ? (
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" /> 새 공지
          </Button>
        ) : undefined
      }
    >
      {editing !== null && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground">
              {editing === "new" ? "새 공지 작성" : "공지 수정"}
            </h3>
            <button onClick={closeForm} aria-label="닫기" className="p-1 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <Input
            placeholder="공지 제목"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            maxLength={80}
          />
          <Textarea
            placeholder="공지 내용"
            value={draft.body}
            onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
            rows={5}
          />
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.pinned}
                onChange={(e) => setDraft((d) => ({ ...d, pinned: e.target.checked }))}
              />
              상단 고정
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.is_active}
                onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
              />
              노출(활성)
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={closeForm}>취소</Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "저장"}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">등록된 공지가 없어요. "새 공지"로 첫 공지를 작성하세요.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {announcements.map((a) => (
            <li
              key={a.id}
              className={`rounded-2xl border p-4 ${
                a.is_active ? "border-border bg-card" : "border-dashed border-border bg-muted/40 opacity-70"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {a.pinned && <Pin className="w-3.5 h-3.5 text-primary shrink-0" />}
                    <p className="font-bold text-foreground truncate">{a.title}</p>
                    {!a.is_active && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                        숨김
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line line-clamp-3">{a.body}</p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground/70">{relativeTime(a.created_at)}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <button
                    onClick={() => openEdit(a)}
                    className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
                    aria-label="수정"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(a)}
                    className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-muted"
                    aria-label="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <button
                onClick={() => toggleActive(a)}
                className="mt-2 text-[12px] font-semibold text-primary active:scale-95 transition-transform"
              >
                {a.is_active ? "숨기기" : "노출하기"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </AdminLayout>
  );
};

export default AdminCommunityAnnouncements;
