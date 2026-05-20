import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useBlockUser } from "@/hooks/useCommunityModeration";

interface BlockUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blockedUserId: string;
}

const BlockUserDialog = ({ open, onOpenChange, blockedUserId }: BlockUserDialogProps) => {
  const blockMutation = useBlockUser();

  const handleConfirm = async () => {
    try {
      await blockMutation.mutateAsync(blockedUserId);
      toast.success("이 사용자의 게시글과 댓글이 더 이상 보이지 않습니다.");
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "차단에 실패했습니다";
      toast.error(message);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[360px] rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>이 사용자를 차단하시겠어요?</AlertDialogTitle>
          <AlertDialogDescription>
            차단한 사용자의 게시글과 댓글이 더 이상 표시되지 않습니다.
            언제든지 설정 → 차단 목록에서 해제할 수 있습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={blockMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {blockMutation.isPending ? "처리 중..." : "차단"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BlockUserDialog;
