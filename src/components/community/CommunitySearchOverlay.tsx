import { useState, useEffect, useMemo } from "react";
import { Search, X, Clock, TrendingUp, Heart, MessageSquare, Eye, Image as ImageIcon, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { escapeLikePattern, quoteForOr } from "@/lib/postgrestEscape";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

type PostWeddingStyle = "general" | "small" | "self";

interface Post {
  id: string;
  category: string;
  title: string;
  content: string;
  has_image: boolean | null;
  views: number | null;
  created_at: string;
  wedding_style: PostWeddingStyle | null;
}

interface SearchResult extends Post {
  likes_count: number;
  comments_count: number;
}

type StyleFilter = "all" | PostWeddingStyle;
type SortKey = "relevance" | "latest" | "popular" | "comments";

const STYLE_FILTERS: { key: StyleFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "general", label: "일반" },
  { key: "small", label: "스몰" },
  { key: "self", label: "셀프" },
];

const STYLE_BADGE: Record<PostWeddingStyle, { label: string; classes: string }> = {
  general: { label: "일반", classes: "bg-blue-100 text-blue-700" },
  small: { label: "스몰", classes: "bg-emerald-100 text-emerald-700" },
  self: { label: "셀프", classes: "bg-amber-100 text-amber-700" },
};

const CATEGORY_FILTERS = ["전체", "웨딩홀", "스드메", "허니문", "혼수", "자유"];

const SORT_LABELS: Record<SortKey, string> = {
  relevance: "정확도순",
  latest: "최신순",
  popular: "인기순",
  comments: "댓글많은순",
};

// 페르소나가 골고루 보일 수 있도록 일반·스몰·셀프를 섞어 배치.
const POPULAR_KEYWORDS = [
  "웨딩홀 추천",
  "스몰웨딩 장소",
  "셀프 촬영 스팟",
  "스드메 가격",
  "하우스웨딩 후기",
];

const RECOMMENDED_SEARCHES = [
  "셀프웨딩",
  "스몰웨딩",
  "본식 드레스",
  "청첩장 DIY",
  "레스토랑 웨딩",
  "야외 셀프촬영",
  "혼수 리스트",
  "허니문 추천",
  "예복 맞춤",
];

const STORAGE_KEY = "community-recent-searches";

interface CommunitySearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const CommunitySearchOverlay = ({ isOpen, onClose }: CommunitySearchOverlayProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [styleFilter, setStyleFilter] = useState<StyleFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("전체");
  const [sortBy, setSortBy] = useState<SortKey>("relevance");
  const [showFilters, setShowFilters] = useState(false);

  // 검색어가 비워지면 필터/정렬도 초기화 — 다음 검색이 깨끗한 상태에서 시작.
  useEffect(() => {
    if (!searchQuery.trim()) {
      setStyleFilter("all");
      setCategoryFilter("전체");
      setSortBy("relevance");
    }
  }, [searchQuery]);

  // 결과에 클라이언트 측 필터·정렬을 적용. 매 키스트로크 동기 재계산이 입력 jank 를
  // 유발하므로 입력값(results·필터·정렬)이 바뀔 때만 재계산하도록 메모.
  // 스타일 NULL = "모든 부부 대상" 글이므로 어떤 스타일 필터에서도 함께 노출.
  const filteredResults = useMemo(
    () =>
      results
        .filter((r) =>
          styleFilter === "all"
            ? true
            : r.wedding_style === styleFilter || r.wedding_style === null
        )
        .filter((r) => (categoryFilter === "전체" ? true : r.category === categoryFilter)),
    [results, styleFilter, categoryFilter]
  );

  const sortedResults = useMemo(
    () =>
      [...filteredResults].sort((a, b) => {
        if (sortBy === "latest") {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === "popular") {
          return (b.likes_count + b.comments_count) - (a.likes_count + a.comments_count);
        }
        if (sortBy === "comments") {
          return b.comments_count - a.comments_count;
        }
        // 정확도순: 서버에서 받은 순서 유지 (최신순 + ilike 매칭).
        return 0;
      }),
    [filteredResults, sortBy]
  );

  const activeFilterCount =
    (styleFilter === "all" ? 0 : 1) +
    (categoryFilter === "전체" ? 0 : 1) +
    (sortBy === "relevance" ? 0 : 1);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Save search to recent
  const saveToRecent = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...recentSearches.filter(s => s !== trimmed)].slice(0, 8);
    setRecentSearches(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  // Search posts with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    // PostgREST .or() 문자열은 자동 이스케이프되지 않는다 — 사용자 입력의 LIKE 와일드카드(%,_,\)와
    // .or() 구분자(,()") 를 모두 살균해야 필터 인젝션을 막는다(공용 헬퍼 사용).
    const searchTerm = quoteForOr(`%${escapeLikePattern(searchQuery)}%`);

    // 느린 이전 요청이 새 요청보다 늦게 도착해 결과를 덮어쓰는 경쟁상태 방지.
    let cancelled = false;
    const fetchResults = async () => {
      try {
        // Search posts by title or content
        const { data: postsData, error } = await supabase
          .from("community_posts")
          .select("*")
          .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) throw error;

        // 좋아요/댓글 수는 집계 컬럼(트리거 동기화)에서 직접 읽는다. (N+1 제거)
        const resultsWithCounts = (postsData || []).map((post) => ({
          ...post,
          likes_count: post.like_count ?? 0,
          comments_count: post.comment_count ?? 0,
        }));

        if (!cancelled) setResults(resultsWithCounts as SearchResult[]);
      } catch (error) {
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

  const handleResultClick = (postId: string) => {
    saveToRecent(searchQuery);
    onClose();
    navigate(`/community/${postId}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      saveToRecent(searchQuery);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const removeRecentSearch = (search: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s !== search);
    setRecentSearches(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { 
      addSuffix: true, 
      locale: ko 
    }).replace("약 ", "");
  };

  const getPreview = (content: string) => {
    return content.length > 60 ? content.slice(0, 60) + "..." : content;
  };

  // Highlight matching text
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={i} className="bg-primary/20 text-primary px-0.5 rounded">{part}</mark> 
        : part
    );
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
              placeholder="게시글 제목, 내용 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
              autoFocus
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => setSearchQuery("")}
                className="p-1 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </form>
          <button 
            onClick={onClose}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2"
          >
            취소
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto max-h-[calc(100vh-56px)]">
        {searchQuery.trim() ? (
          // Search Results
          <div>
            {/* Filter toolbar */}
            <div className="sticky top-0 z-10 bg-card border-b border-border">
              <div className="flex items-center justify-between px-4 py-2.5">
                <p className="text-sm text-muted-foreground">
                  {isLoading ? (
                    "검색 중..."
                  ) : (
                    <>
                      검색 결과{" "}
                      <span className="text-primary font-semibold">
                        {sortedResults.length}
                      </span>
                      개
                      {sortedResults.length !== results.length && (
                        <span className="text-[11px] ml-1">
                          (총 {results.length} 중 필터)
                        </span>
                      )}
                    </>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => setShowFilters((v) => !v)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                    activeFilterCount > 0 || showFilters
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  필터
                  {activeFilterCount > 0 && (
                    <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full bg-background/30 text-[10px] flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>

              {showFilters && (
                <div className="px-4 pb-3 space-y-2.5 border-t border-border bg-card">
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground mt-2 mb-1.5">결혼 유형</p>
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                      {STYLE_FILTERS.map((f) => {
                        const isActive = styleFilter === f.key;
                        return (
                          <button
                            key={f.key}
                            type="button"
                            onClick={() => setStyleFilter(f.key)}
                            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${
                              isActive
                                ? "bg-foreground text-background"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {f.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">카테고리</p>
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                      {CATEGORY_FILTERS.map((c) => {
                        const isActive = categoryFilter === c;
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setCategoryFilter(c)}
                            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${
                              isActive
                                ? "bg-foreground text-background"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {c}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">정렬</p>
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                      {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => {
                        const isActive = sortBy === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setSortBy(key)}
                            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${
                              isActive
                                ? "bg-foreground text-background"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {SORT_LABELS[key]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : sortedResults.length > 0 ? (
                <div className="space-y-3">
                  {sortedResults.map((post) => {
                    const styleBadge = post.wedding_style
                      ? STYLE_BADGE[post.wedding_style]
                      : null;
                    return (
                      <button
                        key={post.id}
                        onClick={() => handleResultClick(post.id)}
                        className="w-full p-4 bg-card rounded-2xl border border-border hover:border-primary/30 transition-colors text-left"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <span className="px-2 py-0.5 bg-muted rounded text-[10px] font-medium text-muted-foreground">
                                {post.category}
                              </span>
                              {styleBadge && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${styleBadge.classes}`}>
                                  {styleBadge.label}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {formatDate(post.created_at)}
                              </span>
                            </div>
                            <h4 className="font-semibold text-foreground text-sm mb-1 line-clamp-1">
                              {highlightText(post.title, searchQuery)}
                            </h4>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                              {highlightText(getPreview(post.content), searchQuery)}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Heart className="w-3 h-3" /> {post.likes_count}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" /> {post.comments_count}
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" /> {post.views}
                              </span>
                            </div>
                          </div>
                          {post.has_image && (
                            <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                              <ImageIcon className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : results.length > 0 ? (
                <div className="text-center py-12">
                  <SlidersHorizontal className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium">필터에 맞는 결과가 없어요</p>
                  <button
                    type="button"
                    onClick={() => {
                      setStyleFilter("all");
                      setCategoryFilter("전체");
                      setSortBy("relevance");
                    }}
                    className="mt-3 px-4 py-1.5 rounded-full bg-muted text-xs font-semibold text-foreground"
                  >
                    필터 초기화
                  </button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium">검색 결과가 없습니다</p>
                  <p className="text-sm text-muted-foreground mt-1">다른 검색어를 입력해보세요</p>
                </div>
              )}
            </div>
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
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    전체 삭제
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(search)}
                      className="group flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-sm text-foreground hover:bg-muted/80 transition-colors"
                    >
                      <span>{search}</span>
                      <X 
                        className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => removeRecentSearch(search, e)}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Keywords */}
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-primary" />
                인기 검색어
              </h3>
              <div className="space-y-1">
                {POPULAR_KEYWORDS.map((keyword, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(keyword)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <span className={`w-6 h-6 flex items-center justify-center text-sm font-bold rounded-full ${
                      index < 3 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      {index + 1}
                    </span>
                    <span className="text-foreground">{keyword}</span>
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
                    className="px-3 py-1.5 border border-border rounded-full text-sm text-foreground hover:bg-muted hover:border-primary/30 transition-colors"
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

export default CommunitySearchOverlay;
