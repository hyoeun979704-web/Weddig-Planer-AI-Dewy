import { useState } from "react";
import { useParams } from "react-router-dom";
import { Sparkles } from "lucide-react";
import ReportDialog from "@/components/community/ReportDialog";

/**
 * 생성형 AI 결과물 **표시 의무**(인공지능기본법 2026-01-22 시행) + **인앱 신고**(생성형 AI 정책).
 *
 * - 표시: 이미지 워터마크 대신 결과 페이지 안내 문구로 "AI 생성" 고지.
 * - 신고: AI 결과 라우트(`/.../result/:id`)의 id 를 읽어, 부적절한 결과를 **앱을 벗어나지 않고**
 *   신고할 수 있게 한다(Apple 1.2 / Google 생성형 AI 정책). 신고는 기존 community_reports 로 접수.
 */
export default function AiDisclosureNotice({ className = "" }: { className?: string }) {
  const { id } = useParams<{ id: string }>();
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <p
        className="flex items-center justify-center gap-1 text-[11px] leading-[16px] text-muted-foreground"
        role="note"
      >
        <Sparkles className="w-3 h-3 shrink-0" aria-hidden />
        이 결과물은 AI로 생성된 것으로, 실제와 다를 수 있습니다.
      </p>
      {id && (
        <>
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="text-[11px] text-muted-foreground underline underline-offset-2"
          >
            부적절한 결과 신고
          </button>
          <ReportDialog
            open={reportOpen}
            onOpenChange={setReportOpen}
            targetType="ai_content"
            targetId={id}
          />
        </>
      )}
    </div>
  );
}
