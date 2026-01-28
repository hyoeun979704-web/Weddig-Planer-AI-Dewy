import { useState } from "react";
import { User, Pencil, Trash2, X, Check, MessageSquare } from "lucide-react";
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
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_comment_id: string | null;
}

interface CommentItemProps {
  comment: Comment;
  replies?: Comment[];
  currentUserId?: string;
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
}

const CommentItem = ({
  comment,
  replies = [],
  currentUserId,
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
}: CommentItemProps) => {
  const isEditing = editingCommentId === comment.id;
  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: ko,
    });
  };

  const isOwner = currentUserId && comment.user_id === currentUserId;

  return (
    <div className={`${isReplyMode ? "ml-8 pl-4 border-l-2 border-muted" : ""}`}>
      <div className="flex gap-3">
        <div className={`${isReplyMode ? "w-7 h-7" : "w-8 h-8"} rounded-full bg-muted flex items-center justify-center flex-shrink-0`}>
          <User className={`${isReplyMode ? "w-3.5 h-3.5" : "w-4 h-4"} text-muted-foreground`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">익명</span>
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
              {!isReplyMode && (
                <button
                  onClick={() => onReply(comment.id)}
                  className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  답글
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
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
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentItem;
