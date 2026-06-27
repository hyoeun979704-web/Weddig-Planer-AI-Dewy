import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Heart,
  MessageSquare,
  Eye,
  Share2,
  Send,
  Pencil,
  Trash2,
  X,
  Bookmark,
  Flag,
  UserX,
} from "lucide-react";
import ReportDialog from "@/components/community/ReportDialog";
import BlockUserDialog from "@/components/community/BlockUserDialog";
import { useUserBlocks } from "@/hooks/useCommunityModeration";
import {
  fetchCommunityPost,
  fetchCommunityComments,
  fetchPostLikesCount,
  fetchPostLiked,
  addPostLike,
  removePostLike,
  createCommunityComment,
  deleteCommunityComment,
  updateCommunityComment,
  deleteCommunityPost,
  incrementPostViews,
  communityKeys,
} from "@/features/consumer/data/community";
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
import PostImageGallery from "@/components/community/PostImageGallery";
import CommentItem from "@/components/community/CommentItem";
import AuthorChip from "@/components/community/AuthorChip";
import { useCommunityAuthors } from "@/hooks/useCommunityAuthors";
import { usePostPlaces } from "@/hooks/useCommunityPlaces";
import { Store } from "lucide-react";
import { useCommentLikes } from "@/hooks/useCommentLikes";
import { useFavorites } from "@/hooks/useFavorites";

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
  parent_comment_id: string | null;
}

const CommunityPostDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [reportPostOpen, setReportPostOpen] = useState(false);
  const [blockAuthorOpen, setBlockAuthorOpen] = useState(false);
  
  // Comment likes hook
  const { getCommentLikeInfo, toggleLike, isToggling: isLikeToggling } = useCommentLikes(id || "");
  
  // Bookmark (favorites) hook
  const { isFavorite, toggleFavorite, isToggling: isBookmarkToggling } = useFavorites();
  const isBookmarked = id ? isFavorite(id, "community_post") : false;

  // Fetch post
  const { data: post, isLoading: postLoading } = useQuery({
    queryKey: communityKeys.post(id),
    queryFn: async () => {
      const data = await fetchCommunityPost(id!);
      return data as unknown as Post | null;
    },
    enabled: !!id,
  });

  // 조회수 1 증가 — 글당 1회. community_posts UPDATE 는 작성자만 가능하므로
  // RLS 우회 RPC 로 처리. (열 때마다 +1; 새로고침도 1 view 로 간주)
  const viewedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!id || viewedRef.current === id) return;
    viewedRef.current = id;
    void incrementPostViews(id);
  }, [id]);

  const { data: blockedUserIds = [] } = useUserBlocks();

  // Fetch comments — 차단한 사용자 댓글은 숨김.
  const { data: comments = [] } = useQuery({
    queryKey: communityKeys.comments(id, blockedUserIds),
    queryFn: async () => {
      const data = await fetchCommunityComments(id!, blockedUserIds);
      return data as unknown as Comment[];
    },
    enabled: !!id,
  });

  // 글 작성자 + 모든 댓글 작성자의 공개 정체성을 한 번에 조회.
  const authors = useCommunityAuthors([
    post?.user_id,
    ...comments.map((c) => c.user_id),
  ]);

  // 이 글에 태그된 업체들.
  const { data: taggedPlaces = [] } = usePostPlaces(id);

  // Fetch likes count
  const { data: likesCount = 0 } = useQuery({
    queryKey: communityKeys.likesCount(id),
    queryFn: () => fetchPostLikesCount(id!),
    enabled: !!id,
  });

  // Check if user liked this post
  const { data: isLiked = false } = useQuery({
    queryKey: communityKeys.liked(id, user?.id),
    queryFn: async () => {
      if (!user) return false;
      return fetchPostLiked(id!, user.id);
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
        await removePostLike(id!, user.id);
      } else {
        await addPostLike(id!, user.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.likesCount(id) });
      queryClient.invalidateQueries({ queryKey: communityKeys.liked(id, user?.id) });
    },
    onError: () => {
      toast.error("좋아요 처리에 실패했습니다.");
    },
  });

  // Add comment mutation
  const commentMutation = useMutation({
    mutationFn: async ({ content, parentCommentId }: { content: string; parentCommentId?: string | null }) => {
      if (!user) {
        navigate("/auth");
        return;
      }

      await createCommunityComment({
        postId: id!,
        userId: user.id,
        content,
        parentCommentId,
      });
    },
    onSuccess: () => {
      setNewComment("");
      setReplyContent("");
      setReplyingToId(null);
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
      await deleteCommunityComment(commentId, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-comments", id] });
      toast.success("댓글이 삭제되었습니다.");
    },
    onError: () => {
      toast.error("댓글 삭제에 실패했습니다.");
    },
  });

  // Update comment mutation
  const updateCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      if (!user) return;
      await updateCommunityComment(commentId, user.id, content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-comments", id] });
      setEditingCommentId(null);
      setEditingContent("");
      toast.success("댓글이 수정되었습니다.");
    },
    onError: () => {
      toast.error("댓글 수정에 실패했습니다.");
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await deleteCommunityPost(id!, user.id);
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
    commentMutation.mutate({ content: newComment.trim(), parentCommentId: null });
  };

  const handleSubmitReply = (parentId: string) => {
    if (!replyContent.trim()) {
      toast.error("답글 내용을 입력해주세요.");
      return;
    }
    if (!user) {
      navigate("/auth");
      return;
    }
    commentMutation.mutate({ content: replyContent.trim(), parentCommentId: parentId });
  };

  const handleStartReply = (parentId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setReplyingToId(parentId);
    setReplyContent("");
  };

  const handleCancelReply = () => {
    setReplyingToId(null);
    setReplyContent("");
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

  const handleStartEdit = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingContent("");
  };

  const handleSaveEdit = (commentId: string) => {
    if (!editingContent.trim()) {
      toast.error("댓글 내용을 입력해주세요.");
      return;
    }
    updateCommentMutation.mutate({ commentId, content: editingContent.trim() });
  };

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { 
      addSuffix: true, 
      locale: ko 
    });
  };

  if (postLoading) {
    return (
      <div className="min-h-screen bg-background app-col mx-auto">
        <header className="sticky safe-sticky-header z-40 bg-card/80 backdrop-blur-md border-b border-border">
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
      <div className="min-h-screen bg-background app-col mx-auto flex flex-col items-center justify-center">
        <p className="text-muted-foreground mb-4">게시글을 찾을 수 없습니다.</p>
        <Button onClick={() => navigate("/community")}>커뮤니티로 돌아가기</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background app-col mx-auto pb-24">
      {/* Header */}
      <header className="sticky safe-sticky-header z-40 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <span className="text-sm font-medium text-foreground">게시글</span>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => {
                if (!user) {
                  navigate("/auth");
                  return;
                }
                if (id) toggleFavorite(id, "community_post");
              }}
              disabled={isBookmarkToggling}
              className="p-2"
            >
              <Bookmark className={`w-5 h-5 transition-colors ${isBookmarked ? "fill-primary text-primary" : "text-muted-foreground"}`} />
            </button>
            <button onClick={handleShare} className="p-2">
              <Share2 className="w-5 h-5 text-muted-foreground" />
            </button>
            {user && post.user_id !== user.id && (
              <>
                <button
                  onClick={() => setReportPostOpen(true)}
                  className="p-2"
                  aria-label="게시글 신고"
                >
                  <Flag className="w-5 h-5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => setBlockAuthorOpen(true)}
                  className="p-2"
                  aria-label="작성자 차단"
                >
                  <UserX className="w-5 h-5 text-muted-foreground" />
                </button>
              </>
            )}
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
        <div className="pb-4 border-b border-border">
          <AuthorChip
            identity={authors.get(post.user_id)}
            meta={formatDate(post.created_at)}
          />
        </div>

        {/* Content */}
        <div className="py-6 whitespace-pre-wrap text-foreground leading-relaxed">
          {post.content}
        </div>

        {/* Image Gallery */}
        {post.image_urls && post.image_urls.length > 0 && (
          <PostImageGallery images={post.image_urls} />
        )}

        {/* 태그된 업체 */}
        {taggedPlaces.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-2">
            {taggedPlaces.map((v) => (
              <button
                key={v.place_id}
                onClick={() => navigate(`/vendor/${v.place_id}`)}
                className="flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium active:scale-[0.98]"
              >
                <Store className="w-3.5 h-3.5" />
                {v.name}
              </button>
            ))}
          </div>
        )}

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
            {/* Filter parent comments (no parent_comment_id) */}
            {comments
              .filter((comment) => !comment.parent_comment_id)
              .map((comment) => {
                const replies = comments.filter(
                  (c) => c.parent_comment_id === comment.id
                );
                return (
                  <div key={comment.id} className="space-y-3">
                    <CommentItem
                      comment={comment}
                      replies={replies}
                      currentUserId={user?.id}
                      getIdentity={authors.get}
                      editingCommentId={editingCommentId}
                      editingContent={editingContent}
                      onStartEdit={handleStartEdit}
                      onCancelEdit={handleCancelEdit}
                      onSaveEdit={handleSaveEdit}
                      onDelete={(commentId) => deleteCommentMutation.mutate(commentId)}
                      onEditingContentChange={setEditingContent}
                      onReply={handleStartReply}
                      isUpdating={updateCommentMutation.isPending}
                      isDeleting={deleteCommentMutation.isPending}
                      getCommentLikeInfo={getCommentLikeInfo}
                      onToggleLike={toggleLike}
                      isLikeToggling={isLikeToggling}
                    />
                    
                    {/* Reply Input */}
                    {replyingToId === comment.id && (
                      <div className="ml-8 pl-4 border-l-2 border-muted">
                        <div className="flex gap-2">
                          <Textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="답글을 입력하세요..."
                            className="min-h-[44px] max-h-[100px] resize-none flex-1 text-sm"
                            autoFocus
                          />
                          <div className="flex flex-col gap-1">
                            <Button
                              size="icon"
                              onClick={() => handleSubmitReply(comment.id)}
                              disabled={!replyContent.trim() || commentMutation.isPending}
                              className="h-8 w-8"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={handleCancelReply}
                              className="h-8 w-8"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </section>

      {/* Comment Input - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 pt-4 pb-[calc(1rem+var(--safe-bottom))] app-col mx-auto">
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

      {user && post.user_id !== user.id && id && (
        <>
          <ReportDialog
            open={reportPostOpen}
            onOpenChange={setReportPostOpen}
            targetType="post"
            targetId={id}
          />
          <BlockUserDialog
            open={blockAuthorOpen}
            onOpenChange={setBlockAuthorOpen}
            blockedUserId={post.user_id}
          />
        </>
      )}
    </div>
  );
};

export default CommunityPostDetail;