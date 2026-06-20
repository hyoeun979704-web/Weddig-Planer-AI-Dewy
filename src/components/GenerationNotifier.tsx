import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  getPendingJobs,
  removePendingJob,
  type JobType,
} from "@/lib/pendingJobs";

// 생성 기능 전역 완료 알림.
// 진행중 잡(localStorage)이 있으면 5초마다 상태를 폴링해, 완료/실패 시
// 어느 페이지에 있든 토스트를 띄우고 "결과 보기" 로 결과 페이지로 이동시킨다.
// (서버는 EdgeRuntime.waitUntil 로 계속 생성하므로 페이지를 벗어나도 안전.)
const POLL_MS = 5000;

type Outcome = "processing" | "done" | "failed";

interface JobConfig {
  table: string;
  // status 컬럼 → 표준 결과로 변환
  resolve: (status: string) => Outcome;
  resultRoute: (id: string) => string;
  doneTitle: string;
  doneDesc: string;
}

const CONFIG: Record<JobType, JobConfig> = {
  consulting: {
    table: "wedding_consulting_reports",
    resolve: (s) =>
      s === "completed" ? "done" : s === "failed" ? "failed" : "processing",
    resultRoute: (id) => `/ai-studio/consulting/result/${id}`,
    doneTitle: "컨설팅 완료 🎉",
    doneDesc: "스타일링 보드가 준비됐어요.",
  },
  dress: {
    table: "dress_fittings",
    resolve: (s) =>
      s === "done"
        ? "done"
        : s === "failed" || s === "refunded"
          ? "failed"
          : "processing",
    resultRoute: (id) => `/ai-studio/dress-tour/result/${id}`,
    doneTitle: "드레스 피팅 완료 🎉",
    doneDesc: "합성 결과가 준비됐어요.",
  },
  makeup: {
    table: "makeup_fittings",
    resolve: (s) =>
      s === "done"
        ? "done"
        : s === "failed" || s === "refunded"
          ? "failed"
          : "processing",
    resultRoute: (id) => `/ai-studio/makeup-room/result/${id}`,
    doneTitle: "메이크업 완료 🎉",
    doneDesc: "합성 결과가 준비됐어요.",
  },
  photo: {
    table: "photo_retouch_jobs",
    resolve: (s) =>
      s === "completed" ? "done" : s === "failed" ? "failed" : "processing",
    resultRoute: (id) => `/ai-studio/photo-fix/result/${id}`,
    doneTitle: "사진보정 완료 🎉",
    doneDesc: "보정 결과가 준비됐어요.",
  },
  hair: {
    table: "hair_preview_jobs",
    resolve: (s) =>
      s === "completed" ? "done" : s === "failed" ? "failed" : "processing",
    resultRoute: (id) => `/ai-studio/hair-room/result/${id}`,
    doneTitle: "헤어 미리보기 완료 🎉",
    doneDesc: "헤어 변형 결과가 준비됐어요.",
  },
  sdm: {
    table: "sdm_previews",
    resolve: (s) =>
      s === "done"
        ? "done"
        : s === "failed" || s === "refunded"
          ? "failed"
          : "processing",
    resultRoute: (id) => `/ai-studio/sdm-preview/result/${id}`,
    doneTitle: "스드메 미리보기 완료 🎉",
    doneDesc: "완성본이 준비됐어요.",
  },
};

const GenerationNotifier = () => {
  const navigate = useNavigate();
  const notified = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      const jobs = getPendingJobs();
      if (jobs.length === 0) return;

      // 타입(=테이블)별로 묶어 한 번에 조회.
      const byType = new Map<JobType, string[]>();
      for (const j of jobs) {
        if (!byType.has(j.type)) byType.set(j.type, []);
        byType.get(j.type)!.push(j.id);
      }

      for (const [type, ids] of byType.entries()) {
        const cfg = CONFIG[type];
        const { data } = await (supabase as any)
          .from(cfg.table)
          .select("id, status")
          .in("id", ids);
        if (cancelled || !data) continue;

        for (const row of data as { id: string; status: string }[]) {
          const outcome = cfg.resolve(row.status);
          if (outcome === "processing") continue;
          if (notified.current.has(row.id)) continue;
          // 결과 페이지를 직접 열면 그쪽에서 큐를 비운다 — 이 tick 도중
          // 이미 제거됐다면(사용자가 결과를 보고 있으면) 중복 토스트를 막는다.
          if (!getPendingJobs().some((j) => j.id === row.id)) continue;
          notified.current.add(row.id);
          removePendingJob(row.id);

          if (outcome === "done") {
            toast({
              title: cfg.doneTitle,
              description: cfg.doneDesc,
              action: {
                label: "결과 보기",
                onClick: () => navigate(cfg.resultRoute(row.id)),
              },
            });
          } else {
            toast({
              title: "생성 실패",
              description: "하트는 환불됐어요. 다시 시도해주세요.",
              variant: "destructive",
              action: {
                label: "확인",
                onClick: () => navigate(cfg.resultRoute(row.id)),
              },
            });
          }
        }
      }
    };

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

export default GenerationNotifier;
