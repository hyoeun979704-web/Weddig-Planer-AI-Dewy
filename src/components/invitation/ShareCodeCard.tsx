import { useEffect, useRef, useState } from "react";
import { Download, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  drawShareCode,
  shareCodeFilename,
  SHARE_CODE_STYLES,
  type ShareCodeStyle,
} from "@/lib/invitation/shareCode";

/**
 * 모바일/종이 청첩장 공유 코드 카드.
 *
 * 발행된 share URL 을 받아 기본 / 하트 포함 / 바코드 3가지 스타일로 렌더하고,
 * 선택한 스타일을 이미지로 공유(navigator.share)하거나 PNG 로 다운로드한다.
 *
 * style / onStyleChange 는 controlled — 부모(ResultView)가 소유해서 청첩장
 * 캔버스의 QR 슬롯과 스타일을 통일한다.
 */
const ShareCodeCard = ({
  url,
  style,
  onStyleChange,
}: {
  url: string;
  style: ShareCodeStyle;
  onStyleChange: (s: ShareCodeStyle) => void;
}) => {
  const [rendering, setRendering] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !url) return;
    let cancelled = false;
    setRendering(true);
    drawShareCode(canvas, url, style)
      .catch((e) => {
        console.error("공유 코드 렌더 실패", e);
        if (!cancelled) toast({ title: "코드 생성 실패", variant: "destructive" });
      })
      .finally(() => {
        if (!cancelled) setRendering(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url, style]);

  const downloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = shareCodeFilename(style);
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast({ title: "코드 이미지를 저장했어요" });
    } catch (e) {
      toast({
        title: "다운로드 실패",
        description: e instanceof Error ? e.message : "오류",
        variant: "destructive",
      });
    }
  };

  const shareImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) {
        downloadPng();
        return;
      }
      const file = new File([blob], shareCodeFilename(style), {
        type: "image/png",
      });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "청첩장 공유 코드" });
        } catch (e) {
          if ((e as Error).name !== "AbortError") downloadPng();
        }
      } else {
        // 이미지 공유 미지원 환경 → 다운로드로 폴백
        downloadPng();
      }
    }, "image/png");
  };

  return (
    <section className="p-4 bg-card rounded-2xl border border-border space-y-3">
      <div>
        <h3 className="text-sm font-bold text-foreground">공유 QR / 바코드</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          하객이 스캔하면 청첩장이 열려요. 스타일을 골라 공유하거나 저장하세요.
        </p>
      </div>

      {/* 스타일 선택 */}
      <div className="grid grid-cols-3 gap-2">
        {SHARE_CODE_STYLES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => onStyleChange(s.value)}
            className={`h-9 rounded-lg text-[12px] font-semibold border transition-colors ${
              style === s.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* 미리보기 */}
      <div className="flex items-center justify-center bg-muted/30 rounded-xl py-4 min-h-[180px] relative">
        {rendering && (
          <Loader2 className="w-5 h-5 animate-spin text-primary absolute" />
        )}
        <canvas
          ref={canvasRef}
          className={`w-full h-auto ${
            style === "barcode" ? "max-w-[280px]" : "max-w-[220px]"
          }`}
          style={{ imageRendering: "pixelated" }}
        />
      </div>

      {/* 공유 / 다운로드 */}
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={shareImage} className="h-11">
          <Share2 className="w-4 h-4 mr-2" />
          이미지로 공유
        </Button>
        <Button onClick={downloadPng} variant="outline" className="h-11">
          <Download className="w-4 h-4 mr-2" />
          다운로드
        </Button>
      </div>
    </section>
  );
};

export default ShareCodeCard;
