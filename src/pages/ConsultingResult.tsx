import { useCallback, useEffect, useState } from "react";
import AiDisclosureNotice from "@/components/ai/AiDisclosureNotice";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Download, Loader2, RefreshCw, Share2, Sparkles } from "lucide-react";
import { shareResultWithToast } from "@/lib/shareResultImage";
import ZoomableImage from "@/components/ai/ZoomableImage";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { removePendingJob } from "@/lib/pendingJobs";
import ProcessingGuide from "@/components/ProcessingGuide";

// 2026 웨딩컨설팅 결과 (/ai-studio/consulting/result/:id)
// reports row 를 폴링 — processing 이면 생성 중, completed 면 보드 표시, failed 면 안내.

const LABEL: Record<string, string> = {
  personal_color: "퍼스널컬러",
  hair: "헤어",
  makeup: "메이크업",
  dress: "드레스+부케",
};

interface BoardItem {
  section: string;
  path: string;
}
interface ReportRow {
  id: string;
  status: "processing" | "completed" | "failed";
  results: BoardItem[] | null;
  error: string | null;
  sections: string[];
  charged: number | null;
  created_at: string;
}

// 약 5초 간격, 최대 ~3분까지 폴링.
const MAX_POLLS = 36;

const ConsultingResult = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [report, setReport] = useState<ReportRow | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [polls, setPolls] = useState(0);

  // 이 결과를 직접 보고 있으니 전역 알림 큐에서 제거(중복 토스트 방지).
  useEffect(() => {
    if (id) removePendingJob(id);
  }, [id]);

  const load = useCallback(async () => {
    if (!id) return;
    const { data, error } = await (supabase as any)
      .from("wedding_consulting_reports")
      .select("id, status, results, error, sections, charged, created_at")
      .eq("id", id)
      .single();
    if (error || !data) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const row = data as ReportRow;
    setReport(row);
    if (row.status === "completed" && Array.isArray(row.results)) {
      const signed: Record<string, string> = {};
      await Promise.all(
        row.results.map(async (b) => {
          const { data: s } = await supabase.storage
            .from("invitation-uploads")
            .createSignedUrl(b.path, 60 * 60 * 24);
          if (s?.signedUrl) signed[b.section] = s.signedUrl;
        }),
      );
      setUrls(signed);
      removePendingJob(row.id);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // 생성 중이면 결과가 나올 때까지 폴링.
  useEffect(() => {
    if (report?.status !== "processing" || polls >= MAX_POLLS) return;
    const t = setTimeout(() => {
      setPolls((p) => p + 1);
      load();
    }, 5000);
    return () => clearTimeout(t);
  }, [report?.status, polls, load]);

  const timedOut = report?.status === "processing" && polls >= MAX_POLLS;

  const handleDownload = async (section: string) => {
    const url = urls[section];
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `dewy-${section}-${id}.png`;
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
      <PageHeader title="컨설팅 결과" />
      <main className="px-4 py-6">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : notFound || !report ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-muted-foreground">결과를 찾을 수 없어요.</p>
            <Button onClick={() => navigate("/ai-studio/consulting")}>
              컨설팅으로 돌아가기
            </Button>
          </div>
        ) : report.status === "failed" ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-base font-semibold text-foreground">
              생성에 실패했어요
            </p>
            <p className="text-[12px] text-muted-foreground">
              {report.error ?? "알 수 없는 오류"}
            </p>
            <p className="text-[12px] text-foreground/70">
              하트는 자동으로 환불됐어요.
            </p>
            <Button
              onClick={() => navigate("/ai-studio/consulting")}
              className="mt-4"
            >
              다시 시도
            </Button>
          </div>
        ) : report.status === "processing" ? (
          timedOut ? (
            <div className="text-center py-16 space-y-4">
              <p className="text-base font-semibold text-foreground">
                생성이 예상보다 오래 걸리고 있어요
              </p>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                창을 닫아도 계속 생성돼요. 완료되면 알림으로 알려드릴게요.
                잠시 후 다시 확인하거나 컨설팅 기록에서 결과를 볼 수 있어요.
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={() => {
                    setPolls(0);
                    setLoading(true);
                    load();
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  다시 확인하기
                </Button>
                <button
                  type="button"
                  onClick={() => navigate("/ai-studio/consulting")}
                  className="text-[13px] text-muted-foreground underline"
                >
                  컨설팅 기록 보기
                </button>
              </div>
            </div>
          ) : (
            <div className="py-10 flex flex-col items-center gap-3 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                매거진 보드 {report.sections?.length ?? 0}장을 그리는 중이에요…
              </p>
              <ProcessingGuide
                etaText={
                  (report.sections?.length ?? 1) <= 2 ? "1~2분" : "2~3분"
                }
              />
            </div>
          )
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <p className="text-sm font-bold text-foreground">
                컨설팅 보드 {report.results?.length ?? 0}장이 완성됐어요
              </p>
            </div>
            {(report.results ?? []).map((b) => (
              <div key={b.path} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">
                    {LABEL[b.section] ?? b.section}
                  </span>
                  {urls[b.section] && (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => shareResultWithToast({ url: urls[b.section], title: "Dewy 컨설팅", fileName: `dewy-consulting-${b.section}.png` })}
                        className="flex items-center gap-1 text-[12px] text-primary"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        공유
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(b.section)}
                        className="flex items-center gap-1 text-[12px] text-primary"
                      >
                        <Download className="w-3.5 h-3.5" />
                        이미지 저장
                      </button>
                    </div>
                  )}
                </div>
                {urls[b.section] ? (
                  <ZoomableImage
                    src={urls[b.section]}
                    alt={LABEL[b.section] ?? b.section}
                    className="w-full rounded-xl border border-border bg-white"
                  />
                ) : (
                  <div className="aspect-[3/4] rounded-xl bg-muted flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            <AiDisclosureNotice />
            <p className="text-[11px] text-muted-foreground">
              이미지를 길게 눌러 저장할 수 있어요.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/ai-studio/consulting")}
            >
              새 컨설팅 받기
            </Button>
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

export default ConsultingResult;
