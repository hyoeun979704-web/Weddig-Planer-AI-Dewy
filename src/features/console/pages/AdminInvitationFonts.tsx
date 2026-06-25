import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Loader2, Trash2, Eye, EyeOff, Pencil, Upload } from "lucide-react";
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
import AdminGuard from "@/features/console/components/AdminGuard";
import AdminLayout from "@/features/console/components/AdminLayout";
import ImageUploader from "@/components/ImageUploader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Font {
  id: string;
  name: string;
  family: string;
  file_url: string;
  preview_url: string | null;
  category: string;
  weight: string;
  style: string;
  supports_korean: boolean;
  license: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

type Form = Omit<Font, "id" | "created_at">;

const emptyForm: Form = {
  name: "",
  family: "",
  file_url: "",
  preview_url: null,
  category: "SANS_SERIF",
  weight: "400",
  style: "normal",
  supports_korean: true,
  license: null,
  display_order: 0,
  is_active: true,
};

const CATEGORIES = [
  { value: "SERIF", label: "세리프 (명조)" },
  { value: "SANS_SERIF", label: "산세리프 (고딕)" },
  { value: "SCRIPT", label: "스크립트 (필기체)" },
  { value: "DISPLAY", label: "디스플레이 (장식체)" },
  { value: "HANDWRITING", label: "손글씨" },
];

const WEIGHTS = ["100", "200", "300", "400", "500", "600", "700", "800", "900"];

const FONT_MIME = [
  "font/woff2",
  "font/woff",
  "font/ttf",
  "font/otf",
  "application/font-woff2",
  "application/font-woff",
  "application/x-font-ttf",
  "application/octet-stream",
];

const AdminInvitationFonts = () => {
  const [items, setItems] = useState<Font[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingFont, setIsUploadingFont] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 필터링 (폰트가 늘어날수록 카테고리·한글지원·검색으로 빠르게 찾기)
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [query, setQuery] = useState("");
  const [koreanOnly, setKoreanOnly] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await (supabase as any)
      .from("invitation_fonts")
      .select("*")
      .order("display_order", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      toast({
        title: "불러오기 실패",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setItems(data ?? []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 등록된 폰트들을 @font-face 로 동적 로드 (미리보기용)
  useEffect(() => {
    if (items.length === 0) return;
    const styleEl = document.createElement("style");
    const fontFaces = items
      .filter((f) => f.is_active && f.file_url && f.family)
      .map(
        (f) => `@font-face {
  font-family: '${f.family.replace(/'/g, "")}';
  src: url('${f.file_url}');
  font-weight: ${f.weight || "400"};
  font-style: ${f.style || "normal"};
  font-display: swap;
}`,
      )
      .join("\n");
    styleEl.textContent = fontFaces;
    document.head.appendChild(styleEl);
    return () => {
      document.head.removeChild(styleEl);
    };
  }, [items]);

  const handleFontFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "폰트 파일이 너무 커요 (최대 10MB)", variant: "destructive" });
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["woff2", "woff", "ttf", "otf"].includes(ext)) {
      toast({
        title: "지원되지 않는 형식",
        description: "woff2 / woff / ttf / otf 만 가능합니다.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingFont(true);
    try {
      const filename = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("invitation-fonts")
        .upload(filename, file, {
          cacheControl: "31536000",
          upsert: false,
          contentType: file.type || FONT_MIME[0],
        });
      if (error) throw error;

      const { data: pub } = supabase.storage
        .from("invitation-fonts")
        .getPublicUrl(filename);
      setForm((p) => ({ ...p, file_url: pub.publicUrl }));
      toast({ title: "폰트 업로드 완료" });
    } catch (e) {
      toast({
        title: "업로드 실패",
        description: e instanceof Error ? e.message : "오류",
        variant: "destructive",
      });
    } finally {
      setIsUploadingFont(false);
    }
  };

  const handleSave = async () => {
    if (!form.file_url) {
      toast({ title: "폰트 파일을 업로드해주세요", variant: "destructive" });
      return;
    }
    if (!form.name.trim() || !form.family.trim()) {
      toast({
        title: "이름과 font-family 를 입력해주세요",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    const { error } = editingId
      ? await (supabase as any)
          .from("invitation_fonts")
          .update(form)
          .eq("id", editingId)
      : await (supabase as any).from("invitation_fonts").insert(form);
    if (error) {
      toast({
        title: "저장 실패",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: editingId ? "수정 완료" : "저장 완료" });
      setForm(emptyForm);
      setEditingId(null);
      setIsOpen(false);
      fetchData();
    }
    setIsSaving(false);
  };

  const handleEdit = (f: Font) => {
    setEditingId(f.id);
    setForm({
      name: f.name,
      family: f.family,
      file_url: f.file_url,
      preview_url: f.preview_url,
      category: f.category,
      weight: f.weight,
      style: f.style,
      supports_korean: f.supports_korean,
      license: f.license,
      display_order: f.display_order,
      is_active: f.is_active,
    });
    setIsOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setEditingId(null);
      setForm(emptyForm);
    }
  };

  const handleToggleActive = async (f: Font) => {
    const { error } = await (supabase as any)
      .from("invitation_fonts")
      .update({ is_active: !f.is_active })
      .eq("id", f.id);
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

  const handleDelete = async (f: Font) => {
    if (!confirm(`"${f.name}" 을(를) 삭제하시겠어요?`)) return;
    const { error } = await (supabase as any)
      .from("invitation_fonts")
      .delete()
      .eq("id", f.id);
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

  const q = query.trim().toLowerCase();
  const filtered = items.filter(
    (f) =>
      (filterCategory === "ALL" || f.category === filterCategory) &&
      (!koreanOnly || f.supports_korean) &&
      (!activeOnly || f.is_active) &&
      (!q ||
        f.name.toLowerCase().includes(q) ||
        f.family.toLowerCase().includes(q) ||
        (f.license ?? "").toLowerCase().includes(q)),
  );

  return (
    <AdminGuard>
      <AdminLayout
        title="청첩장 폰트"
        description="청첩장 에디터에서 사용 가능한 폰트 관리"
        rightAction={
          <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />새 폰트
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "폰트 수정" : "새 폰트 등록"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* 폰트 파일 업로드 */}
                <div>
                  <Label>폰트 파일 (woff2 / woff / ttf / otf, 최대 10MB)</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".woff2,.woff,.ttf,.otf,font/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) handleFontFile(f);
                    }}
                  />
                  <div className="flex items-center gap-2 mt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingFont}
                    >
                      {isUploadingFont ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      {form.file_url ? "파일 교체" : "파일 선택"}
                    </Button>
                    {form.file_url && (
                      <a
                        href={form.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-muted-foreground truncate max-w-[300px] underline"
                      >
                        업로드됨
                      </a>
                    )}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">표시 이름</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="예: 노토 산스 KR"
                    />
                  </div>
                  <div>
                    <Label htmlFor="family">font-family</Label>
                    <Input
                      id="family"
                      value={form.family}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, family: e.target.value }))
                      }
                      placeholder="CSS 식별자 (예: NotoSansKR)"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cat">카테고리</Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) =>
                        setForm((p) => ({ ...p, category: v }))
                      }
                    >
                      <SelectTrigger id="cat">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="weight">굵기</Label>
                    <Select
                      value={form.weight}
                      onValueChange={(v) => setForm((p) => ({ ...p, weight: v }))}
                    >
                      <SelectTrigger id="weight">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WEIGHTS.map((w) => (
                          <SelectItem key={w} value={w}>
                            {w}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="style">스타일</Label>
                    <Select
                      value={form.style}
                      onValueChange={(v) => setForm((p) => ({ ...p, style: v }))}
                    >
                      <SelectTrigger id="style">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">normal</SelectItem>
                        <SelectItem value="italic">italic</SelectItem>
                      </SelectContent>
                    </Select>
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

                <div>
                  <Label htmlFor="license">라이선스 메모 (선택)</Label>
                  <Input
                    id="license"
                    value={form.license ?? ""}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        license: e.target.value || null,
                      }))
                    }
                    placeholder="예: SIL Open Font License 1.1"
                  />
                </div>

                <div>
                  <Label className="mb-2 block">
                    미리보기 이미지 (선택 — 카드에서 폰트 모양 표시용)
                  </Label>
                  <ImageUploader
                    key={editingId ?? "new"}
                    bucket="invitation-templates"
                    pathPrefix="font-previews/"
                    initialUrl={form.preview_url || undefined}
                    onUploaded={(_, url) =>
                      setForm((p) => ({ ...p, preview_url: url }))
                    }
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="korean"
                      checked={form.supports_korean}
                      onCheckedChange={(c) =>
                        setForm((p) => ({ ...p, supports_korean: !!c }))
                      }
                    />
                    <Label htmlFor="korean" className="text-sm cursor-pointer">
                      한글 지원
                    </Label>
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
                </div>

                {/* 라이브 미리보기 */}
                {form.family && form.file_url && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-[11px] text-muted-foreground mb-1">
                      미리보기
                    </p>
                    <p
                      style={{
                        fontFamily: `'${form.family.replace(/'/g, "")}', sans-serif`,
                        fontWeight: form.weight || 400,
                        fontStyle: form.style || "normal",
                        fontSize: "1.5rem",
                      }}
                    >
                      평생을 함께할 두 사람이 결혼합니다 — The quick brown fox
                    </p>
                  </div>
                )}
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
          <>
            {/* 필터: 카테고리 · 검색 · 토글 */}
            <div className="mb-4 space-y-2">
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setFilterCategory("ALL")}
                  className={`px-3 py-1 rounded-full text-xs flex-shrink-0 ${
                    filterCategory === "ALL"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  전체 ({items.length})
                </button>
                {CATEGORIES.map((c) => {
                  const count = items.filter(
                    (f) => f.category === c.value,
                  ).length;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFilterCategory(c.value)}
                      className={`px-3 py-1 rounded-full text-xs flex-shrink-0 ${
                        filterCategory === c.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {c.label} ({count})
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="이름·패밀리·라이선스 검색"
                  className="h-9 text-sm max-w-xs"
                />
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={koreanOnly}
                    onCheckedChange={(v) => setKoreanOnly(!!v)}
                  />
                  한글만
                </label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={activeOnly}
                    onCheckedChange={(v) => setActiveOnly(!!v)}
                  />
                  활성만
                </label>
                <span className="text-[11px] text-muted-foreground ml-auto">
                  {filtered.length} / {items.length}
                </span>
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-16">
                조건에 맞는 폰트가 없어요.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((f) => (
              <article
                key={f.id}
                className="bg-background rounded-lg p-4 border border-border"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold truncate">{f.name}</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {CATEGORIES.find((c) => c.value === f.category)?.label} ·{" "}
                      {f.weight} {f.style !== "normal" ? f.style : ""}
                      {f.supports_korean ? " · 한글" : ""}
                    </p>
                  </div>
                  {!f.is_active && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded">
                      비활성
                    </span>
                  )}
                </div>

                <div className="py-3 px-2 bg-muted/50 rounded mb-2">
                  <p
                    style={{
                      fontFamily: `'${f.family.replace(/'/g, "")}', sans-serif`,
                      fontWeight: f.weight as any,
                      fontStyle: f.style,
                      fontSize: "1.125rem",
                      lineHeight: 1.4,
                    }}
                  >
                    평생을 함께할
                    <br />두 사람이 결혼합니다
                  </p>
                </div>

                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(f)}
                    className="flex-1 h-8 text-xs px-2"
                  >
                    {f.is_active ? (
                      <Eye className="w-3 h-3 mr-1" />
                    ) : (
                      <EyeOff className="w-3 h-3 mr-1" />
                    )}
                    {f.is_active ? "노출" : "숨김"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(f)}
                    className="h-8 w-8 p-0"
                    aria-label="수정"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(f)}
                    className="h-8 w-8 p-0 text-destructive"
                    aria-label="삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </article>
                ))}
              </div>
            )}
          </>
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
      등록된 폰트가 없어요
    </h2>
    <p className="text-sm text-muted-foreground">
      woff2 / woff / ttf / otf 형식의 폰트 파일을 업로드해보세요.
    </p>
  </div>
);

export default AdminInvitationFonts;
