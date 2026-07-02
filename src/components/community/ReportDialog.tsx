import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  REPORT_REASON_LABELS,
  type ReportReasonCode,
  type ReportTargetType,
  useReportContent,
} from "@/hooks/useCommunityModeration";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
}

// 게시글·댓글 공용 신고 다이얼로그.
// 사유 6 종 라디오 + 자유 텍스트(선택).

const ReportDialog = ({ open, onOpenChange, targetType, targetId }: ReportDialogProps) => {
  const [reasonCode, setReasonCode] = useState<ReportReasonCode | null>(null);
  const [reasonText, setReasonText] = useState("");
  const reportMutation = useReportContent();

  const targetLabel =
    targetType === "post"
      ? "게시글"
      : targetType === "comment"
        ? "댓글"
        : targetType === "review"
          ? "후기"
          : "AI 결과";

  const reset = () => {
    setReasonCode(null);
    setReasonText("");
  };

  const handleSubmit = async () => {
    if (!reasonCode) {
      toast.error("신고 사유를 선택해주세요");
      return;
    }

    try {
      await reportMutation.mutateAsync({
        targetType,
        targetId,
        reasonCode,
        reasonText,
      });
      toast.success("신고가 접수되었습니다. 검토 후 조치하겠습니다.");
      reset();
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "신고 접수에 실패했습니다";
      toast.error(message);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[400px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>{targetLabel} 신고</DialogTitle>
          <DialogDescription>
            신고 사유를 선택해주세요. 운영팀이 24시간 이내 검토합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(REPORT_REASON_LABELS) as ReportReasonCode[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setReasonCode(code)}
                className={`text-sm px-3 py-2.5 rounded-xl border transition-colors text-left ${
                  reasonCode === code
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {REPORT_REASON_LABELS[code]}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reportReasonText" className="text-sm">
              자세한 설명 (선택)
            </Label>
            <Textarea
              id="reportReasonText"
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="추가로 알려주실 내용이 있으면 입력해주세요"
              className="resize-none min-h-[80px]"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {reasonText.length} / 500
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reasonCode || reportMutation.isPending}
          >
            {reportMutation.isPending ? "전송 중..." : "신고하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
