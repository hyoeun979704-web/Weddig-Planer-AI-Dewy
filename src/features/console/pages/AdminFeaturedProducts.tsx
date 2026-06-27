import { useEffect, useState, useCallback } from "react";
import { Loader2, Star, Search, X, ChevronLeft, ChevronRight, Users, ExternalLink } from "lucide-react";
import AdminGuard from "@/features/console/components/AdminGuard";
import AdminLayout from "@/features/console/components/AdminLayout";
import {
  fetchFeaturedProducts,
  updateFeaturedProduct,
  type FeaturedRow,
} from "@/features/console/data/featuredProducts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { STORE_CATEGORIES, getSourceLabel } from "@/lib/storeCategories";
import { ProductThumb } from "@/components/store/ProductThumb";
import { PERSONA_LABEL, type WeddingPersonaMode } from "@/lib/weddingPersona";

// 19개 페르소나를 의미 그룹으로 묶어 체크박스 UX 부담 줄임.
const PERSONA_GROUPS: { title: string; values: WeddingPersonaMode[] }[] = [
  { title: "표준", values: ["standard_bride", "standard_groom"] },
  { title: "호텔/럭셔리", values: ["luxury_hotel", "small_luxury"] },
  { title: "스몰웨딩", values: ["small_intimate", "small_outdoor", "small_budget"] },
  { title: "셀프/노식", values: ["self_no_ceremony", "snap_only", "no_wedding_travel"] },
  { title: "특수 상황", values: ["pregnancy", "remarriage", "international", "remote_overseas"] },
  { title: "기타", values: ["budget_analytic", "designer_late", "first_timer", "regional", "single_household"] },
];

const ALL_PERSONAS: WeddingPersonaMode[] = PERSONA_GROUPS.flatMap((g) => g.values);

// FeaturedRow 타입은 features/console/data/featuredProducts 에서 import(Task #3).

const PAGE_SIZE = 20;

const AdminFeaturedProducts = () => {
  const [rows, setRows] = useState<FeaturedRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filterCategory, setFilterCategory] = useState<"all" | string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "on" | "off">("all");
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const { rows, total } = await fetchFeaturedProducts({
        page,
        pageSize: PAGE_SIZE,
        filterCategory,
        filterStatus,
        keyword,
      });
      setRows(rows);
      setTotal(total);
    } catch (e: any) {
      toast.error(`조회 실패: ${e?.message ?? "오류"}`);
    } finally {
      setLoading(false);
    }
  }, [page, filterCategory, filterStatus, keyword]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    setPage(0);
  }, [filterCategory, filterStatus, keyword]);

  const toggleFeatured = async (row: FeaturedRow) => {
    const next = !row.is_featured;
    try {
      await updateFeaturedProduct(row.id, { is_featured: next });
    } catch (e: any) {
      toast.error(`업데이트 실패: ${e?.message ?? "오류"}`);
      return;
    }
    setRows((prev) => prev.map((p) => (p.id === row.id ? { ...p, is_featured: next } : p)));
  };

  const togglePersona = async (row: FeaturedRow, persona: WeddingPersonaMode) => {
    const cur = row.featured_personas ?? [];
    const next = cur.includes(persona) ? cur.filter((p) => p !== persona) : [...cur, persona];
    try {
      await updateFeaturedProduct(row.id, { featured_personas: next });
    } catch (e: any) {
      toast.error(`페르소나 업데이트 실패: ${e?.message ?? "오류"}`);
      return;
    }
    setRows((prev) => prev.map((p) => (p.id === row.id ? { ...p, featured_personas: next } : p)));
  };

  const selectAllPersonas = async (row: FeaturedRow) => {
    try {
      await updateFeaturedProduct(row.id, { featured_personas: [] }); // 빈 배열 = 전체.
    } catch (e: any) {
      toast.error(`전체 적용 실패: ${e?.message ?? "오류"}`);
      return;
    }
    setRows((prev) => prev.map((p) => (p.id === row.id ? { ...p, featured_personas: [] } : p)));
    toast.success("전체 페르소나 대상으로 변경");
  };

  return (
    <AdminGuard>
      <AdminLayout
        title="추천 상품 관리"
        description="추천(💛) 토글 ON 상품이 Store 상단 carousel 에 노출. 페르소나를 선택하면 해당 사용자에게만 보임."
      >
        {/* 필터 */}
        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-background border border-border rounded-lg">
          <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as any)}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 카테고리</SelectItem>
              {STORE_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="on">추천 ON</SelectItem>
              <SelectItem value="off">추천 OFF</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="상품명 검색 (Enter)"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setKeyword(keywordInput)}
              className="h-8 text-xs pl-7 pr-7"
            />
            {keywordInput && (
              <button
                onClick={() => {
                  setKeywordInput("");
                  setKeyword("");
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <span className="text-xs text-muted-foreground">총 {total}개</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            해당하는 노출 상품이 없습니다. 큐레이션 페이지에서 먼저 상품을 노출해주세요.
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <FeaturedRowCard
                key={row.id}
                row={row}
                onToggleFeatured={() => toggleFeatured(row)}
                onTogglePersona={(p) => togglePersona(row, p)}
                onSelectAll={() => selectAllPersonas(row)}
              />
            ))}
          </div>
        )}

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, total)} / {total}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground px-2">
                {page + 1} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * PAGE_SIZE >= total || loading}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </AdminLayout>
    </AdminGuard>
  );
};

interface FeaturedRowCardProps {
  row: FeaturedRow;
  onToggleFeatured: () => void;
  onTogglePersona: (p: WeddingPersonaMode) => void;
  onSelectAll: () => void;
}

const FeaturedRowCard = ({ row, onToggleFeatured, onTogglePersona, onSelectAll }: FeaturedRowCardProps) => {
  const isAllPersonas = (row.featured_personas ?? []).length === 0;
  const personaSet = new Set(row.featured_personas ?? []);

  return (
    <div className="bg-background border border-border rounded-lg p-3">
      <div className="flex gap-3 items-start">
        <div className="w-16 h-16 rounded flex-shrink-0 overflow-hidden">
          <ProductThumb url={row.thumbnail_url} alt={row.name} sizeClass="w-full h-full" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
              {getSourceLabel(row.source)}
            </span>
            {row.source_url && (
              <a
                href={row.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
              >
                원본 <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
            <div className="ml-auto flex items-center gap-1">
              <Star
                className={`w-3.5 h-3.5 ${row.is_featured ? "fill-primary text-primary" : "text-muted-foreground"}`}
              />
              <span className="text-xs text-muted-foreground mr-1">추천</span>
              <Switch checked={row.is_featured} onCheckedChange={onToggleFeatured} />
            </div>
          </div>
          <p className="text-sm font-semibold line-clamp-1 mb-0.5">{row.name}</p>
          <p className="text-xs text-muted-foreground">
            {row.sale_price ? `${row.sale_price.toLocaleString()}원 / ` : ""}
            {row.price.toLocaleString()}원
          </p>
        </div>
      </div>

      {row.is_featured && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold">
                추천 대상 페르소나
                {isAllPersonas ? (
                  <span className="ml-1 text-[10px] text-primary">전체</span>
                ) : (
                  <span className="ml-1 text-[10px] text-muted-foreground">
                    {personaSet.size}개 선택
                  </span>
                )}
              </span>
            </div>
            {!isAllPersonas && (
              <button
                onClick={onSelectAll}
                className="text-[10px] text-muted-foreground hover:text-primary underline"
              >
                전체 적용
              </button>
            )}
          </div>
          <div className="space-y-2">
            {PERSONA_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="text-[10px] text-muted-foreground mb-1">{group.title}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.values.map((p) => {
                    const active = personaSet.has(p);
                    return (
                      <button
                        key={p}
                        onClick={() => onTogglePersona(p)}
                        className={`px-2 py-1 text-[11px] rounded border ${
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : isAllPersonas
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-background text-muted-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        {PERSONA_LABEL[p]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {isAllPersonas && (
            <p className="text-[10px] text-muted-foreground mt-2">
              비워둔 상태 = 전체 페르소나에 노출. 하나라도 선택하면 해당 페르소나에만 노출됩니다.
            </p>
          )}
        </div>
      )}

      {/* 카테고리 칩 (참고용) */}
      <div className="mt-2 flex flex-wrap gap-1">
        {(row.categories ?? []).map((c) => {
          const label = STORE_CATEGORIES.find((x) => x.value === c)?.label ?? c;
          return (
            <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// Lint silence — ALL_PERSONAS 는 향후 일괄 적용 등에서 사용 가능하게 export.
export const _ADMIN_FEATURED_PERSONAS = ALL_PERSONAS;

export default AdminFeaturedProducts;
