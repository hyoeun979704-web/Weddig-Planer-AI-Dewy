import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, Trash2, Eye, EyeOff } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminLayout from "@/components/admin/AdminLayout";
import ImageUploader from "@/components/admin/ImageUploader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { DRESS_FILTERS, FilterAxis, labelOf } from "@/data/dressFilters";

interface DressSample {
  id: string;
  name: string;
  image_url: string;
  silhouette: string | null;
  neckline: string | null;
  sleeve: string | null;
  length: string | null;
  fabric: string | null;
  details: string[] | null;
  back_design: string | null;
  color: string | null;
  waist: string | null;
  mood: string[] | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

type SampleForm = Omit<DressSample, "id" | "created_at">;

const emptyForm: SampleForm = {
  name: "",
  image_url: "",
  silhouette: null,
  neckline: null,
  sleeve: null,
  length: null,
  fabric: null,
  details: [],
  back_design: null,
  color: null,
  waist: null,
  mood: [],
  is_active: true,
  display_order: 0,
};

const AdminDressSamples = () => {
  const [samples, setSamples] = useState<DressSample[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<SampleForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSamples = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await (supabase as any)
      .from("dress_samples")
      .select("*")
      .order("display_order", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "불러오기 실패", description: error.message, variant: "destructive" });
    } else {
      setSamples(data ?? []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchSamples();
  }, [fetchSamples]);

  const handleSave = async () => {
    if (!form.image_url) {
      toast({ title: "이미지를 업로드해주세요", variant: "destructive" });
      return;
    }
    if (!form.name.trim()) {
      toast({ title: "이름을 입력해주세요", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    const { error } = await (supabase as any).from("dress_samples").insert({
      ...form,
      details: form.details ?? [],
      mood: form.mood ?? [],
    });
    if (error) {
      toast({ title: "저장 실패", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "저장 완료" });
      setForm(emptyForm);
      setIsDialogOpen(false);
      fetchSamples();
    }
    setIsSaving(false);
  };

  const handleToggleActive = async (sample: DressSample) => {
    const { error } = await (supabase as any)
      .from("dress_samples")
      .update({ is_active: !sample.is_active })
      .eq("id", sample.id);
    if (error) {
      toast({ title: "변경 실패", description: error.message, variant: "destructive" });
    } else {
      fetchSamples();
    }
  };

  const handleDelete = async (sample: DressSample) => {
    if (!confirm(`"${sample.name}" 을(를) 삭제하시겠어요?`)) return;
    const { error } = await (supabase as any)
      .from("dress_samples")
      .delete()
      .eq("id", sample.id);
    if (error) {
      toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "삭제 완료" });
      fetchSamples();
    }
  };

  const updateSingle = (key: keyof SampleForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value || null }));
  };

  const toggleMulti = (key: "details" | "mood", value: string) => {
    setForm((prev) => {
      const current = (prev[key] ?? []) as string[];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [key]: next };
    });
  };

  return (
    <AdminGuard>
      <AdminLayout
        title="드레스 카탈로그"
        description="마네킹 드레스 샘플 관리"
        rightAction={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
                새 드레스
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>새 드레스 샘플 등록</DialogTitle>
              </DialogHeader>

              <div className="grid sm:grid-cols-2 gap-6">
                {/* 좌측: 이미지 업로드 */}
                <div>
                  <Label className="mb-2 block">마네킹 이미지</Label>
                  <ImageUploader
                    bucket="dress-samples"
                    onUploaded={(_, url) => setForm((prev) => ({ ...prev, image_url: url }))}
                  />
                </div>

                {/* 우측: 메타 입력 */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">이름</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="예: 클래식 A라인 V넥 #001"
                    />
                  </div>

                  {DRESS_FILTERS.map((axis) => (
                    <FilterField
                      key={axis.key}
                      axis={axis}
                      form={form}
                      onSingleChange={updateSingle}
                      onMultiToggle={toggleMulti}
                    />
                  ))}

                  <div className="flex items-center gap-2 pt-2">
                    <Checkbox
                      id="is_active"
                      checked={form.is_active}
                      onCheckedChange={(c) =>
                        setForm((p) => ({ ...p, is_active: !!c }))
                      }
                    />
                    <Label htmlFor="is_active" className="text-sm cursor-pointer">
                      즉시 노출 (사용자 갤러리에 표시)
                    </Label>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  저장
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : samples.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {samples.map((s) => (
              <article
                key={s.id}
                className="bg-background rounded-lg overflow-hidden border border-border"
              >
                <div className="relative aspect-square bg-muted">
                  <img
                    src={s.image_url}
                    alt={s.name}
                    className="w-full h-full object-cover"
                  />
                  {!s.is_active && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-xs font-semibold">비활성</span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold truncate">{s.name}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {[
                      labelOf("silhouette", s.silhouette),
                      labelOf("neckline", s.neckline),
                      labelOf("sleeve", s.sleeve),
                    ]
                      .filter(Boolean)
                      .join(" · ") || "메타 미입력"}
                  </p>
                  <div className="flex gap-1 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(s)}
                      className="flex-1 h-8 text-xs px-2"
                    >
                      {s.is_active ? (
                        <Eye className="w-3 h-3 mr-1" />
                      ) : (
                        <EyeOff className="w-3 h-3 mr-1" />
                      )}
                      {s.is_active ? "노출" : "숨김"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(s)}
                      className="h-8 w-8 p-0 text-destructive"
                      aria-label="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
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

interface FilterFieldProps {
  axis: FilterAxis;
  form: SampleForm;
  onSingleChange: (key: keyof SampleForm, value: string) => void;
  onMultiToggle: (key: "details" | "mood", value: string) => void;
}

const FilterField = ({ axis, form, onSingleChange, onMultiToggle }: FilterFieldProps) => {
  if (axis.type === "single") {
    const value = (form[axis.key] as string | null) ?? "";
    return (
      <div>
        <Label htmlFor={axis.key}>{axis.label}</Label>
        <Select value={value} onValueChange={(v) => onSingleChange(axis.key, v)}>
          <SelectTrigger id={axis.key}>
            <SelectValue placeholder="선택" />
          </SelectTrigger>
          <SelectContent>
            {axis.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // multi-select (checkboxes)
  const selected = (form[axis.key] as string[] | null) ?? [];
  return (
    <div>
      <Label>{axis.label}</Label>
      <div className="grid grid-cols-2 gap-2 mt-1">
        {axis.options.map((opt) => {
          const isSelected = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onMultiToggle(axis.key as "details" | "mood", opt.value)}
              className={`text-left text-xs px-2 py-1.5 rounded border ${
                isSelected
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border text-foreground hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const EmptyState = () => (
  <div className="text-center py-20 px-6">
    <div className="inline-block p-4 bg-muted rounded-full mb-4">
      <Plus className="w-6 h-6 text-muted-foreground" />
    </div>
    <h2 className="text-base font-semibold text-foreground mb-2">
      등록된 드레스 샘플이 없어요
    </h2>
    <p className="text-sm text-muted-foreground">
      우측 상단 "새 드레스" 버튼으로 첫 샘플을 등록해보세요.
    </p>
  </div>
);

export default AdminDressSamples;
