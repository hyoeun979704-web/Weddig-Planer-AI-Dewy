import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  Bookmark, 
  Heart, 
  MessageSquare, 
  Eye, 
  Image,
  ArrowLeft
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
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

const BookmarkedPosts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { favorites, isLoading: favoritesLoading } = useFavorites();

  // Filter only community_post favorites
  const bookmarkedPostIds = favorites
    .filter(fav => fav.item_type === "community_post")
    .map(fav => fav.item_id);

  // Fetch bookmarked posts from database
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["bookmarked-posts", bookmarkedPostIds],
    queryFn: async () => {
      if (bookmarkedPostIds.length === 0) return [];

      const { data: postsData, error: postsError } = await supabase
        .from("community_posts")
        .select("*")
        .in("id", bookmarkedPostIds)
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
    enabled: bookmarkedPostIds.length > 0,
  });

  const handleTabChange = (href: string) => {
    navigate(href);
  };

  const handlePostClick = (postId: string) => {
    navigate(`/community/${postId}`);
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

  const isLoading = favoritesLoading || postsLoading;

  // If not logged in, show login prompt
  if (!user) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="flex items-center px-4 h-14 gap-3">
            <button onClick={() => navigate(-1)} className="p-1">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-bold text-foreground">저장한 게시글</h1>
          </div>
        </header>

        <main className="pb-20 px-4">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Bookmark className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">로그인이 필요합니다</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              저장한 게시글을 보려면<br />
              로그인해주세요
            </p>
            <button
              onClick={() => navigate("/auth")}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium"
            >
              로그인하기
            </button>
          </div>
        </main>

        <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center px-4 h-14 gap-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">저장한 게시글</h1>
          {posts.length > 0 && (
            <span className="text-sm text-muted-foreground">({posts.length})</span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        <div className="px-4 py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <Bookmark className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">저장한 게시글이 없습니다</h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                관심있는 게시글을<br />
                북마크 버튼을 눌러 저장해보세요
              </p>
              <button
                onClick={() => navigate("/community")}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium"
              >
                커뮤니티 둘러보기
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
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
                        <Bookmark className="w-3 h-3 text-primary fill-primary ml-auto" />
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

      {/* Bottom Navigation */}
      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default BookmarkedPosts;
