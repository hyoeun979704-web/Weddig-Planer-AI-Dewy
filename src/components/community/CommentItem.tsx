import { useState } from "react";
import { Pencil, Trash2, X, Check, MessageSquare, Heart, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import ReportDialog from "@/components/community/ReportDialog";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import type { AuthorIdentity } from "@/lib/communityIdentity";

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_comment_id: string | null;
}

interface CommentLikeInfo {
  count: number;
  userLiked: boolean;
}

interface CommentItemProps {
  comment: Comment;
  replies?: Comment[];
  currentUserId?: string;
  getIdentity: (userId: string) => AuthorIdentity;
  editingCommentId: string | null;
  editingContent: string;
  onStartEdit: (comment: Comment) => void;
  onCancelEdit: () => void;
  onSaveEdit: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onEditingContentChange: (content: string) => void;
  onReply: (parentId: string) => void;
  isUpdating: boolean;
  isDeleting: boolean;
  isReplyMode?: boolean;
  getCommentLikeInfo: (commentId: string) => CommentLikeInfo;
  onToggleLike: (commentId: string) => void;
  isLikeToggling: boolean;
}

const CommentItem = ({
  comment,
  replies = [],
  currentUserId,
  getIdentity,
  editingCommentId,
  editingContent,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onEditingContentChange,
  onReply,
  isUpdating,
  isDeleting,
  isReplyMode = false,
  getCommentLikeInfo,
  onToggleLike,
  isLikeToggling,
}: CommentItemProps) => {
  const isEditing = editingCommentId === comment.id;
  const [reportOpen, setReportOpen] = useState(false);
  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: ko,
    });
  };

  const isOwner = currentUserId && comment.user_id === currentUserId;
  // 본인 댓글엔 신고 의미 없음. 로그인 안 한 사용자도 신고 불가.
  const canReport = !!currentUserId && !isOwner;

  return (
    <div className={`${isReplyMode ? "ml-8 pl-4 border-l-2 border-muted" : ""}`}>
      <div className="flex gap-3">
        {(() => {
          const id = getIdentity(comment.user_id);
          return (
            <div
              className={`${isReplyMode ? "w-7 h-7 text-[10px]" : "w-8 h-8 text-xs"} rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white`}
              style={{ backgroundColor: id.color }}
              aria-hidden
            >
              {id.initial}
            </div>
          );
        })()}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-foreground">
                {getIdentity(comment.user_id).nickname}
              </span>
              {getIdentity(comment.user_id).badges.map((b, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {b}
                </span>
              ))}
              <span className="text-xs text-muted-foreground">
                {formatDate(comment.created_at)}
              </span>
            </div>
            {isOwner && !isEditing && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onStartEdit(comment)}
                  className="p-1 hover:bg-muted rounded-md transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
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
                        onClick={() => onDelete(comment.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isDeleting}
                      >
                        삭제
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
            {canReport && !isEditing && (
              <button
                onClick={() => setReportOpen(true)}
                className="p-1 hover:bg-muted rounded-md transition-colors"
                aria-label="댓글 신고"
              >
                <Flag className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editingContent}
                onChange={(e) => onEditingContentChange(e.target.value)}
                className="min-h-[60px] max-h-[120px] resize-none text-sm"
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => onSaveEdit(comment.id)}
                  disabled={isUpdating}
                  className="h-8 px-3"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  저장
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCancelEdit}
                  className="h-8 px-3"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-foreground leading-relaxed">
                {comment.content}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => onToggleLike(comment.id)}
                  disabled={isLikeToggling}
                  className={`flex items-center gap-1 text-xs transition-colors ${
                    getCommentLikeInfo(comment.id).userLiked 
                      ? "text-red-500" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${getCommentLikeInfo(comment.id).userLiked ? "fill-current" : ""}`} />
                  {getCommentLikeInfo(comment.id).count > 0 && (
                    <span>{getCommentLikeInfo(comment.id).count}</span>
                  )}
                </button>
                {!isReplyMode && (
                  <button
                    onClick={() => onReply(comment.id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    답글
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {canReport && (
        <ReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          targetType="comment"
          targetId={comment.id}
        />
      )}

      {/* Replies */}
      {replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                getIdentity={getIdentity}
                editingCommentId={editingCommentId}
                editingContent={editingContent}
                onStartEdit={onStartEdit}
                onCancelEdit={onCancelEdit}
                onSaveEdit={onSaveEdit}
                onDelete={onDelete}
                onEditingContentChange={onEditingContentChange}
                onReply={onReply}
                isUpdating={isUpdating}
                isDeleting={isDeleting}
                isReplyMode={true}
                getCommentLikeInfo={getCommentLikeInfo}
                onToggleLike={onToggleLike}
                isLikeToggling={isLikeToggling}
              />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentItem;
