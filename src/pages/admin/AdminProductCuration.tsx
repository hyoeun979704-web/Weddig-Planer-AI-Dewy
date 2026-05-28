import { useEffect, useState, useCallback } from "react";
import { Search, Loader2, Plus, Pencil, Star, Trash2, ExternalLink, RefreshCw } from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { STORE_CATEGORIES, PRODUCT_SOURCES, getSourceLabel, ProductSource } from "@/lib/storeCategories";

interface SearchResult {
  source: "naver" | "coupang";
  source_product_id: string;
  name: string;
  short_description: string | null;
  thumbnail_url: string | null;
  price: number;
  sale_price: number | null;
  source_url: string;
  source_mall: string | null;
  raw: unknown;
}

interface PoolProduct {
  id: string;
  name: string;
  short_description: string | null;
  description: string | null;
  thumbnail_url: string | null;
  price: number;
  sale_price: number | null;
  is_active: boolean;
  is_featured: boolean;
  source: string;
  source_url: string | null;
  source_mall: string | null;
  source_product_id: string | null;
  categories: string[];
}

const AdminProductCuration = () => {
  const [searchSource, setSearchSource] = useState<"naver" | "coupang">("naver");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategories, setSearchCategories] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [collecting, setCollecting] = useState<string | null>(null);
  const [bulkCollecting, setBulkCollecting] = useState(false);

  const [pool, setPool] = useState<PoolProduct[]>([]);
  const [poolLoading, setPoolLoading] = useState(true);
  const [filterSource, setFilterSource] = useState<"all" | ProductSource>("all");
  const [filterActive, setFilterActive] = useState<"all" | "on" | "off">("all");

  const [editing, setEditing] = useState<PoolProduct | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);

  const fetchPool = useCallback(async () => {
    setPoolLoading(true);
    let q = (supabase
      .from("products" as any)
      .select(
        "id, name, short_description, description, thumbnail_url, price, sale_price, is_active, is_featured, source, source_url, source_mall, source_product_id, categories",
      ) as any).order("created_at", { ascending: false });
    if (filterSource !== "all") {
      q = q.eq("source", filterSource);
    }
    if (filterActive === "on") {
      q = q.eq("is_active", true);
    } else if (filterActive === "off") {
      q = q.eq("is_active", false);
    }
    const { data, error } = await q;
    if (error) {
      toast.error(`풀 조회 실패: ${error.message}`);
    } else {
      setPool((data || []) as any);
    }
    setPoolLoading(false);
  }, [filterSource, filterActive]);

  useEffect(() => {
    fetchPool();
  }, [fetchPool]);

  const runSearch = async () => {
    const q = searchQuery.trim();
    if (!q) {
      toast.error("검색어를 입력하세요");
      return;
    }
    setSearching(true);
    setSearchResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("product-search", {
        body: { source: searchSource, query: q },
      });
      if (error) throw error;
      const items = (data as any)?.items as SearchResult[] | undefined;
      if (!items || items.length === 0) {
        toast.info("검색 결과가 없습니다");
      }
      setSearchResults(items ?? []);
    } catch (err: any) {
      toast.error(`검색 실패: ${err?.message ?? "알 수 없는 오류"}`);
    } finally {
      setSearching(false);
    }
  };

  const buildRow = (item: SearchResult) => ({
    name: item.name,
    short_description: item.short_description,
    thumbnail_url: item.thumbnail_url,
    price: item.price,
    sale_price: item.sale_price,
    source: item.source,
    source_product_id: item.source_product_id,
    source_url: item.source_url,
    source_mall: item.source_mall,
    raw_data: item.raw,
    is_active: false,
    is_featured: false,
    categories: searchCategories,
    stock: 0,
    synced_at: new Date().toISOString(),
  });

  const collect = async (item: SearchResult) => {
    setCollecting(item.source_product_id);
    const { error } = await (supabase.from("products" as any) as any).insert(buildRow(item));
    setCollecting(null);
    if (error) {
      if (error.code === "23505") {
        toast.error("이미 수집된 상품입니다");
      } else {
        toast.error(`수집 실패: ${error.message}`);
      }
      return;
    }
    toast.success("수집 완료. 풀에 추가되었습니다");
    fetchPool();
  };

  const collectAll = async () => {
    if (searchResults.length === 0) return;
    setBulkCollecting(true);
    // (source, source_product_id) 가 unique 라 중복은 DB 가 23505 로 거름.
    // ignoreDuplicates 옵션으로 한 번에 insert.
    const rows = searchResults.map(buildRow);
    const { error, count } = await (supabase.from("products" as any) as any)
      .upsert(rows, { onConflict: "source,source_product_id", ignoreDuplicates: true, count: "exact" });
    setBulkCollecting(false);
    if (error) {
      toast.error(`일괄 수집 실패: ${error.message}`);
      return;
    }
    const added = typeof count === "number" ? count : rows.length;
    toast.success(`${added}개 수집 완료 (중복은 건너뜀)`);
    fetchPool();
  };

  const toggleField = async (id: string, field: "is_active" | "is_featured", value: boolean) => {
    const { error } = await (supabase.from("products" as any) as any)
      .update({ [field]: value })
      .eq("id", id);
    if (error) {
      toast.error(`업데이트 실패: ${error.message}`);
      return;
    }
    setPool((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const toggleCategory = async (id: string, cat: string) => {
    const product = pool.find((p) => p.id === id);
    if (!product) return;
    const next = product.categories.includes(cat)
      ? product.categories.filter((c) => c !== cat)
      : [...product.categories, cat];
    const { error } = await (supabase.from("products" as any) as any)
      .update({ categories: next })
      .eq("id", id);
    if (error) {
      toast.error(`카테고리 업데이트 실패: ${error.message}`);
      return;
    }
    setPool((prev) => prev.map((p) => (p.id === id ? { ...p, categories: next } : p)));
  };

  const deleteProduct = async (product: PoolProduct) => {
    if (!confirm("이 상품을 거부 목록으로 보낼까요?\n(자동 수집 시에도 다시 들어오지 않습니다)")) return;

    // 외부 상품이면 blocklist 에 (source, source_product_id) 추가 → 재수집 차단.
    if (product.source !== "manual" && product.source_product_id) {
      const { error: blockErr } = await (supabase.from("product_blocklist" as any) as any).upsert(
        {
          source: product.source,
          source_product_id: product.source_product_id,
          reason: "admin_reject",
        },
        { onConflict: "source,source_product_id", ignoreDuplicates: true },
      );
      if (blockErr) {
        toast.error(`거부 목록 추가 실패: ${blockErr.message}`);
        return;
      }
    }

    const { error } = await (supabase.from("products" as any) as any).delete().eq("id", product.id);
    if (error) {
      toast.error(`삭제 실패: ${error.message}`);
      return;
    }
    setPool((prev) => prev.filter((p) => p.id !== product.id));
    toast.success("거부 완료");
  };

  const runBatchCollect = async () => {
    if (
      !confirm(
        "10개 카테고리의 모든 키워드를 네이버에서 검색해 풀에 채웁니다.\n(거부 목록 / 기존 상품은 자동 skip)\n진행하시겠어요?",
      )
    ) {
      return;
    }
    setBatchRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("product-batch-collect", {
        body: {},
      });
      if (error) throw error;
      const r = data as {
        totalFetched: number;
        candidates: number;
        blocked: number;
        inserted: number;
        duplicates: number;
        errors: any[];
      };
      toast.success(
        `자동 수집 완료 — 신규 ${r.inserted}개 / 중복 ${r.duplicates} / 거부 ${r.blocked} (총 ${r.totalFetched} 조회)`,
      );
      if (r.errors?.length > 0) {
        console.warn("batch collect errors", r.errors);
        toast.warning(`일부 키워드 실패 ${r.errors.length}건 (콘솔 확인)`);
      }
      fetchPool();
    } catch (err: any) {
      toast.error(`자동 수집 실패: ${err?.message ?? "알 수 없는 오류"}`);
    } finally {
      setBatchRunning(false);
    }
  };

  const saveEdit = async (next: Partial<PoolProduct>) => {
    if (!editing) return;
    const payload = {
      name: next.name ?? editing.name,
      short_description: next.short_description ?? editing.short_description,
      description: next.description ?? editing.description,
      thumbnail_url: next.thumbnail_url ?? editing.thumbnail_url,
      price: next.price ?? editing.price,
      sale_price: next.sale_price ?? editing.sale_price,
    };
    const { error } = await (supabase.from("products" as any) as any)
      .update(payload)
      .eq("id", editing.id);
    if (error) {
      toast.error(`저장 실패: ${error.message}`);
      return;
    }
    setPool((prev) => prev.map((p) => (p.id === editing.id ? { ...p, ...payload } : p)));
    setEditing(null);
    toast.success("저장 완료");
  };

  return (
    <AdminGuard>
      <AdminLayout title="상품 큐레이션" description="네이버/쿠팡에서 상품을 수집하고 노출할 항목을 선택합니다">
        {/* 0. 자동 수집 */}
        <section className="mb-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-start gap-3">
            <RefreshCw className="w-5 h-5 text-primary mt-0.5" />
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold mb-1">자동 수집 (네이버)</h2>
              <p className="text-xs text-muted-foreground">
                10개 카테고리의 시드 키워드로 네이버 검색해 풀에 채워요. 거부 목록 / 기존 상품은 자동 skip 됩니다.
                권장 주기: 주 1회.
              </p>
            </div>
            <Button onClick={runBatchCollect} disabled={batchRunning}>
              {batchRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  수집 중…
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  지금 자동 수집
                </>
              )}
            </Button>
          </div>
        </section>

        {/* 1. 검색 패널 */}
        <section className="mb-8 p-4 bg-background rounded-lg border border-border">
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
            <Search className="w-4 h-4" />
            수동 검색
          </h2>
          <div className="flex flex-wrap gap-2 items-center mb-3">
            <Select value={searchSource} onValueChange={(v) => setSearchSource(v as any)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="naver">네이버</SelectItem>
                <SelectItem value="coupang">쿠팡</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="키워드 (예: 셀프웨딩 가랜드)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !searching && runSearch()}
              className="flex-1 min-w-[200px]"
            />
            <Button onClick={runSearch} disabled={searching}>
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "검색"}
            </Button>
          </div>

          <div className="mb-2">
            <p className="text-xs text-muted-foreground mb-1.5">
              수집 시 자동 태그할 카테고리 (다중 선택 가능, 비워두면 풀에 무태그로 들어감)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {STORE_CATEGORIES.map((c) => {
                const active = searchCategories.includes(c.value);
                return (
                  <button
                    key={c.value}
                    onClick={() =>
                      setSearchCategories((prev) =>
                        prev.includes(c.value) ? prev.filter((v) => v !== c.value) : [...prev, c.value],
                      )
                    }
                    className={`px-2 py-1 text-[11px] rounded border ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {searchResults.length > 0 && (
            <>
              <div className="flex items-center justify-between mt-4 mb-2">
                <span className="text-xs text-muted-foreground">
                  결과 {searchResults.length}개
                </span>
                <Button size="sm" onClick={collectAll} disabled={bulkCollecting}>
                  {bulkCollecting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                  결과 전체 수집
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {searchResults.map((item) => (
                <div key={`${item.source}-${item.source_product_id}`} className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="h-32 bg-muted">
                    {item.thumbnail_url && (
                      <img src={item.thumbnail_url} alt={item.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-semibold line-clamp-2 mb-1">{item.name}</p>
                    <p className="text-sm font-bold text-primary mb-2">{item.price.toLocaleString()}원</p>
                    <Button
                      size="sm"
                      onClick={() => collect(item)}
                      disabled={collecting === item.source_product_id}
                      className="w-full h-8 text-xs"
                    >
                      {collecting === item.source_product_id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-3 h-3 mr-1" />
                          수집
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
              </div>
            </>
          )}
        </section>

        {/* 2. 풀 관리 */}
        <section>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <h2 className="text-sm font-bold mr-2">상품 풀 ({pool.length})</h2>
            <Select value={filterSource} onValueChange={(v) => setFilterSource(v as any)}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 출처</SelectItem>
                {PRODUCT_SOURCES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterActive} onValueChange={(v) => setFilterActive(v as any)}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="on">노출 ON</SelectItem>
                <SelectItem value="off">노출 OFF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {poolLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : pool.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              풀이 비어있습니다. 위 검색 패널에서 상품을 수집해주세요.
            </p>
          ) : (
            <div className="space-y-2">
              {pool.map((p) => (
                <PoolRow
                  key={p.id}
                  product={p}
                  onToggleField={toggleField}
                  onToggleCategory={toggleCategory}
                  onEdit={() => setEditing(p)}
                  onDelete={() => deleteProduct(p)}
                />
              ))}
            </div>
          )}
        </section>

        {editing && (
          <EditDialog
            product={editing}
            onClose={() => setEditing(null)}
            onSave={saveEdit}
          />
        )}
      </AdminLayout>
    </AdminGuard>
  );
};

interface PoolRowProps {
  product: PoolProduct;
  onToggleField: (id: string, field: "is_active" | "is_featured", value: boolean) => void;
  onToggleCategory: (id: string, cat: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}

const PoolRow = ({ product, onToggleField, onToggleCategory, onEdit, onDelete }: PoolRowProps) => {
  const [catsOpen, setCatsOpen] = useState(false);
  return (
    <div className="bg-background border border-border rounded-lg p-3">
      <div className="flex gap-3 items-start">
        <div className="w-16 h-16 bg-muted rounded flex-shrink-0 overflow-hidden">
          {product.thumbnail_url && (
            <img src={product.thumbnail_url} alt={product.name} className="w-full h-full object-cover" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
              {getSourceLabel(product.source)}
            </span>
            {product.source_url && (
              <a
                href={product.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
              >
                원본 <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
          <p className="text-sm font-semibold line-clamp-2 leading-tight mb-1">{product.name}</p>
          <p className="text-xs text-muted-foreground">
            {product.sale_price ? `${product.sale_price.toLocaleString()}원 / ` : ""}
            {product.price.toLocaleString()}원
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">노출</span>
            <Switch
              checked={product.is_active}
              onCheckedChange={(v) => onToggleField(product.id, "is_active", v)}
            />
          </div>
          <button
            onClick={() => onToggleField(product.id, "is_featured", !product.is_featured)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
          >
            <Star className={`w-3 h-3 ${product.is_featured ? "fill-primary text-primary" : ""}`} />
            추천
          </button>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-border flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setCatsOpen((v) => !v)}
          className="text-[11px] text-muted-foreground hover:text-foreground underline"
        >
          카테고리 ({product.categories.length}) {catsOpen ? "닫기" : "편집"}
        </button>
        {product.categories.map((c) => {
          const label = STORE_CATEGORIES.find((x) => x.value === c)?.label ?? c;
          return (
            <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              {label}
            </span>
          );
        })}
        <div className="ml-auto flex gap-1">
          <Button size="sm" variant="ghost" onClick={onEdit} className="h-7 w-7 p-0">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} className="h-7 w-7 p-0 text-destructive">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {catsOpen && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {STORE_CATEGORIES.map((c) => {
            const active = product.categories.includes(c.value);
            return (
              <button
                key={c.value}
                onClick={() => onToggleCategory(product.id, c.value)}
                className={`px-2 py-1 text-[11px] rounded border ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface EditDialogProps {
  product: PoolProduct;
  onClose: () => void;
  onSave: (next: Partial<PoolProduct>) => void;
}

const EditDialog = ({ product, onClose, onSave }: EditDialogProps) => {
  const [form, setForm] = useState({
    name: product.name,
    short_description: product.short_description ?? "",
    description: product.description ?? "",
    thumbnail_url: product.thumbnail_url ?? "",
    price: String(product.price),
    sale_price: product.sale_price !== null ? String(product.sale_price) : "",
  });

  const submit = () => {
    const priceNum = parseInt(form.price, 10);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("가격이 올바르지 않습니다");
      return;
    }
    const saleNum = form.sale_price ? parseInt(form.sale_price, 10) : null;
    if (saleNum !== null && (isNaN(saleNum) || saleNum < 0)) {
      toast.error("할인가가 올바르지 않습니다");
      return;
    }
    onSave({
      name: form.name.trim(),
      short_description: form.short_description.trim() || null,
      description: form.description.trim() || null,
      thumbnail_url: form.thumbnail_url.trim() || null,
      price: priceNum,
      sale_price: saleNum,
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>상품 정보 편집</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">상품명</label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">짧은 설명 (카드 부제)</label>
            <Input
              value={form.short_description}
              onChange={(e) => setForm((p) => ({ ...p, short_description: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">상세 설명</label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">썸네일 URL</label>
            <Input
              value={form.thumbnail_url}
              onChange={(e) => setForm((p) => ({ ...p, thumbnail_url: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">정가</label>
              <Input
                type="number"
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">할인가 (없으면 비움)</label>
              <Input
                type="number"
                value={form.sale_price}
                onChange={(e) => setForm((p) => ({ ...p, sale_price: e.target.value }))}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={submit}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminProductCuration;
