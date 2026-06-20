import { useCallback, useEffect, useState } from "react";
import AiDisclosureNotice from "@/components/ai/AiDisclosureNotice";
import { useNavigate, useParams } from "react-router-dom";
import { Download, Loader2, RefreshCw, Sparkles } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { removePendingJob } from "@/lib/pendingJobs";
import ProcessingGuide from "@/components/ProcessingGuide";

// 사진보정 결과 (/ai-studio/photo-fix/result/:id)
// photo_retouch_jobs row 폴링 — processing/completed/failed.

interface ResultItem {
  source: string;
  path: string;
}
interface JobRow {
  id: string;
  status: "processing" | "completed" | "failed";
  results: ResultItem[] | null;
  source_paths: string[] | null;
  error: string | null;
  charged: number | null;
  created_at: string;
}

const MAX_POLLS = 36; // 약 5초 간격 ~3분

const PhotoFixResult = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobRow | null>(null);
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [polls, setPolls] = useState(0);

  useEffect(() => {
    if (id) removePendingJob(id);
  }, [id]);

  const load = useCallback(async () => {
    if (!id) return;
    const { data, error } = await (supabase as any)
      .from("photo_retouch_jobs")
      .select("id, status, results, source_paths, error, charged, created_at")
      .eq("id", id)
      .single();
    if (error || !data) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const row = data as JobRow;
    setJob(row);
    if (row.status === "completed" && Array.isArray(row.results)) {
      const signed = await Promise.all(
        row.results.map(async (r) => {
          const { data: s } = await supabase.storage
            .from("invitation-uploads")
            .createSignedUrl(r.path, 60 * 60 * 24);
          return s?.signedUrl ?? null;
        }),
      );
      setUrls(signed.filter((u): u is string => !!u));
      removePendingJob(row.id);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (job?.status !== "processing" || polls >= MAX_POLLS) return;
    const t = setTimeout(() => {
      setPolls((p) => p + 1);
      load();
    }, 5000);
    return () => clearTimeout(t);
  }, [job?.status, polls, load]);

  const timedOut = job?.status === "processing" && polls >= MAX_POLLS;

  const handleDownload = async (url: string, i: number) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `dewy-photo-${id}-${i + 1}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } catch {
      toast({ title: "다운로드 실패", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background app-col mx-auto pb-24">
      <PageHeader title="보정 결과" />
      <main className="px-4 py-6">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : notFound || !job ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-muted-foreground">결과를 찾을 수 없어요.</p>
            <Button onClick={() => navigate("/ai-studio/photo-fix")}>
              사진보정으로 돌아가기
            </Button>
          </div>
        ) : job.status === "failed" ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-base font-semibold text-foreground">보정에 실패했어요</p>
            <p className="text-[12px] text-muted-foreground">{job.error ?? "알 수 없는 오류"}</p>
            <p className="text-[12px] text-foreground/70">하트는 자동으로 환불됐어요.</p>
            <Button onClick={() => navigate("/ai-studio/photo-fix")} className="mt-4">
              다시 시도
            </Button>
          </div>
        ) : job.status === "processing" ? (
          timedOut ? (
            <div className="text-center py-16 space-y-4">
              <p className="text-base font-semibold text-foreground">
                보정이 예상보다 오래 걸리고 있어요
              </p>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                창을 닫아도 계속 진행돼요. 완료되면 알림으로 알려드릴게요.
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <Button onClick={() => { setPolls(0); setLoading(true); load(); }}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  다시 확인하기
                </Button>
                <button
                  type="button"
                  onClick={() => navigate("/ai-studio/photo-fix")}
                  className="text-[13px] text-muted-foreground underline"
                >
                  보정 기록 보기
                </button>
              </div>
            </div>
          ) : (
            <div className="py-10 flex flex-col items-center gap-3 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                사진 {job.source_paths?.length ?? 0}장을 보정하는 중이에요…
              </p>
              <ProcessingGuide
                etaText={(() => {
                  const n = job.source_paths?.length ?? 1;
                  return n <= 2 ? "1~2분" : n <= 5 ? "2~4분" : "4~6분";
                })()}
              />
            </div>
          )
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <p className="text-sm font-bold text-foreground">
                {urls.length}장 보정이 완료됐어요
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {urls.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleDownload(url, i)}
                  className="relative aspect-square rounded-lg overflow-hidden bg-muted block"
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 right-1 bg-black/60 text-white rounded-full p-1.5">
                    <Download className="w-3.5 h-3.5" />
                  </span>
                </button>
              ))}
            </div>
            <AiDisclosureNotice />
            <p className="text-[11px] text-muted-foreground">
              이미지를 탭하면 저장돼요.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/ai-studio/photo-fix")}
            >
              새 사진 보정하기
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default PhotoFixResult;
