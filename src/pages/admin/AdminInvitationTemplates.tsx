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
import { Textarea } from "@/components/ui/textarea";
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

interface Font {
  id: string;
  name: string;
}

interface Template {
  id: string;
  name: string;
  thumbnail_url: string;
  preview_url: string | null;
  format: string;            // 'mobile' | 'paper'
  tone: string;
  price_hearts: number;
  layout: Record<string, unknown>;
  default_font_id: string | null;
  text_prompt_hint: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

type Form = Omit<Template, "id" | "created_at">;

const emptyForm: Form = {
  name: "",
  thumbnail_url: "",
  preview_url: null,
  format: "mobile",
  tone: "ROMANTIC",
  price_hearts: 0,
  layout: {},
  default_font_id: null,
  text_prompt_hint: null,
  display_order: 0,
  is_active: true,
};

const FORMAT_OPTIONS = [
  { value: "mobile", label: "📱 모바일", priceGuide: "0 (무료) / 10 (누끼·복합) / 20 (일러스트)" },
  { value: "paper", label: "📄 종이", priceGuide: "0 (무료) / 5 (누끼·복합) / 15 (일러스트)" },
];

const TONE_OPTIONS = [
  { value: "ROMANTIC", label: "로맨틱" },
  { value: "MODERN", label: "모던" },
  { value: "CLASSIC", label: "클래식" },
  { value: "MINIMAL", label: "미니멀" },
  { value: "CUTE", label: "큐트" },
  { value: "LUXURY", label: "럭셔리" },
];

const AdminInvitationTemplates = () => {
  const [items, setItems] = useState<Template[]>([]);
  const [fonts, setFonts] = useState<Font[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [layoutJson, setLayoutJson] = useState("{}");
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const [tpl, fnt] = await Promise.all([
      (supabase as any)
        .from("invitation_templates")
        .select("*")
        .order("display_order", { ascending: false })
        .order("created_at", { ascending: false }),
      (supabase as any)
        .from("invitation_fonts")
        .select("id, name")
        .eq("is_active", true)
        .order("display_order", { ascending: false }),
    ]);
    if (tpl.error) {
      toast({
        title: "불러오기 실패",
        description: tpl.error.message,
        variant: "destructive",
      });
    } else {
      setItems(tpl.data ?? []);
    }
    if (!fnt.error) setFonts(fnt.data ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!form.thumbnail_url) {
      toast({ title: "썸네일을 업로드해주세요", variant: "destructive" });
      return;
    }
    if (!form.name.trim()) {
      toast({ title: "이름을 입력해주세요", variant: "destructive" });
      return;
    }
    let layout: Record<string, unknown> = {};
    try {
      layout = JSON.parse(layoutJson || "{}");
    } catch {
      toast({
        title: "레이아웃 JSON 형식이 잘못됐어요",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    const payload = { ...form, layout };
    const { error } = editingId
      ? await (supabase as any)
          .from("invitation_templates")
          .update(payload)
          .eq("id", editingId)
      : await (supabase as any).from("invitation_templates").insert(payload);
    if (error) {
      toast({
        title: "저장 실패",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: editingId ? "수정 완료" : "저장 완료" });
      setForm(emptyForm);
      setLayoutJson("{}");
      setEditingId(null);
      setIsOpen(false);
      fetchData();
    }
    setIsSaving(false);
  };

  const handleEdit = (t: Template) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      thumbnail_url: t.thumbnail_url,
      preview_url: t.preview_url,
      format: t.format ?? "mobile",
      tone: t.tone,
      price_hearts: t.price_hearts ?? 0,
      layout: t.layout ?? {},
      default_font_id: t.default_font_id,
      text_prompt_hint: t.text_prompt_hint,
      display_order: t.display_order,
      is_active: t.is_active,
    });
    setLayoutJson(JSON.stringify(t.layout ?? {}, null, 2));
    setIsOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setEditingId(null);
      setForm(emptyForm);
      setLayoutJson("{}");
    }
  };

  const handleToggleActive = async (t: Template) => {
    const { error } = await (supabase as any)
      .from("invitation_templates")
      .update({ is_active: !t.is_active })
      .eq("id", t.id);
    if (error) {
      toast({
        title: "변경 실패",
        description: error.message,
        variant: "destructive",
      });
    } else {
      fetchData();
    }
  };

  const handleDelete = async (t: Template) => {
    if (!confirm(`"${t.name}" 을(를) 삭제하시겠어요?`)) return;
    const { error } = await (supabase as any)
      .from("invitation_templates")
      .delete()
      .eq("id", t.id);
    if (error) {
      toast({
        title: "삭제 실패",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "삭제 완료" });
      fetchData();
    }
  };

  return (
    <AdminGuard>
      <AdminLayout
        title="청첩장 템플릿"
        description="모바일 청첩장 디자인 시안 + 기본 레이아웃 관리"
        rightAction={
          <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />새 템플릿
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "템플릿 수정" : "새 템플릿 등록"}
                </DialogTitle>
              </DialogHeader>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block">썸네일 이미지</Label>
                    <ImageUploader
                      key={`thumb-${editingId ?? "new"}`}
                      bucket="invitation-templates"
                      pathPrefix="thumbnails/"
                      initialUrl={form.thumbnail_url || undefined}
                      onUploaded={(_, url) =>
                        setForm((p) => ({ ...p, thumbnail_url: url }))
                      }
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">큰 미리보기 (선택)</Label>
                    <ImageUploader
                      key={`preview-${editingId ?? "new"}`}
                      bucket="invitation-templates"
                      pathPrefix="previews/"
                      initialUrl={form.preview_url || undefined}
                      onUploaded={(_, url) =>
                        setForm((p) => ({ ...p, preview_url: url }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">템플릿 이름</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="예: 로맨틱 봄꽃 #001"
                    />
                  </div>

                  <div>
                    <Label htmlFor="format">매체</Label>
                    <Select
                      value={form.format}
                      onValueChange={(v) =>
                        setForm((p) => ({ ...p, format: v }))
                      }
                    >
                      <SelectTrigger id="format">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FORMAT_OPTIONS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="price">가격 (하트)</Label>
                    <Input
                      id="price"
                      type="number"
                      min={0}
                      value={form.price_hearts}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          price_hearts: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {
                        FORMAT_OPTIONS.find((f) => f.value === form.format)
                          ?.priceGuide
                      }
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="tone">톤</Label>
                    <Select
                      value={form.tone}
                      onValueChange={(v) => setForm((p) => ({ ...p, tone: v }))}
                    >
                      <SelectTrigger id="tone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TONE_OPTIONS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="font">기본 폰트 (선택)</Label>
                    <Select
                      value={form.default_font_id ?? "__none__"}
                      onValueChange={(v) =>
                        setForm((p) => ({
                          ...p,
                          default_font_id: v === "__none__" ? null : v,
                        }))
                      }
                    >
                      <SelectTrigger id="font">
                        <SelectValue placeholder="없음" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">없음</SelectItem>
                        {fonts.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="hint">AI 텍스트 톤 힌트 (선택)</Label>
                    <Input
                      id="hint"
                      value={form.text_prompt_hint ?? ""}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          text_prompt_hint: e.target.value || null,
                        }))
                      }
                      placeholder="예: 따뜻한 봄 결혼식 인사말 톤"
                    />
                  </div>

                  <div>
                    <Label htmlFor="order">노출 순서</Label>
                    <Input
                      id="order"
                      type="number"
                      value={form.display_order}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          display_order: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="layout">레이아웃 JSON</Label>
                <Textarea
                  id="layout"
                  value={layoutJson}
                  onChange={(e) => setLayoutJson(e.target.value)}
                  rows={8}
                  className="font-mono text-xs"
                  placeholder='{ "canvas": { "w": 800, "h": 1200 }, "slots": [] }'
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  캔버스 크기 + 텍스트·이미지·에셋 슬롯 정의 (사용자가 데이터를 입력하면 이 슬롯에 자동 매핑).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="active"
                  checked={form.is_active}
                  onCheckedChange={(c) =>
                    setForm((p) => ({ ...p, is_active: !!c }))
                  }
                />
                <Label htmlFor="active" className="text-sm cursor-pointer">
                  즉시 노출
                </Label>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  취소
                </Button>
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
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {items.map((t) => (
              <article
                key={t.id}
                className="bg-background rounded-lg overflow-hidden border border-border"
              >
                <div className="relative aspect-[3/4] bg-muted">
                  <img
                    src={t.thumbnail_url}
                    alt={t.name}
                    className="w-full h-full object-cover"
                  />
                  {!t.is_active && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-xs font-semibold">
                        비활성
                      </span>
                    </div>
                  )}
                  <span className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                    {t.format === "paper" ? "📄" : "📱"}{" "}
                    {TONE_OPTIONS.find((o) => o.value === t.tone)?.label ?? t.tone}
                  </span>
                  <span
                    className={`absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0.5 rounded ${
                      t.price_hearts > 0
                        ? "bg-rose-500 text-white"
                        : "bg-emerald-500 text-white"
                    }`}
                  >
                    {t.price_hearts > 0 ? `${t.price_hearts}하트` : "무료"}
                  </span>
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold truncate">{t.name}</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    노출 순서 {t.display_order}
                  </p>
                  <div className="flex gap-1 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(t)}
                      className="flex-1 h-8 text-xs px-2"
                    >
                      {t.is_active ? (
                        <Eye className="w-3 h-3 mr-1" />
                      ) : (
                        <EyeOff className="w-3 h-3 mr-1" />
                      )}
                      {t.is_active ? "노출" : "숨김"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(t)}
                      className="h-8 w-8 p-0"
                      aria-label="수정"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(t)}
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

const EmptyState = () => (
  <div className="text-center py-20 px-6">
    <div className="inline-block p-4 bg-muted rounded-full mb-4">
      <Plus className="w-6 h-6 text-muted-foreground" />
    </div>
    <h2 className="text-base font-semibold text-foreground mb-2">
      등록된 청첩장 템플릿이 없어요
    </h2>
    <p className="text-sm text-muted-foreground">
      우측 상단 "새 템플릿" 으로 첫 시안을 등록해보세요.
    </p>
  </div>
);

export default AdminInvitationTemplates;
