import { useState, useEffect, useMemo } from "react";
import { Search, X, Clock, TrendingUp, Heart, MessageSquare, Eye, Image } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface Post {
  id: string;
  category: string;
  title: string;
  content: string;
  has_image: boolean | null;
  views: number | null;
  created_at: string;
}

interface SearchResult extends Post {
  likes_count: number;
  comments_count: number;
}

const POPULAR_KEYWORDS = [
  "웨딩홀 추천",
  "스드메 가격",
  "신혼여행 준비",
  "혼수 리스트",
  "예복 맞춤",
];

const RECOMMENDED_SEARCHES = [
  "결혼 준비",
  "웨딩 패키지",
  "청첩장",
  "본식 드레스",
  "스튜디오 후기",
  "허니문 추천",
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
    const searchTerm = `%${searchQuery}%`;

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

        // Fetch likes and comments counts
        const resultsWithCounts = await Promise.all(
          (postsData || []).map(async (post) => {
            const [likesResult, commentsResult] = await Promise.all([
              supabase
                .from("community_likes")
                .select("*", { count: "exact", head: true })
                .eq("post_id", post.id),
              supabase
                .from("community_comments")
                .select("*", { count: "exact", head: true })
                .eq("post_id", post.id),
            ]);

            return {
              ...post,
              likes_count: likesResult.count || 0,
              comments_count: commentsResult.count || 0,
            };
          })
        );

        setResults(resultsWithCounts as SearchResult[]);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchResults, 300);
    return () => clearTimeout(debounce);
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
      <div className="sticky top-0 bg-card border-b border-border">
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
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">
                  검색 결과 <span className="text-primary font-semibold">{results.length}</span>개
                </p>
                {results.map((post) => (
                  <button
                    key={post.id}
                    onClick={() => handleResultClick(post.id)}
                    className="w-full p-4 bg-card rounded-2xl border border-border hover:border-primary/30 transition-colors text-left"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-muted rounded text-[10px] font-medium text-muted-foreground">
                            {post.category}
                          </span>
                          <span className="text-xs text-muted-foreground">{formatDate(post.created_at)}</span>
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
                          <Image className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">검색 결과가 없습니다</p>
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
