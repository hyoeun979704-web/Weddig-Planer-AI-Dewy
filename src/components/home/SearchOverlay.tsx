import { useState, useEffect } from "react";
import { Search, X, Clock, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { joinRegion } from "@/lib/placeMappers";

interface SearchResult {
  id: string;
  name: string;
  type: "venue" | "studio" | "honeymoon" | "jewelry" | "appliance" | "suit" | "hanbok" | "invitation_venue";
  address?: string;
  brand?: string;
  destination?: string;
}

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  venue: "웨딩홀",
  studio: "스드메",
  honeymoon: "신혼여행",
  jewelry: "예물·예단",
  appliance: "가전",
  suit: "예복",
  hanbok: "한복",
  invitation_venue: "청첩장모임",
};

const TYPE_ROUTES: Record<SearchResult["type"], string> = {
  venue: "/venue",
  studio: "/studio",
  honeymoon: "/honeymoon",
  jewelry: "/jewelry",
  appliance: "/appliances",
  suit: "/suit",
  hanbok: "/hanbok",
  invitation_venue: "/invitation-venues",
};

const RECOMMENDED_SEARCHES = [
  "강남 웨딩홀",
  "스튜디오 촬영",
  "신혼여행 몰디브",
  "예복 맞춤",
  "한복 대여",
  "혼수 가전",
];

const POPULAR_SEARCHES = [
  "그랜드 웨딩홀",
  "스튜디오 패키지",
  "하와이 신혼여행",
  "삼성 가전",
  "맞춤 예복",
];

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchOverlay = ({ isOpen, onClose }: SearchOverlayProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("recentSearches");
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Save search to recent
  const saveToRecent = (query: string) => {
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
  };

  // ILIKE 와일드카드(%, _, \) 이스케이프 — 사용자 입력이 의도치 않게 와일드카드로 동작하지
  // 않도록(F#9). Postgres LIKE escape는 backslash 기본.
  const escapeIlike = (s: string): string => s.replace(/\\/g, "\\\\").replace(/[%_]/g, (m) => `\\${m}`);

  // Search across all tables
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);

    // "{지역} {키워드}" 복합 쿼리 파싱 — 천안/마포/강남 같은 시군구 또는
    // 충남/서울 같은 시도가 첫 토큰이면 region/district 필터에 적용.
    // 미매칭 토큰은 name ILIKE 로 폴백.
    const rawTokens = searchQuery.trim().split(/\s+/).filter(Boolean);
    const REGION_HINTS = [
      "서울", "경기", "인천", "부산", "대구", "대전", "광주", "울산", "세종",
      "강원", "충남", "충북", "전남", "전북", "경남", "경북", "제주",
    ];
    // 시군구 휴리스틱은 너무 짧은 토큰("구", "시")은 제외 — 단일 글자는 의미 없음(F#8).
    const looksLikeSigungu = (t: string) => t.length >= 2 && /시$|군$|구$/.test(t);
    let regionToken: string | null = null;
    let sigunguToken: string | null = null;
    const nameTokens: string[] = [];
    for (const t of rawTokens) {
      if (!regionToken && REGION_HINTS.some((r) => t.startsWith(r))) {
        regionToken = t;
        continue;
      }
      if (!sigunguToken && looksLikeSigungu(t)) {
        sigunguToken = t;
        continue;
      }
      nameTokens.push(t);
    }
    const nameTerm = nameTokens.length > 0 ? `%${escapeIlike(nameTokens.join(" "))}%` : null;
    // 지역/시군구 토큰이 잡혀도 원본 쿼리는 name ILIKE 폴백으로도 함께 검색.
    // 사용자가 "서울" 만 쳐도 '서울숲 채플' 같이 name 매칭이 활성화되도록(F#8).
    const fallbackNameTerm = !nameTerm ? `%${escapeIlike(searchQuery.trim())}%` : null;

    // 디바운스/race 가드 — 이전 fetch 가 늦게 도착해 setResults 를 덮어쓰지 못하도록(F#12).
    let cancelled = false;

    const fetchResults = async () => {
      try {
        const slugToType: Record<string, SearchResult["type"]> = {
          wedding_hall: "venue",
          studio: "studio",
          dress_shop: "studio",
          makeup_shop: "studio",
          hanbok: "hanbok",
          tailor_shop: "suit",
          honeymoon: "honeymoon",
          jewelry: "jewelry",
          appliance: "appliance",
          invitation_venue: "invitation_venue",
          planner: "venue",
        };

        // 1) 정밀 쿼리: region + sigungu + name 모두 적용(가능한 경우).
        const primary = (supabase as any)
          .from("places")
          .select("place_id, name, category, city, district")
          .eq("is_active", true)
          .is("deleted_at", null);
        if (regionToken) primary.ilike("city", `%${escapeIlike(regionToken)}%`);
        if (sigunguToken) primary.ilike("district", `%${escapeIlike(sigunguToken)}%`);
        if (nameTerm) primary.ilike("name", nameTerm);
        else if (!regionToken && !sigunguToken) primary.ilike("name", fallbackNameTerm!);
        const { data, error } = await primary.limit(24);
        if (error) throw error;
        if (cancelled) return;

        let merged = (data ?? []) as Array<{ place_id: string; name: string; category: string; city: string | null; district: string | null }>;

        // 2) 지역 토큰만 있고 name 토큰이 없을 때, 원본 쿼리로 name ILIKE 보강 검색.
        //    user 가 "서울" 만 쳤어도 '서울숲 채플' 같이 name 에 들어간 행을 같이 노출(F#8).
        if ((regionToken || sigunguToken) && !nameTerm && fallbackNameTerm) {
          const { data: byName } = await (supabase as any)
            .from("places")
            .select("place_id, name, category, city, district")
            .eq("is_active", true)
            .is("deleted_at", null)
            .ilike("name", fallbackNameTerm)
            .limit(24);
          if (cancelled) return;
          if (byName) {
            const seen = new Set(merged.map((p) => p.place_id));
            for (const p of byName as typeof merged) {
              if (!seen.has(p.place_id)) {
                merged.push(p);
                seen.add(p.place_id);
              }
            }
          }
        }

        const allResults: SearchResult[] = merged.slice(0, 24).map((p) => ({
          id: p.place_id,
          name: p.name,
          address: joinRegion(p.city, p.district) ?? undefined,
          type: slugToType[p.category] ?? "venue",
        }));

        setResults(allResults);
      } catch (error) {
        if (cancelled) return;
        console.error("Search error:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchResults, 300);
    return () => {
      cancelled = true;
      clearTimeout(debounce);
    };
  }, [searchQuery]);

  const handleResultClick = (result: SearchResult) => {
    saveToRecent(result.name);
    onClose();
    navigate(`${TYPE_ROUTES[result.type]}/${result.id}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      saveToRecent(searchQuery);
      // Could navigate to a search results page
      onClose();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    saveToRecent(suggestion);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("recentSearches");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background">
      {/* Header */}
      <div className="sticky safe-sticky-header bg-card border-b border-border">
        <div className="flex items-center px-4 h-14 gap-2">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
            <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <Input
              type="text"
              placeholder="웨딩홀, 스튜디오, 드레스 등 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
              autoFocus
            />
          </form>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto max-h-[calc(100vh-var(--app-header-total-height))] pb-[var(--safe-bottom)]">
        {searchQuery.trim() ? (
          // Search Results
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-3">
                  검색 결과 {results.length}개
                </p>
                {results.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <Search className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{result.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {result.address || result.brand || result.destination}
                      </p>
                    </div>
                    <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground flex-shrink-0">
                      {TYPE_LABELS[result.type]}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">검색 결과가 없습니다</p>
                <p className="text-sm text-muted-foreground mt-1">다른 검색어를 입력해보세요</p>
              </div>
            )}
          </div>
        ) : (
          // Suggestions
          <div className="p-4 space-y-6">
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    최근 검색어
                  </h3>
                  <button 
                    onClick={clearRecentSearches}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    전체 삭제
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(search)}
                      className="px-3 py-1.5 bg-muted rounded-full text-sm text-foreground hover:bg-muted/80 transition-colors"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Searches */}
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4" />
                인기 검색어
              </h3>
              <div className="space-y-1">
                {POPULAR_SEARCHES.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(search)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-primary">
                      {index + 1}
                    </span>
                    <span className="text-foreground">{search}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recommended Searches */}
            <div>
              <h3 className="font-semibold text-foreground mb-3">추천 검색어</h3>
              <div className="flex flex-wrap gap-2">
                {RECOMMENDED_SEARCHES.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(search)}
                    className="px-3 py-1.5 border border-border rounded-full text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchOverlay;
