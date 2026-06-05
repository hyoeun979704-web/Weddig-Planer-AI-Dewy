import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getPendingJobs, removePendingJob } from "@/lib/consultingJobs";

// 웨딩컨설팅 전역 완료 알림.
// 진행중 잡(localStorage)이 있으면 5초마다 상태를 폴링해, 완료/실패 시
// 어느 페이지에 있든 토스트를 띄우고 "결과 보기" 로 결과 페이지로 이동시킨다.
// (서버는 EdgeRuntime.waitUntil 로 계속 생성하므로 페이지를 벗어나도 안전.)
const POLL_MS = 5000;

const ConsultingNotifier = () => {
  const navigate = useNavigate();
  const notified = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      const jobs = getPendingJobs();
      if (jobs.length === 0) return;
      const ids = jobs.map((j) => j.id);
      const { data } = await (supabase as any)
        .from("wedding_consulting_reports")
        .select("id, status, results, error")
        .in("id", ids);
      if (cancelled || !data) return;

      for (const row of data as {
        id: string;
        status: string;
        results: { section: string }[] | null;
        error: string | null;
      }[]) {
        if (row.status === "processing") continue;
        if (notified.current.has(row.id)) continue;
        notified.current.add(row.id);
        removePendingJob(row.id);

        if (row.status === "completed") {
          toast({
            title: "컨설팅 완료 🎉",
            description: `보드 ${row.results?.length ?? 0}장이 준비됐어요.`,
            action: {
              label: "결과 보기",
              onClick: () =>
                navigate(`/ai-studio/consulting/result/${row.id}`),
            },
          });
        } else {
          toast({
            title: "컨설팅 실패",
            description: "하트는 환불됐어요. 다시 시도해주세요.",
            variant: "destructive",
            action: {
              label: "확인",
              onClick: () =>
                navigate(`/ai-studio/consulting/result/${row.id}`),
            },
          });
        }
      }
    };

    // 즉시 1회 + 주기 폴링. (잡이 없으면 쿼리 안 함)
    tick();
    const interval = setInterval(tick, POLL_MS);
    const onFocus = () => tick();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [navigate]);

  return null;
};

export default ConsultingNotifier;
