import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Heart, 
  MessageSquare, 
  Eye, 
  Share2, 
  Send,
  User,
  Pencil,
  Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface Post {
  id: string;
  user_id: string;
  category: string;
  title: string;
  content: string;
  has_image: boolean;
  image_urls: string[];
  views: number;
  created_at: string;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

const CommunityPostDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

  // Fetch post
  const { data: post, isLoading: postLoading } = useQuery({
    queryKey: ["community-post", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Post | null;
    },
    enabled: !!id,
  });

  // Fetch comments
  const { data: comments = [] } = useQuery({
    queryKey: ["community-comments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_comments")
        .select("*")
        .eq("post_id", id)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data as Comment[];
    },
    enabled: !!id,
  });

  // Fetch likes count
  const { data: likesCount = 0 } = useQuery({
    queryKey: ["community-likes-count", id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("community_likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", id);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!id,
  });

  // Check if user liked this post
  const { data: isLiked = false } = useQuery({
    queryKey: ["community-liked", id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from("community_likes")
        .select("id")
        .eq("post_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    },
    enabled: !!id && !!user,
  });

  // Toggle like mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        navigate("/auth");
        return;
      }

      if (isLiked) {
        const { error } = await supabase
          .from("community_likes")
          .delete()
          .eq("post_id", id)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("community_likes")
          .insert({ post_id: id, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-likes-count", id] });
      queryClient.invalidateQueries({ queryKey: ["community-liked", id, user?.id] });
    },
    onError: () => {
      toast.error("좋아요 처리에 실패했습니다.");
    },
  });

  // Add comment mutation
  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) {
        navigate("/auth");
        return;
      }

      const { error } = await supabase
        .from("community_comments")
        .insert({ 
          post_id: id, 
          user_id: user.id,
          content 
        });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["community-comments", id] });
      toast.success("댓글이 등록되었습니다.");
    },
    onError: () => {
      toast.error("댓글 등록에 실패했습니다.");
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      if (!user) return;

      const { error } = await supabase
        .from("community_comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-comments", id] });
      toast.success("댓글이 삭제되었습니다.");
    },
    onError: () => {
      toast.error("댓글 삭제에 실패했습니다.");
    },
  });

  // Delete post mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;

      const { error } = await supabase
        .from("community_posts")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("게시글이 삭제되었습니다.");
      navigate("/community");
    },
    onError: () => {
      toast.error("게시글 삭제에 실패했습니다.");
    },
  });

  const handleSubmitComment = () => {
    if (!newComment.trim()) {
      toast.error("댓글 내용을 입력해주세요.");
      return;
    }
    if (!user) {
      navigate("/auth");
      return;
    }
    commentMutation.mutate(newComment.trim());
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title,
          url: window.location.href,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("링크가 복사되었습니다.");
    }
  };

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { 
      addSuffix: true, 
      locale: ko 
    });
  };

  if (postLoading) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="flex items-center gap-3 px-4 h-14">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Skeleton className="h-5 w-32" />
          </div>
        </header>
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex flex-col items-center justify-center">
        <p className="text-muted-foreground mb-4">게시글을 찾을 수 없습니다.</p>
        <Button onClick={() => navigate("/community")}>커뮤니티로 돌아가기</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <span className="text-sm font-medium text-foreground">게시글</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleShare} className="p-2">
              <Share2 className="w-5 h-5 text-muted-foreground" />
            </button>
            {user && post.user_id === user.id && (
              <>
                <button 
                  onClick={() => navigate(`/community/${id}/edit`)}
                  className="p-2"
                >
                  <Pencil className="w-5 h-5 text-muted-foreground" />
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="p-2">
                      <Trash2 className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-[360px] rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>게시글 삭제</AlertDialogTitle>
                      <AlertDialogDescription>
                        정말로 이 게시글을 삭제하시겠습니까?<br />
                        삭제된 게시글은 복구할 수 없습니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        삭제
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Post Content */}
      <article className="p-4">
        {/* Category & Date */}
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
            {post.category}
          </span>
          <span className="text-xs text-muted-foreground">{formatDate(post.created_at)}</span>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-foreground mb-4">{post.title}</h1>

        {/* Author */}
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">익명</p>
            <p className="text-xs text-muted-foreground">{formatDate(post.created_at)}</p>
          </div>
        </div>

        {/* Content */}
        <div className="py-6 whitespace-pre-wrap text-foreground leading-relaxed">
          {post.content}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 py-4 border-t border-b border-border">
          <button 
            onClick={() => likeMutation.mutate()}
            className={`flex items-center gap-1.5 text-sm transition-colors ${
              isLiked ? "text-red-500" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} />
            <span>{likesCount}</span>
          </button>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MessageSquare className="w-5 h-5" />
            <span>{comments.length}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Eye className="w-5 h-5" />
            <span>{post.views}</span>
          </div>
        </div>
      </article>

      {/* Comments Section */}
      <section className="px-4 pt-2">
        <h2 className="text-sm font-bold text-foreground mb-4">
          댓글 {comments.length}개
        </h2>

        {comments.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">아직 댓글이 없습니다.</p>
            <p className="text-xs text-muted-foreground mt-1">첫 번째 댓글을 남겨보세요!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">익명</span>
                      <span className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
                    </div>
                    {user && comment.user_id === user.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="p-1 hover:bg-muted rounded-md transition-colors">
                            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-[360px] rounded-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>댓글 삭제</AlertDialogTitle>
                            <AlertDialogDescription>
                              정말로 이 댓글을 삭제하시겠습니까?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteCommentMutation.mutate(comment.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              삭제
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Comment Input - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 max-w-[430px] mx-auto">
        <div className="flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={user ? "댓글을 입력하세요..." : "로그인 후 댓글을 작성할 수 있습니다."}
            className="min-h-[44px] max-h-[120px] resize-none flex-1"
            disabled={!user}
          />
          <Button 
            size="icon" 
            onClick={handleSubmitComment}
            disabled={!newComment.trim() || commentMutation.isPending}
            className="h-11 w-11 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CommunityPostDetail;