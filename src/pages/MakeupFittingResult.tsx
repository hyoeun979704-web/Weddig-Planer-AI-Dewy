import { useCallback, useEffect, useState } from "react";
import AiDisclosureNotice from "@/components/ai/AiDisclosureNotice";
import AiResultReportButton from "@/components/ai/AiResultReportButton";
import ZoomableImage from "@/components/ai/ZoomableImage";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Download, Share2, Loader2, RefreshCw } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { makeupSceneByCode } from "@/data/makeupScenes";
import { removePendingJob } from "@/lib/pendingJobs";

interface FittingRow {
  id: string;
  status: "pending" | "done" | "failed" | "refunded";
  result_image_path: string | null;
  source_image_path: string | null;
  error_message: string | null;
  prompt_params: { scene_code?: string } | null;
  selected_sample_id: string | null;
  created_at: string;
}

const MakeupFittingResult = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [fitting, setFitting] = useState<FittingRow | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false); // 기본 = 생성결과 먼저 노출
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [polls, setPolls] = useState(0);

  const MAX_POLLS = 30;

  const load = useCallback(async () => {
    if (!id) return;
    const { data, error } = await (supabase as any)
      .from("makeup_fittings")
      .select(
        "id, status, result_image_path, source_image_path, error_message, prompt_params, selected_sample_id, created_at",
      )
      .eq("id", id)
      .single();
    if (error || !data) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setFitting(data);
    if (data.result_image_path) {
      const { data: signed } = await supabase.storage
        .from("makeup-results")
        .createSignedUrl(data.result_image_path, 60 * 60 * 24);
      setResultUrl(signed?.signedUrl ?? null);
    }
    // 전후 비교용 원본 — 업로드 버킷(makeup-uploads)에서 signed URL.
    if (data.source_image_path) {
      const { data: srcSigned } = await supabase.storage
        .from("makeup-uploads")
        .createSignedUrl(data.source_image_path, 60 * 60 * 24);
      setSourceUrl(srcSigned?.signedUrl ?? null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // 결과를 직접 보고 있으니 전역 알림 큐에서 제거(중복 토스트 방지).
  useEffect(() => {
    if (id) removePendingJob(id);
  }, [id]);

  useEffect(() => {
    if (fitting?.status !== "pending" || polls >= MAX_POLLS) return;
    const t = setTimeout(() => {
      setPolls((p) => p + 1);
      load();
    }, 4000);
    return () => clearTimeout(t);
  }, [fitting?.status, polls, load]);

  const handleManualRefresh = () => {
    setPolls(0);
    setLoading(true);
    load();
  };

  const timedOut = fitting?.status === "pending" && polls >= MAX_POLLS;

  const handleDownload = async () => {
    if (!resultUrl) return;
    try {
      const res = await fetch(resultUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dewy-makeup-${id}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "다운로드 실패", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    if (!resultUrl) return;
    try {
      if (navigator.share) {
        const res = await fetch(resultUrl);
        const blob = await res.blob();
        const file = new File([blob], `dewy-makeup-${id}.png`, {
          type: "image/png",
        });
        await navigator.share({
          files: [file],
          title: "Dewy 메이크업 시뮬레이션",
        });
      } else {
        await navigator.clipboard.writeText(resultUrl);
        toast({ title: "이미지 URL을 복사했어요" });
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        toast({ title: "공유 실패", variant: "destructive" });
      }
    }
  };

  const sceneLabel = fitting?.prompt_params?.scene_code
    ? makeupSceneByCode(fitting.prompt_params.scene_code as any)?.label
    : null;

  return (
    <div className="min-h-screen bg-background app-col mx-auto pb-24">
      <PageHeader title="생성 결과" />

      <main className="px-5 py-6">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : notFound || !fitting ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-muted-foreground">결과를 찾을 수 없어요.</p>
            <Button onClick={() => navigate("/ai-studio/makeup-room")}>
              메이크업 룸으로 돌아가기
            </Button>
          </div>
        ) : fitting.status === "failed" || fitting.status === "refunded" ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-base font-semibold text-foreground">
              생성에 실패했어요
            </p>
            <p className="text-[12px] text-muted-foreground">
              {fitting.error_message ?? "알 수 없는 오류"}
            </p>
            <p className="text-[12px] text-foreground/70">
              하트는 자동으로 환불됐어요.
            </p>
            <Button
              onClick={() => navigate("/ai-studio/makeup-room")}
              className="mt-4"
            >
              다시 시도
            </Button>
          </div>
        ) : fitting.status === "pending" ? (
          timedOut ? (
            <div className="text-center py-16 space-y-4">
              <p className="text-base font-semibold text-foreground">
                생성이 예상보다 오래 걸리고 있어요
              </p>
              <p className="text-[12px] text-muted-foreground">
                잠시 후 다시 확인하거나 갤러리에서 결과를 찾아볼 수 있어요.
                하트는 차감된 상태이며, 끝내 실패하면 자동 환불돼요.
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <Button onClick={handleManualRefresh}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  다시 확인하기
                </Button>
                <button
                  type="button"
                  onClick={() => navigate("/ai-studio/makeup-room/gallery")}
                  className="text-[13px] text-muted-foreground underline"
                >
                  내 갤러리 보기
                </button>
              </div>
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                생성 중... (약 15~30초)
              </p>
            </div>
          )
        ) : (
          <div className="space-y-4">
            {/* 전후 비교 토글 — 원본·결과 둘 다 있을 때만. 기본은 결과 보기. */}
            {sourceUrl && resultUrl && (
              <div className="flex justify-center">
                <div className="inline-flex rounded-full bg-muted p-0.5">
                  <button
                    type="button"
                    onClick={() => setShowSource(false)}
                    aria-pressed={!showSource}
                    className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-colors ${!showSource ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
                  >
                    결과 보기
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSource(true)}
                    aria-pressed={showSource}
                    className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-colors ${showSource ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
                  >
                    원본 보기
                  </button>
                </div>
              </div>
            )}
            {resultUrl ? (
              <ZoomableImage
                src={showSource && sourceUrl ? sourceUrl : resultUrl}
                alt={showSource ? "업로드한 원본 사진" : "생성된 메이크업"}
                className="w-full aspect-[3/4] object-cover rounded-2xl border border-border"
              />
            ) : (
              <div className="aspect-[3/4] rounded-2xl bg-muted flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}

            <AiDisclosureNotice />
            <AiResultReportButton targetId={id} />

            {sceneLabel && (
              <p className="text-[12px] text-muted-foreground text-center">
                {sceneLabel}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-1" />
                다운로드
              </Button>
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-1" />
                공유
              </Button>
            </div>

            <Button
              onClick={() => navigate("/ai-studio/makeup-room")}
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              다른 메이크업 시도
            </Button>

            <button
              type="button"
              onClick={() => navigate("/ai-studio/makeup-room/gallery")}
              className="w-full text-[13px] text-muted-foreground underline pt-2"
            >
              내 갤러리 보기
            </button>
          </div>
        )}
      </main>

      <BottomNav
        activeTab={location.pathname}
        onTabChange={(href) => navigate(href)}
      />
    </div>
  );
};

export default MakeupFittingResult;
