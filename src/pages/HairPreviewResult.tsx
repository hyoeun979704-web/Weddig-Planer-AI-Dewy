import { useCallback, useEffect, useState } from "react";
import AiDisclosureNotice from "@/components/ai/AiDisclosureNotice";
import AiResultReportButton from "@/components/ai/AiResultReportButton";
import ResultPhotoFrame from "@/components/ai/ResultPhotoFrame";
import ZoomableImage from "@/components/ai/ZoomableImage";
import { useNavigate, useParams } from "react-router-dom";
import { Download, Loader2, RefreshCw, Share2, Sparkles } from "lucide-react";
import { shareResultWithToast } from "@/lib/shareResultImage";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { removePendingJob } from "@/lib/pendingJobs";
import ProcessingGuide from "@/components/ProcessingGuide";

// 헤어 변형 미리보기 결과 (/ai-studio/hair-room/result/:id)
const KIND_LABEL: Record<string, string> = {
  single: "단일 헤어",
  style: "추천 스타일 9",
  color: "헤어 컬러 9",
};
interface Item { kind: string; path: string }
interface JobRow {
  id: string;
  status: "processing" | "completed" | "failed";
  results: Item[] | null;
  options: string[] | null;
  error: string | null;
  created_at: string;
}
const MAX_POLLS = 36;

const HairPreviewResult = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobRow | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [polls, setPolls] = useState(0);

  useEffect(() => { if (id) removePendingJob(id); }, [id]);

  const load = useCallback(async () => {
    if (!id) return;
    const { data, error } = await (supabase as any)
      .from("hair_preview_jobs")
      .select("id, status, results, options, error, created_at")
      .eq("id", id).single();
    if (error || !data) { setNotFound(true); setLoading(false); return; }
    const row = data as JobRow;
    setJob(row);
    if (row.status === "completed" && Array.isArray(row.results)) {
      const signed: Record<string, string> = {};
      await Promise.all(row.results.map(async (it) => {
        const { data: s } = await supabase.storage.from("invitation-uploads").createSignedUrl(it.path, 60 * 60 * 24);
        if (s?.signedUrl) signed[it.kind] = s.signedUrl;
      }));
      setUrls(signed);
      removePendingJob(row.id);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (job?.status !== "processing" || polls >= MAX_POLLS) return;
    const t = setTimeout(() => { setPolls((p) => p + 1); load(); }, 5000);
    return () => clearTimeout(t);
  }, [job?.status, polls, load]);

  const timedOut = job?.status === "processing" && polls >= MAX_POLLS;

  const download = async (kind: string) => {
    const url = urls[kind];
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const o = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = o; a.download = `dewy-hair-${kind}-${id}.png`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(o);
    } catch { toast({ title: "다운로드 실패", variant: "destructive" }); }
  };

  return (
    <div className="min-h-screen bg-background app-col mx-auto pb-24">
      <PageHeader title="헤어 미리보기 결과" />
      <main className="px-4 py-6">
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : notFound || !job ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-muted-foreground">결과를 찾을 수 없어요.</p>
            <Button onClick={() => navigate("/ai-studio/hair-room")}>헤어 미리보기로</Button>
          </div>
        ) : job.status === "failed" ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-base font-semibold text-foreground">생성에 실패했어요</p>
            <p className="text-[12px] text-muted-foreground">{job.error ?? "알 수 없는 오류"}</p>
            <p className="text-[12px] text-foreground/70">하트는 자동으로 환불됐어요.</p>
            <Button onClick={() => navigate("/ai-studio/hair-room")} className="mt-4">다시 시도</Button>
          </div>
        ) : job.status === "processing" ? (
          timedOut ? (
            <div className="text-center py-16 space-y-4">
              <p className="text-base font-semibold text-foreground">생성이 예상보다 오래 걸리고 있어요</p>
              <p className="text-[12px] text-muted-foreground leading-relaxed">창을 닫아도 계속 진행돼요. 완료되면 알림으로 알려드릴게요.</p>
              <div className="flex flex-col gap-2 pt-2">
                <Button onClick={() => { setPolls(0); setLoading(true); load(); }}><RefreshCw className="w-4 h-4 mr-2" />다시 확인하기</Button>
                <button type="button" onClick={() => navigate("/ai-studio/hair-room")} className="text-[13px] text-muted-foreground underline">기록 보기</button>
              </div>
            </div>
          ) : (
            <div className="py-10 flex flex-col items-center gap-3 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">헤어 변형을 생성하는 중이에요…</p>
              <ProcessingGuide etaText="1~3분" />
            </div>
          )
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <p className="text-sm font-bold text-foreground">{job.results?.length ?? 0}종 완성됐어요</p>
            </div>
            {(job.results ?? []).map((it) => (
              <div key={it.path} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">{KIND_LABEL[it.kind] ?? it.kind}</span>
                  {urls[it.kind] && (
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => shareResultWithToast({ url: urls[it.kind], title: "Dewy 헤어 미리보기", fileName: `dewy-hair-${it.kind}.png` })} className="flex items-center gap-1 text-[12px] text-primary">
                        <Share2 className="w-3.5 h-3.5" />공유
                      </button>
                      <button type="button" onClick={() => download(it.kind)} className="flex items-center gap-1 text-[12px] text-primary">
                        <Download className="w-3.5 h-3.5" />저장
                      </button>
                    </div>
                  )}
                </div>
                <ResultPhotoFrame accent={false} tilt={0}>
                  {urls[it.kind] ? (
                    <ZoomableImage src={urls[it.kind]} alt={it.kind} className="w-full bg-white" />
                  ) : (
                    <div className="aspect-[3/4] bg-muted flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                  )}
                </ResultPhotoFrame>
              </div>
            ))}
            <AiDisclosureNotice />
            <AiResultReportButton targetId={id} />
            <Button variant="outline" className="w-full" onClick={() => navigate("/ai-studio/hair-room")}>새 헤어 미리보기</Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default HairPreviewResult;
