import { useState, useEffect } from "react";
import { Search, X, Clock, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface SearchResult {
  id: string;
  name: string;
  type: "venue" | "studio" | "honeymoon" | "honeymoon_gift" | "appliance" | "suit" | "hanbok" | "invitation_venue";
  address?: string;
  brand?: string;
  destination?: string;
}

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  venue: "웨딩홀",
  studio: "스드메",
  honeymoon: "신혼여행",
  honeymoon_gift: "혼수",
  appliance: "가전",
  suit: "예복",
  hanbok: "한복",
  invitation_venue: "청첩장모임",
};

const TYPE_ROUTES: Record<SearchResult["type"], string> = {
  venue: "/venue",
  studio: "/studio",
  honeymoon: "/honeymoon",
  honeymoon_gift: "/honeymoon-gifts",
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

  // Search across all tables
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const searchTerm = `%${searchQuery}%`;
    setIsLoading(true);

    const fetchResults = async () => {
      try {
        const [venues, studios, honeymoon, honeymoonGifts, appliances, suits, hanbok, invitationVenues] = await Promise.all([
          supabase.from("venues").select("number, name, address").ilike("name", searchTerm).limit(3),
          supabase.from("studios").select("id, name, address").ilike("name", searchTerm).limit(3),
          supabase.from("honeymoon").select("id, name, destination").ilike("name", searchTerm).limit(3),
          supabase.from("honeymoon_gifts").select("id, name, brand").ilike("name", searchTerm).limit(3),
          supabase.from("appliances").select("id, name, brand").ilike("name", searchTerm).limit(3),
          supabase.from("suits").select("id, name, address").ilike("name", searchTerm).limit(3),
          supabase.from("hanbok").select("id, name, address").ilike("name", searchTerm).limit(3),
          supabase.from("invitation_venues").select("id, name, address").ilike("name", searchTerm).limit(3),
        ]);

        const allResults: SearchResult[] = [
          ...(venues.data || []).map(v => ({ id: String(v.number), name: v.name, address: v.address, type: "venue" as const })),
          ...(studios.data || []).map(s => ({ ...s, type: "studio" as const })),
          ...(honeymoon.data || []).map(h => ({ ...h, type: "honeymoon" as const })),
          ...(honeymoonGifts.data || []).map(hg => ({ ...hg, type: "honeymoon_gift" as const })),
          ...(appliances.data || []).map(a => ({ ...a, type: "appliance" as const })),
          ...(suits.data || []).map(s => ({ ...s, type: "suit" as const })),
          ...(hanbok.data || []).map(h => ({ ...h, type: "hanbok" as const })),
          ...(invitationVenues.data || []).map(iv => ({ ...iv, type: "invitation_venue" as const })),
        ];

        setResults(allResults);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchResults, 300);
    return () => clearTimeout(debounce);
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
      <div className="sticky top-0 bg-card border-b border-border">
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
      <div className="overflow-y-auto max-h-[calc(100vh-56px)]">
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
