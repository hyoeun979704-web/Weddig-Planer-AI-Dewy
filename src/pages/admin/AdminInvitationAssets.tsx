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

interface Asset {
  id: string;
  name: string;
  image_url: string;
  thumbnail_url: string | null;
  category: string;
  collection: string | null;
  tags: string[] | null;
  is_recolorable: boolean;
  natural_width: number | null;
  natural_height: number | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

type Form = Omit<Asset, "id" | "created_at">;

const emptyForm: Form = {
  name: "",
  image_url: "",
  thumbnail_url: null,
  category: "FLOWER",
  collection: null,
  tags: [],
  is_recolorable: false,
  natural_width: null,
  natural_height: null,
  display_order: 0,
  is_active: true,
};

const CATEGORIES = [
  { value: "FLOWER", label: "꽃·식물" },
  { value: "FRAME", label: "프레임" },
  { value: "LINE", label: "라인·구분선" },
  { value: "RIBBON", label: "리본" },
  { value: "ICON", label: "아이콘" },
  { value: "SHAPE", label: "도형" },
  { value: "TEXT_STICKER", label: "텍스트 스티커" },
  { value: "STICKER", label: "스티커·오브제" },
  { value: "TAPE", label: "마스킹테이프" },
  { value: "OBJECT_3D", label: "3D·Y2K" },
  { value: "NATURE", label: "자연·바다" },
  { value: "PHOTO_FRAME", label: "사진 프레임" },
];

const AdminInvitationAssets = () => {
  const [items, setItems] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [tagsInput, setTagsInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterCollection, setFilterCollection] = useState<string>("ALL");
  const [query, setQuery] = useState("");
  const [groupByCollection, setGroupByCollection] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await (supabase as any)
      .from("invitation_assets")
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

  const handleImageMeasured = (url: string) => {
    // 업로드 후 자연 크기 측정
    const img = new Image();
    img.onload = () => {
      setForm((p) => ({
        ...p,
        natural_width: img.naturalWidth,
        natural_height: img.naturalHeight,
      }));
    };
    img.src = url;
  };

  const handleSave = async () => {
    if (!form.image_url) {
      toast({ title: "에셋 이미지를 업로드해주세요", variant: "destructive" });
      return;
    }
    if (!form.name.trim()) {
      toast({ title: "이름을 입력해주세요", variant: "destructive" });
      return;
    }
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setIsSaving(true);
    const payload = { ...form, tags };
    const { error } = editingId
      ? await (supabase as any)
          .from("invitation_assets")
          .update(payload)
          .eq("id", editingId)
      : await (supabase as any).from("invitation_assets").insert(payload);
    if (error) {
      toast({
        title: "저장 실패",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: editingId ? "수정 완료" : "저장 완료" });
      setForm(emptyForm);
      setTagsInput("");
      setEditingId(null);
      setIsOpen(false);
      fetchData();
    }
    setIsSaving(false);
  };

  const handleEdit = (a: Asset) => {
    setEditingId(a.id);
    setForm({
      name: a.name,
      image_url: a.image_url,
      thumbnail_url: a.thumbnail_url,
      category: a.category,
      collection: a.collection,
      tags: a.tags ?? [],
      is_recolorable: a.is_recolorable,
      natural_width: a.natural_width,
      natural_height: a.natural_height,
      display_order: a.display_order,
      is_active: a.is_active,
    });
    setTagsInput((a.tags ?? []).join(", "));
    setIsOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setEditingId(null);
      setForm(emptyForm);
      setTagsInput("");
    }
  };

  const handleToggleActive = async (a: Asset) => {
    const { error } = await (supabase as any)
      .from("invitation_assets")
      .update({ is_active: !a.is_active })
      .eq("id", a.id);
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

  const handleDelete = async (a: Asset) => {
    if (!confirm(`"${a.name}" 을(를) 삭제하시겠어요?`)) return;
    const { error } = await (supabase as any)
      .from("invitation_assets")
      .delete()
      .eq("id", a.id);
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
    (a) =>
      (filterCategory === "ALL" || a.category === filterCategory) &&
      (filterCollection === "ALL" || (a.collection ?? "") === filterCollection) &&
      (!q ||
        a.name.toLowerCase().includes(q) ||
        (a.tags ?? []).some((t: string) => t.toLowerCase().includes(q))),
  );
  // 등록된 전체 태그(현재 카테고리 기준) — 빠른 필터 칩
  const tagPool = Array.from(
    new Set(
      items
        .filter((a) => filterCategory === "ALL" || a.category === filterCategory)
        .flatMap((a) => (a.tags ?? []) as string[]),
    ),
  ).sort();
  // 등록된 세트·컬렉션 목록
  const collectionPool = Array.from(
    new Set(items.map((a) => a.collection).filter(Boolean) as string[]),
  ).sort();
  // 컬렉션별 그룹(표시용) — filtered 를 collection 으로 묶음
  const grouped = filtered.reduce<Record<string, Asset[]>>((acc, a) => {
    const key = a.collection || "__기타__";
    (acc[key] ??= []).push(a);
    return acc;
  }, {});
  const groupKeys = Object.keys(grouped).sort((x, y) =>
    x === "__기타__" ? 1 : y === "__기타__" ? -1 : x.localeCompare(y),
  );

  const renderCard = (a: Asset) => (
    <article
      key={a.id}
      className="bg-background rounded-lg overflow-hidden border border-border"
    >
      <div className="relative aspect-square bg-[linear-gradient(45deg,#f8f8f8_25%,transparent_25%),linear-gradient(-45deg,#f8f8f8_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f8f8f8_75%),linear-gradient(-45deg,transparent_75%,#f8f8f8_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0]">
        <img
          src={a.image_url}
          alt={a.name}
          className="w-full h-full object-contain"
        />
        {!a.is_active && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-[10px] font-semibold">비활성</span>
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="text-[11px] font-semibold truncate">{a.name}</p>
        <p className="text-[9px] text-muted-foreground truncate">
          {CATEGORIES.find((c) => c.value === a.category)?.label}
          {a.is_recolorable ? " · 색변경" : ""}
        </p>
        <div className="flex gap-0.5 mt-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleActive(a)}
            className="flex-1 h-7 text-[10px] px-1"
          >
            {a.is_active ? (
              <Eye className="w-3 h-3" />
            ) : (
              <EyeOff className="w-3 h-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(a)}
            className="h-7 w-7 p-0"
            aria-label="수정"
          >
            <Pencil className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(a)}
            className="h-7 w-7 p-0 text-destructive"
            aria-label="삭제"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </article>
  );

  return (
    <AdminGuard>
      <AdminLayout
        title="청첩장 에셋"
        description="장식 에셋 (꽃·프레임·리본 등) 관리"
        rightAction={
          <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />새 에셋
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "에셋 수정" : "새 에셋 등록"}
                </DialogTitle>
              </DialogHeader>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <Label className="mb-2 block">에셋 이미지 (투명 PNG / SVG)</Label>
                  <ImageUploader
                    key={editingId ?? "new"}
                    bucket="invitation-assets"
                    initialUrl={form.image_url || undefined}
                    onUploaded={(_, url) => {
                      setForm((p) => ({ ...p, image_url: url }));
                      handleImageMeasured(url);
                    }}
                  />
                  {form.natural_width && form.natural_height && (
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      자연 크기: {form.natural_width} × {form.natural_height}
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">이름</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="예: 봄꽃 부케 #001"
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
                    <Label htmlFor="collection">세트·컬렉션 (선택)</Label>
                    <Input
                      id="collection"
                      list="collection-list"
                      value={form.collection ?? ""}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, collection: e.target.value || null }))
                      }
                      placeholder="예: 레드 코케트, 발렌타인 doodle, 크롬 Y2K"
                    />
                    <datalist id="collection-list">
                      {collectionPool.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <Label htmlFor="tags">태그 (쉼표 구분)</Label>
                    <Input
                      id="tags"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="예: 봄, 핑크, 장미"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="recolor"
                      checked={form.is_recolorable}
                      onCheckedChange={(c) =>
                        setForm((p) => ({ ...p, is_recolorable: !!c }))
                      }
                    />
                    <Label htmlFor="recolor" className="text-sm cursor-pointer">
                      색상 변경 가능 (단색 SVG/PNG)
                    </Label>
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

                  <div className="flex items-center gap-2 pt-1">
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
        {/* 카테고리 필터 */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
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
            const count = items.filter((a) => a.category === c.value).length;
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

        {/* 태그·이름 검색 + 빠른 태그 칩 */}
        <div className="mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="태그·이름 검색 (예: heart, frame, wavy, 레드, bow)"
            className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm"
          />
          {tagPool.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-2">
              {tagPool.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setQuery(query === t ? "" : t)}
                  className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors ${
                    query === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  #{t}
                </button>
              ))}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground mt-1.5">
            {filtered.length}개 표시
          </p>
        </div>

        {/* 세트·컬렉션 필터 + 그룹 보기 토글 */}
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          <button
            type="button"
            onClick={() => setGroupByCollection((v) => !v)}
            className={`px-3 py-1 rounded-full text-xs flex-shrink-0 border ${
              groupByCollection
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted text-foreground border-border"
            }`}
          >
            세트별 묶어보기
          </button>
          {collectionPool.length > 0 && (
            <>
              <span className="mx-1 text-border">|</span>
              <button
                type="button"
                onClick={() => setFilterCollection("ALL")}
                className={`px-3 py-1 rounded-full text-xs flex-shrink-0 ${
                  filterCollection === "ALL"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                전체 세트
              </button>
              {collectionPool.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() =>
                    setFilterCollection(filterCollection === c ? "ALL" : c)
                  }
                  className={`px-3 py-1 rounded-full text-xs flex-shrink-0 ${
                    filterCollection === c
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : groupByCollection ? (
          <div className="space-y-6">
            {groupKeys.map((gk) => (
              <section key={gk}>
                <h3 className="text-sm font-bold mb-2 px-0.5">
                  {gk === "__기타__" ? "기타 (세트 없음)" : gk}
                  <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                    {grouped[gk].length}개
                  </span>
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {grouped[gk].map((a) => renderCard(a))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {filtered.map((a) => renderCard(a))}
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
      등록된 에셋이 없어요
    </h2>
    <p className="text-sm text-muted-foreground">
      투명 PNG 또는 SVG 형식의 장식 에셋을 등록해보세요.
    </p>
  </div>
);

export default AdminInvitationAssets;
