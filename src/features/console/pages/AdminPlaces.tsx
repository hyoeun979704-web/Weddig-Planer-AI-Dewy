import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Loader2,
  ImageOff,
  EyeOff,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { escapeLikePattern, quoteForOr } from "@/lib/postgrestEscape";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AdminGuard from "@/features/console/components/AdminGuard";
import AdminLayout from "@/features/console/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

/**
 * 운영자용 places 일괄 점검·검색 페이지.
 *
 * 핵심 기능:
 *  - 이름·도시 검색 (debounce)
 *  - 카테고리 필터
 *  - "이미지 누락만" 토글 — 깨진 카드 일괄 찾기
 *  - "비활성만" 토글 — 숨김 처리된 업체 확인
 *  - 행 클릭 → /admin/places/:id 편집 페이지
 *
 * 사용 시나리오:
 *  사용자가 깨진 이미지 보고 → 운영자가 이 페이지 → "이미지 누락만" ON
 *  → 카테고리 wedding_hall → 50개 목록 → 차례로 편집
 */

const CATEGORY_OPTIONS = [
  { value: "all", label: "전체 카테고리" },
  { value: "wedding_hall", label: "웨딩홀" },
  { value: "studio", label: "스튜디오" },
  { value: "dress_shop", label: "드레스샵" },
  { value: "makeup_shop", label: "메이크업샵" },
  { value: "honeymoon", label: "신혼여행" },
  { value: "hanbok", label: "한복" },
  { value: "tailor_shop", label: "예복" },
  { value: "jewelry", label: "예물·반지" },
  { value: "appliance", label: "가전·혼수" },
  { value: "invitation_venue", label: "청첩장 모임 장소" },
];

interface PlaceRow {
  place_id: string;
  category: string;
  name: string;
  city: string | null;
  district: string | null;
  main_image_url: string | null;
  is_active: boolean | null;
  is_partner: boolean | null;
  updated_at: string | null;
}

const PAGE_SIZE = 50;

const AdminPlaces = () => {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [missingImageOnly, setMissingImageOnly] = useState(false);
  const [inactiveOnly, setInactiveOnly] = useState(false);
  const [rows, setRows] = useState<PlaceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);

  // search debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  // 필터 변경 시 첫 페이지로
  useEffect(() => {
    setPage(0);
  }, [debounced, category, missingImageOnly, inactiveOnly]);

  const load = useCallback(async () => {
    setLoading(true);
    let q = (supabase as any)
      .from("places")
      .select(
        "place_id, category, name, city, district, main_image_url, is_active, is_partner, updated_at",
        { count: "exact" },
      );
    if (category !== "all") q = q.eq("category", category);
    if (missingImageOnly) q = q.is("main_image_url", null);
    if (inactiveOnly) q = q.eq("is_active", false);
    else q = q.eq("is_active", true);
    if (debounced) {
      // name 또는 city ILIKE 검색 — 검색어를 LIKE 와일드카드/.or() 파서 양쪽에서 살균
      // (raw 보간 시 `,`·`)`·`%` 가 필터 인젝션/오작동을 일으킴). 공통 헬퍼 재사용.
      const term = quoteForOr(`%${escapeLikePattern(debounced)}%`);
      q = q.or(`name.ilike.${term},city.ilike.${term}`);
    }
    q = q.order("updated_at", { ascending: false, nullsFirst: false }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    const { data, error, count } = await q;
    setLoading(false);
    if (error) {
      console.error("places list failed", error);
      return;
    }
    setRows((data ?? []) as PlaceRow[]);
    setTotal(count ?? 0);
  }, [debounced, category, missingImageOnly, inactiveOnly, page]);

  useEffect(() => { load(); }, [load]);

  const pageInfo = useMemo(() => {
    const start = page * PAGE_SIZE + 1;
    const end = Math.min((page + 1) * PAGE_SIZE, total);
    return { start, end, hasNext: end < total, hasPrev: page > 0 };
  }, [page, total]);

  return (
    <AdminGuard>
      <AdminLayout title="업체 정보 관리" description="places — 검색·필터·일괄 점검">
        {/* 필터 바 */}
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름·도시 검색"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant={missingImageOnly ? "default" : "outline"}
              onClick={() => setMissingImageOnly((v) => !v)}
            >
              <ImageOff className="w-4 h-4 mr-1" /> 이미지 누락만
            </Button>
            <Button
              size="sm"
              variant={inactiveOnly ? "default" : "outline"}
              onClick={() => setInactiveOnly((v) => !v)}
            >
              <EyeOff className="w-4 h-4 mr-1" /> 비활성만
            </Button>
          </div>
        </div>

        {/* 결과 헤더 */}
        <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
          <span>
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 inline animate-spin mr-1" />
            ) : (
              <strong className="text-foreground">{total}건</strong>
            )}{" "}
            · {pageInfo.start}–{pageInfo.end}
          </span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={!pageInfo.hasPrev || loading}
            >
              이전
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => p + 1)}
              disabled={!pageInfo.hasNext || loading}
            >
              다음
            </Button>
          </div>
        </div>

        {/* 목록 */}
        {rows.length === 0 && !loading ? (
          <div className="text-center py-16">
            <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">조건에 맞는 업체가 없어요.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <Link
                key={r.place_id}
                to={`/admin/places/${r.place_id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 active:scale-[0.99] transition-transform"
              >
                <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {r.main_image_url ? (
                    <img
                      src={r.main_image_url}
                      alt={r.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // 깨진 이미지: 부모 placeholder 노출
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <ImageOff className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{r.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {CATEGORY_OPTIONS.find((c) => c.value === r.category)?.label ?? r.category}
                    {r.city && ` · ${r.city}`}
                    {r.district && ` ${r.district}`}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {!r.main_image_url && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">
                        이미지 없음
                      </span>
                    )}
                    {!r.is_active && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        비활성
                      </span>
                    )}
                    {r.is_partner && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                        파트너
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </AdminLayout>
    </AdminGuard>
  );
};

export default AdminPlaces;
