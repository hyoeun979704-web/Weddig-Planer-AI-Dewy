import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, Trash2, Eye, EyeOff, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminLayout from "@/components/admin/AdminLayout";
import ImageUploader from "@/components/admin/ImageUploader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// 헤어 변형 미리보기 — 단일 헤어 선택지(이미지) 카탈로그.
// image_url: 썸네일(공개), prompt: gpt-image 단일 생성용 영문 조각.
interface HairSample {
  id: string;
  name: string;
  image_url: string;
  prompt: string | null;
  category: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}
type SampleForm = Omit<HairSample, "id" | "created_at">;
const emptyForm: SampleForm = {
  name: "",
  image_url: "",
  prompt: "",
  category: "",
  is_active: true,
  display_order: 0,
};

const AdminHairSamples = () => {
  const [samples, setSamples] = useState<HairSample[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<SampleForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchSamples = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await (supabase as any)
      .from("hair_samples")
      .select("*")
      .order("display_order", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) toast({ title: "불러오기 실패", description: error.message, variant: "destructive" });
    else setSamples(data ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchSamples(); }, [fetchSamples]);

  const handleSave = async () => {
    if (!form.image_url) return toast({ title: "이미지를 업로드해주세요", variant: "destructive" });
    if (!form.name.trim()) return toast({ title: "이름을 입력해주세요", variant: "destructive" });
    setIsSaving(true);
    const payload = { ...form, prompt: form.prompt || null, category: form.category || null };
    const { error } = editingId
      ? await (supabase as any).from("hair_samples").update(payload).eq("id", editingId)
      : await (supabase as any).from("hair_samples").insert(payload);
    if (error) toast({ title: "저장 실패", description: error.message, variant: "destructive" });
    else {
      toast({ title: editingId ? "수정 완료" : "저장 완료" });
      setForm(emptyForm); setEditingId(null); setIsDialogOpen(false); fetchSamples();
    }
    setIsSaving(false);
  };

  const handleEdit = (s: HairSample) => {
    setEditingId(s.id);
    setForm({
      name: s.name, image_url: s.image_url, prompt: s.prompt ?? "",
      category: s.category ?? "", is_active: s.is_active, display_order: s.display_order,
    });
    setIsDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) { setEditingId(null); setForm(emptyForm); }
  };

  const handleToggleActive = async (s: HairSample) => {
    const { error } = await (supabase as any).from("hair_samples").update({ is_active: !s.is_active }).eq("id", s.id);
    if (error) toast({ title: "변경 실패", description: error.message, variant: "destructive" });
    else fetchSamples();
  };

  const handleDelete = async (s: HairSample) => {
    if (!confirm(`"${s.name}" 을(를) 삭제하시겠어요?`)) return;
    const { error } = await (supabase as any).from("hair_samples").delete().eq("id", s.id);
    if (error) toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
    else { toast({ title: "삭제 완료" }); fetchSamples(); }
  };

  return (
    <AdminGuard>
      <AdminLayout
        title="헤어 카탈로그"
        description="헤어 변형 미리보기 — 단일 헤어 선택지 관리"
        rightAction={
          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" />새 헤어</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "헤어 샘플 수정" : "새 헤어 샘플 등록"}</DialogTitle>
              </DialogHeader>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <Label className="mb-2 block">썸네일 이미지(45° 측면 권장)</Label>
                  <ImageUploader
                    key={editingId ?? "new"}
                    bucket="hair-samples"
                    initialUrl={form.image_url || undefined}
                    onUploaded={(_, url) => setForm((p) => ({ ...p, image_url: url }))}
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">이름</Label>
                    <Input id="name" value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="예: 로맨틱 시뇽" />
                  </div>
                  <div>
                    <Label htmlFor="prompt">생성 프롬프트 (영문)</Label>
                    <textarea id="prompt" rows={3}
                      value={form.prompt ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, prompt: e.target.value }))}
                      placeholder="romantic loose chignon with face-framing strands"
                      className="w-full rounded-md border border-border bg-background p-2 text-sm resize-none" />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      단일 생성(정면·측면·후면)에 이 문구로 헤어를 적용합니다.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="category">카테고리(선택)</Label>
                    <Input id="category" value={form.category ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                      placeholder="다운 / 업스타일 / 하프" />
                  </div>
                  <div>
                    <Label htmlFor="order">정렬 순서(클수록 먼저)</Label>
                    <Input id="order" type="number" value={form.display_order}
                      onChange={(e) => setForm((p) => ({ ...p, display_order: Number(e.target.value) || 0 }))} />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Checkbox id="is_active" checked={form.is_active}
                      onCheckedChange={(c) => setForm((p) => ({ ...p, is_active: !!c }))} />
                    <Label htmlFor="is_active" className="text-sm cursor-pointer">즉시 노출(선택지에 표시)</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => handleDialogOpenChange(false)}>취소</Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? "수정 저장" : "저장"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : samples.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="inline-block p-4 bg-muted rounded-full mb-4"><Plus className="w-6 h-6 text-muted-foreground" /></div>
            <h2 className="text-base font-semibold text-foreground mb-2">등록된 헤어 샘플이 없어요</h2>
            <p className="text-sm text-muted-foreground">우측 상단 "새 헤어" 버튼으로 첫 샘플을 등록해보세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {samples.map((s) => (
              <article key={s.id} className="bg-background rounded-lg overflow-hidden border border-border">
                <div className="relative aspect-square bg-muted">
                  <img src={s.image_url} alt={s.name} className="w-full h-full object-cover" />
                  {!s.is_active && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-xs font-semibold">비활성</span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold truncate">{s.name}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{s.category || s.prompt || "—"}</p>
                  <div className="flex gap-1 mt-2">
                    <Button variant="outline" size="sm" onClick={() => handleToggleActive(s)} className="flex-1 h-8 text-xs px-2">
                      {s.is_active ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                      {s.is_active ? "노출" : "숨김"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(s)} className="h-8 w-8 p-0" aria-label="수정"><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(s)} className="h-8 w-8 p-0 text-destructive" aria-label="삭제"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </AdminLayout>
    </AdminGuard>
  );
};

export default AdminHairSamples;
