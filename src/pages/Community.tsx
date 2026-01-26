import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  MessageSquare, 
  Heart,
  Eye,
  Search,
  PenSquare,
  Image,
  TrendingUp,
  Clock,
  X
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface Post {
  id: string;
  category: string;
  title: string;
  content: string;
  has_image: boolean;
  views: number;
  created_at: string;
  likes_count: number;
  comments_count: number;
}

const categories = ["전체", "웨딩홀", "스드메", "혼수", "허니문", "자유"];

const Community = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch posts from database
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["community-posts"],
    queryFn: async () => {
      const { data: postsData, error: postsError } = await supabase
        .from("community_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      // Fetch likes and comments counts for each post
      const postsWithCounts = await Promise.all(
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

      return postsWithCounts as Post[];
    },
  });

  // Get trending posts (sorted by likes)
  const trendingPosts = [...posts]
    .sort((a, b) => b.likes_count - a.likes_count)
    .slice(0, 3);

  const handleTabChange = (href: string) => {
    navigate(href);
  };

  const filteredPosts = selectedCategory === "전체" 
    ? posts 
    : posts.filter(post => post.category === selectedCategory);

  const searchedPosts = searchQuery 
    ? filteredPosts.filter(post => 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredPosts;

  const handlePostClick = (postId: string) => {
    navigate(`/community/${postId}`);
  };

  const handleWriteClick = () => {
    navigate("/community/write");
  };

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { 
      addSuffix: true, 
      locale: ko 
    }).replace("약 ", "");
  };

  const getPreview = (content: string) => {
    return content.length > 80 ? content.slice(0, 80) + "..." : content;
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          {isSearchOpen ? (
            <div className="flex-1 flex items-center gap-2">
              <Input
                type="text"
                placeholder="게시글 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 h-9"
                autoFocus
              />
              <button 
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery("");
                }}
                className="p-2"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-bold text-foreground">커뮤니티</h1>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsSearchOpen(true)}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <Search className="w-5 h-5 text-muted-foreground" />
                </button>
                <button 
                  onClick={handleWriteClick}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <PenSquare className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </>
          )}
        </div>
        
        {/* Category Tabs */}
        <div className="flex overflow-x-auto scrollbar-hide px-4 pb-3 gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        {/* Trending Section */}
        <div className="px-4 py-4 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">인기 게시글</span>
          </div>
          {isLoading ? (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="flex-shrink-0 w-[200px] h-24 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {trendingPosts.map((post, index) => (
                <button 
                  key={post.id}
                  onClick={() => handlePostClick(post.id)}
                  className="flex-shrink-0 w-[200px] p-3 bg-card rounded-xl border border-border text-left hover:border-primary/30 transition-colors"
                >
                  <span className="text-xs text-primary font-medium">#{index + 1}</span>
                  <p className="text-sm font-medium text-foreground line-clamp-2 mt-1">{post.title}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" /> {post.likes_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> {post.comments_count}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Post List */}
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {searchQuery ? `'${searchQuery}' 검색 결과` : "최신 글"}
              </span>
            </div>
            {selectedCategory !== "전체" && (
              <span className="text-xs text-primary font-medium">{selectedCategory}</span>
            )}
          </div>
          
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : searchedPosts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-sm">게시글이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {searchedPosts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => handlePostClick(post.id)}
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
                      <h4 className="font-semibold text-foreground text-sm mb-1 line-clamp-1">{post.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{getPreview(post.content)}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">익명</span>
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
                    </div>
                    {post.has_image && (
                      <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                        <Image className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Floating Write Button */}
      <button 
        onClick={handleWriteClick}
        className="fixed bottom-24 right-4 w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center z-40 hover:bg-primary/90 transition-colors active:scale-95"
      >
        <PenSquare className="w-6 h-6 text-primary-foreground" />
      </button>

      {/* Bottom Navigation */}
      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default Community;
