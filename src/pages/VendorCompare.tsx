import { useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Check, Scale } from "lucide-react";
import { toast } from "sonner";
import Seo from "@/components/Seo";
import PageHeader from "@/components/PageHeader";
import CompareTable from "@/components/compare/CompareTable";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCoupleFavorites } from "@/hooks/useCoupleFavorites";
import { useQuoteResponses } from "@/hooks/useQuotes";
import { useCompareItems, type CompareQuote } from "@/hooks/useCompareItems";
import { markBoardSlotBookedByQuoteCategory } from "@/hooks/useVendorBoard";
import { primarySlotForQuoteCategory } from "@/lib/vendorBoard";
import {
  categoryLabel,
  categoryForItemType,
  COMPARE_CATEGORY_ORDER,
  MIN_COMPARE,
  MAX_COMPARE,
} from "@/lib/vendorCompare";

interface CandidateMeta { placeId: string; name: string; image: string | null }

// 비교 결과 + 결정 루프 공용 본문(찜/견적 모드가 후보·견적만 다르게 넘긴다).
const CompareBody = ({
  candidates,
  category,
  quoteByPlace,
  showQuote,
  initialSelected,
}: {
  candidates: CandidateMeta[];
  category: string;
  quoteByPlace?: Record<string, CompareQuote>;
  showQuote?: boolean;
  initialSelected: string[];
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>(initialSelected.slice(0, MAX_COMPARE));
  const [decidedPlaceId, setDecidedPlaceId] = useState<string | null>(null);

  const canDecide = !!primarySlotForQuoteCategory(category);
  const { items, loading } = useCompareItems(selected, quoteByPlace);
  // selected 순서 유지하며 정렬(useCompareItems 가 입력 순서 보존하나 방어적으로 한번 더).
  const orderedItems = useMemo(
    () => selected.map((id) => items.find((it) => it.placeId === id)).filter((x): x is NonNullable<typeof x> => !!x),
    [selected, items],
  );

  const toggle = (placeId: string) => {
    setSelected((prev) => {
      if (prev.includes(placeId)) return prev.filter((id) => id !== placeId);
      if (prev.length >= MAX_COMPARE) {
        toast.info(`최대 ${MAX_COMPARE}곳까지 비교할 수 있어요`);
        return prev;
      }
      return [...prev, placeId];
    });
  };

  const decide = async (placeId: string, name: string) => {
    if (!user) { navigate("/auth"); return; }
    await markBoardSlotBookedByQuoteCategory(user.id, category, placeId, name);
    setDecidedPlaceId(placeId);
    toast.success("내 업체 보드에 이 업체로 기록했어요", {
      action: { label: "보드 보기", onClick: () => navigate("/board") },
    });
  };

  return (
    <div className="space-y-4">
      {/* 후보 선택 — 칩 토글(최대 4) */}
      <div>
        <p className="text-[12px] text-muted-foreground mb-2">
          비교할 업체를 {MIN_COMPARE}~{MAX_COMPARE}곳 선택하세요 ({selected.length} 선택)
        </p>
        <div className="grid grid-cols-2 gap-2">
          {candidates.map((c) => {
            const on = selected.includes(c.placeId);
            return (
              <button
                key={c.placeId}
                type="button"
                onClick={() => toggle(c.placeId)}
                className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-colors ${
                  on ? "border-primary bg-primary/5" : "border-border bg-card"
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0">
                  {c.image ? <img src={c.image} alt={c.name} className="w-full h-full object-cover" /> : null}
                </div>
                <span className="flex-1 min-w-0 text-[12px] font-medium text-foreground line-clamp-2">{c.name}</span>
                <span className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center border ${on ? "bg-primary border-primary" : "border-border"}`}>
                  {on && <Check className="w-3 h-3 text-primary-foreground" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 비교표 */}
      {selected.length < MIN_COMPARE ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-[13px] text-muted-foreground">
          {MIN_COMPARE}곳 이상 선택하면 비교표가 나타나요
        </div>
      ) : loading ? (
        <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-3">
          <CompareTable
            items={orderedItems}
            category={category}
            showQuote={showQuote}
            onRemove={(id) => toggle(id)}
            onDecide={canDecide ? (it) => decide(it.placeId, it.name) : undefined}
            decidedPlaceId={decidedPlaceId}
          />
          {!canDecide && (
            <p className="mt-2 text-[11px] text-muted-foreground px-1">이 카테고리는 보드 슬롯이 없어 '결정' 기록은 지원하지 않아요.</p>
          )}
        </div>
      )}
    </div>
  );
};

// ── 견적 비교 모드 ── 한 견적 요청에 들어온 업체 응답들을 나란히.
const QuoteCompare = ({ requestId }: { requestId: string }) => {
  const { request, responses, loading } = useQuoteResponses(requestId);

  const candidates: CandidateMeta[] = useMemo(
    () => responses.map((r) => ({ placeId: r.place_id, name: r.place_name ?? "업체", image: r.place_image ?? null })),
    [responses],
  );
  const quoteByPlace = useMemo(() => {
    const m: Record<string, CompareQuote> = {};
    for (const r of responses) m[r.place_id] = { priceMin: r.price_min, priceMax: r.price_max, message: r.message ?? null };
    return m;
  }, [responses]);

  if (loading) return <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!request) return <EmptyState text="견적 요청을 찾을 수 없어요." />;
  if (candidates.length === 0) return <EmptyState text="아직 받은 견적이 없어요. 업체 응답이 오면 비교할 수 있어요." />;

  return (
    <CompareBody
      candidates={candidates}
      category={request.category}
      quoteByPlace={quoteByPlace}
      showQuote
      initialSelected={candidates.map((c) => c.placeId)}
    />
  );
};

// ── 찜 비교 모드 ── 카테고리별 찜한 업체(커플 공유)를 후보로.
const FavoritesCompare = ({ initialCategory }: { initialCategory: string | null }) => {
  const { merged } = useCoupleFavorites();

  // 찜 → {placeId, category} (벤더 카테고리만).
  const favByCategory = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const f of merged) {
      const cat = categoryForItemType(f.item_type);
      if (!cat) continue;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(f.item_id);
    }
    return map;
  }, [merged]);

  const availableCategories = useMemo(
    () => COMPARE_CATEGORY_ORDER.filter((c) => (favByCategory.get(c)?.length ?? 0) > 0),
    [favByCategory],
  );

  const [category, setCategory] = useState<string>(
    initialCategory && favByCategory.has(initialCategory) ? initialCategory : availableCategories[0] ?? "",
  );

  const candidateIds = favByCategory.get(category) ?? [];

  // 후보 칩용 경량 메타(이름·썸네일만) — 상세는 선택 시 useCompareItems 가 로드.
  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["compare-candidates", candidateIds.join(",")],
    queryFn: async (): Promise<CandidateMeta[]> => {
      if (candidateIds.length === 0) return [];
      const { data } = await supabase
        .from("places")
        .select("place_id, name, main_image_url")
        .in("place_id", candidateIds);
      return ((data ?? []) as { place_id: string; name: string; main_image_url: string | null }[]).map((p) => ({
        placeId: p.place_id, name: p.name, image: p.main_image_url,
      }));
    },
    enabled: candidateIds.length > 0,
  });

  if (availableCategories.length === 0) {
    return <EmptyState text="찜한 업체가 없어요. 마음에 드는 업체를 하트로 저장하면 여기서 비교할 수 있어요." cta={{ label: "업체 둘러보기", path: "/venues" }} />;
  }

  return (
    <div className="space-y-4">
      {/* 카테고리 칩 */}
      {availableCategories.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
          {availableCategories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-colors ${
                category === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {categoryLabel(c)} {favByCategory.get(c)?.length ?? 0}
            </button>
          ))}
        </div>
      )}

      {candidateIds.length < MIN_COMPARE ? (
        <EmptyState text={`'${categoryLabel(category)}' 찜이 ${candidateIds.length}곳뿐이에요. 2곳 이상 찜하면 비교할 수 있어요.`} />
      ) : isLoading ? (
        <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        // category 가 바뀌면 선택 초기화되도록 key 부여.
        <CompareBody key={category} candidates={candidates} category={category} initialSelected={[]} />
      )}
    </div>
  );
};

const EmptyState = ({ text, cta }: { text: string; cta?: { label: string; path: string } }) => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Scale className="w-8 h-8 text-muted-foreground" />
      </div>
      <p className="text-[14px] text-muted-foreground mb-4">{text}</p>
      {cta && (
        <button onClick={() => navigate(cta.path)} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-[13px] font-medium">
          {cta.label}
        </button>
      )}
    </div>
  );
};

const VendorCompare = () => {
  const [params] = useSearchParams();
  const quoteId = params.get("quote");
  const category = params.get("category");

  return (
    <div className="min-h-screen bg-background app-col mx-auto pb-24">
      <Seo title="업체 비교 | Dewy" description="찜한 업체나 받은 견적을 나란히 놓고 가격·조건을 한눈에 비교하세요." path="/compare" />
      <PageHeader title="업체 비교" />
      <main className="px-4 py-5">
        {quoteId ? <QuoteCompare requestId={quoteId} /> : <FavoritesCompare initialCategory={category} />}
      </main>
    </div>
  );
};

export default VendorCompare;
