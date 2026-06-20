import { useCallback, useEffect, useState } from "react";
import AiDisclosureNotice from "@/components/ai/AiDisclosureNotice";
import AiResultReportButton from "@/components/ai/AiResultReportButton";
import ResultPhotoFrame from "@/components/ai/ResultPhotoFrame";
import ZoomableImage from "@/components/ai/ZoomableImage";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Download, Share2, Loader2, RefreshCw } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { removePendingJob } from "@/lib/pendingJobs";

/** 스드메 미리보기 결과 (/ai-studio/sdm-preview/result/:id) */
interface PreviewRow {
  id: string;
  status: "pending" | "done" | "failed" | "refunded";
  result_image_path: string | null;
  error_message: string | null;
}

const SdmPreviewResult = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [row, setRow] = useState<PreviewRow | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [polls, setPolls] = useState(0);
  const MAX_POLLS = 30;

  const load = useCallback(async () => {
    if (!id) return;
    const { data, error } = await (supabase as any)
      .from("sdm_previews")
      .select("id, status, result_image_path, error_message")
      .eq("id", id)
      .single();
    if (error || !data) { setNotFound(true); setLoading(false); return; }
    setRow(data);
    if (data.result_image_path) {
      const { data: signed } = await supabase.storage
        .from("sdm-results")
        .createSignedUrl(data.result_image_path, 60 * 60 * 24);
      setResultUrl(signed?.signedUrl ?? null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (id) removePendingJob(id); }, [id]);

  useEffect(() => {
    if (row?.status !== "pending" || polls >= MAX_POLLS) return;
    const t = setTimeout(() => { setPolls((p) => p + 1); load(); }, 4000);
    return () => clearTimeout(t);
  }, [row?.status, polls, load]);

  const timedOut = row?.status === "pending" && polls >= MAX_POLLS;

  const handleDownload = async () => {
    if (!resultUrl) return;
    try {
      const res = await fetch(resultUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `dewy-sdm-${id}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch { toast({ title: "다운로드 실패", variant: "destructive" }); }
  };

  const handleShare = async () => {
    if (!resultUrl) return;
    try {
      if (navigator.share) {
        const res = await fetch(resultUrl);
        const blob = await res.blob();
        const file = new File([blob], `dewy-sdm-${id}.png`, { type: "image/png" });
        await navigator.share({ files: [file], title: "Dewy 스드메 미리보기" });
      } else {
        await navigator.clipboard.writeText(resultUrl);
        toast({ title: "이미지 URL을 복사했어요" });
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast({ title: "공유 실패", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background app-col mx-auto pb-24">
      <PageHeader title="완성본 결과" />
      <main className="px-5 py-6">
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : notFound || !row ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-muted-foreground">결과를 찾을 수 없어요.</p>
            <Button onClick={() => navigate("/ai-studio/sdm-preview")}>스드메 미리보기로</Button>
          </div>
        ) : row.status === "failed" || row.status === "refunded" ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-base font-semibold text-foreground">생성에 실패했어요</p>
            <p className="text-[12px] text-muted-foreground">{row.error_message ?? "알 수 없는 오류"}</p>
            <p className="text-[12px] text-foreground/70">하트는 자동으로 환불됐어요.</p>
            <Button onClick={() => navigate("/ai-studio/sdm-preview")} className="mt-4">다시 시도</Button>
          </div>
        ) : row.status === "pending" ? (
          timedOut ? (
            <div className="text-center py-16 space-y-4">
              <p className="text-base font-semibold text-foreground">생성이 예상보다 오래 걸리고 있어요</p>
              <p className="text-[12px] text-muted-foreground">하트는 차감된 상태이며, 끝내 실패하면 자동 환불돼요.</p>
              <Button onClick={() => { setPolls(0); setLoading(true); load(); }}>
                <RefreshCw className="w-4 h-4 mr-2" /> 다시 확인하기
              </Button>
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">완성본 생성 중... (약 30초)</p>
            </div>
          )
        ) : (
          <div className="space-y-4">
            <ResultPhotoFrame caption="스드메 완성본">
              {resultUrl ? (
                <ZoomableImage src={resultUrl} alt="스드메 완성본" className="w-full aspect-[3/4] object-cover" />
              ) : (
                <div className="aspect-[3/4] bg-muted flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </ResultPhotoFrame>
            <AiDisclosureNotice />
            <AiResultReportButton targetId={id} />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={handleDownload}><Download className="w-4 h-4 mr-1" /> 다운로드</Button>
              <Button variant="outline" onClick={handleShare}><Share2 className="w-4 h-4 mr-1" /> 공유</Button>
            </div>
            <Button onClick={() => navigate("/ai-studio/sdm-preview")} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" /> 다른 조합 시도
            </Button>
          </div>
        )}
      </main>
      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default SdmPreviewResult;
