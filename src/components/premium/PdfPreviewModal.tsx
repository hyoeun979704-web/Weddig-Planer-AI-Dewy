import { useEffect, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import DOMPurify from "dompurify";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { downloadPdf } from "@/lib/pdfGenerator";
import { toast } from "sonner";

interface PdfPreviewModalProps {
  open: boolean;
  onClose: () => void;
  html: string;
  filename: string;
  title?: string;
}

const FRAME_BASE_WIDTH = 595; // A4 폭(px) - PDF 페이지 폭과 동일
const FRAME_DISPLAY_WIDTH = 380; // 모바일 시트(최대 430px)에 맞춰 줄여서 표시
const SCALE = FRAME_DISPLAY_WIDTH / FRAME_BASE_WIDTH;

/**
 * PDF 다운로드 전에 실제 출력물을 미리보기로 보여주는 시트 모달.
 *
 * iframe srcDoc으로 HTML을 격리해 호스트 페이지 스타일과 충돌하지 않게 하고,
 * 컨텐츠 로드 후 본문 scrollHeight를 측정해 iframe 높이를 동적으로 맞춘다.
 * 외부에 보이는 폭은 모바일 시트에 맞춰 transform: scale로 축소.
 */
export const PdfPreviewModal = ({ open, onClose, html, filename, title }: PdfPreviewModalProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(800);
  const [downloading, setDownloading] = useState(false);

  // 시트가 열릴 때마다 높이 초기화 (이전 컨텐츠가 영향을 주지 않게)
  useEffect(() => {
    if (open) setIframeHeight(800);
  }, [open, html]);

  // CRITICAL: DOMPurify가 기본값으로 <style>·SVG 태그를 제거함 → 대시보드 CSS·차트가 통째로 날아가
  // 세로 stack으로 무너짐. 미리보기와 실제 PDF가 동일하게 보이도록 sanitize 옵션을 다운로드와 일치시킴.
  const sanitized = DOMPurify.sanitize(html, {
    ADD_TAGS: ["style", "svg", "circle", "text", "g", "path", "rect", "line"],
    ADD_ATTR: ["style", "viewBox", "stroke", "stroke-width", "stroke-dasharray", "stroke-dashoffset", "fill", "transform", "cx", "cy", "r", "x", "y", "x1", "y1", "x2", "y2", "text-anchor", "font-family", "font-size", "font-weight"],
  });
  const docHtml = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=${FRAME_BASE_WIDTH}"><base target="_blank"></head><body style="margin:0;background:#ffffff;">${sanitized}</body></html>`;

  const measure = () => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) return;
    const h = Math.max(doc.body?.scrollHeight ?? 0, doc.documentElement?.scrollHeight ?? 0);
    if (h > 0) setIframeHeight(h + 24);
  };

  const handleIframeLoad = () => {
    // 즉시 1회, 폰트 로딩 후 1회, 안전망으로 500ms 뒤 1회 — 총 3번 측정
    measure();
    const doc = iframeRef.current?.contentDocument;
    (doc as any)?.fonts?.ready?.then(measure).catch(() => {});
    setTimeout(measure, 500);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadPdf(html, filename);
      toast.success("PDF가 다운로드됩니다!");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("PDF 생성에 실패했습니다.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="max-w-[430px] mx-auto rounded-t-3xl h-[92vh] p-0 flex flex-col gap-0"
      >
        <SheetHeader className="px-4 py-3 border-b border-border shrink-0">
          <SheetTitle className="text-sm">📄 {title || "PDF 미리보기"}</SheetTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            실제 다운로드되는 PDF와 동일한 모습이에요. 확인 후 저장해 주세요.
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-auto bg-muted/40 px-3 py-3">
          <div
            className="mx-auto bg-white shadow-md rounded-lg overflow-hidden"
            style={{
              width: FRAME_DISPLAY_WIDTH,
              height: iframeHeight * SCALE,
            }}
          >
            <div
              style={{
                width: FRAME_BASE_WIDTH,
                transform: `scale(${SCALE})`,
                transformOrigin: "top left",
              }}
            >
              <iframe
                ref={iframeRef}
                srcDoc={docHtml}
                onLoad={handleIframeLoad}
                sandbox="allow-same-origin"
                title="PDF Preview"
                style={{
                  width: FRAME_BASE_WIDTH,
                  height: iframeHeight,
                  border: 0,
                  background: "#ffffff",
                  display: "block",
                }}
              />
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-border flex gap-2 shrink-0 bg-background">
          <button
            onClick={onClose}
            disabled={downloading}
            className="flex-1 py-3 bg-muted text-foreground rounded-2xl text-sm font-medium disabled:opacity-50"
          >
            닫기
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 py-3 bg-primary text-primary-foreground rounded-2xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {downloading ? "저장 중..." : "PDF 다운로드"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PdfPreviewModal;
