import { useState } from "react";
import { Flag } from "lucide-react";
import ReportDialog from "@/components/community/ReportDialog";

// AI 생성물 인앱 신고 버튼 — 생성형 AI 정책(Google/Apple genAI)상 결과 화면에 신고 경로 제공.
// community_reports(target_type='ai_content')로 접수. 결과 페이지 6종 공용(드리프트 방지 단일 컴포넌트).
const AiResultReportButton = ({ targetId, className }: { targetId?: string | null; className?: string }) => {
  const [open, setOpen] = useState(false);
  if (!targetId) return null;
  return (
    <>
      <div className={`flex justify-center ${className ?? ""}`}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 text-[12px] text-muted-foreground underline underline-offset-2"
        >
          <Flag className="w-3 h-3" /> AI 결과 신고
        </button>
      </div>
      <ReportDialog open={open} onOpenChange={setOpen} targetType="ai_content" targetId={targetId} />
    </>
  );
};

export default AiResultReportButton;
