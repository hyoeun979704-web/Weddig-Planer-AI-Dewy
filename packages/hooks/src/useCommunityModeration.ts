import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// 커뮤니티 모더레이션 훅 묶음.
//
// 세 가지 mutation/query 를 한 파일에서 export:
//   - useReportContent()   : 게시글/댓글 신고 접수
//   - useUserBlocks()      : 본인이 차단한 사용자 목록 (실시간 캐시)
//   - useBlockUser()       : 사용자 차단
//   - useUnblockUser()     : 차단 해제
//
// 차단 목록은 피드·댓글 쿼리에서 `not in` 필터로 활용한다.
// 신고는 community_reports.unique(reporter, target_type, target_id) 로 중복 방지.

// 'review' = 업체 후기(place_reviews) 신고 — App Store 1.2: 모든 UGC 표면에 신고 수단 필요.
// DB CHECK(community_reports_target_type_check)와 반드시 동기(20260702150000 마이그레이션).
export type ReportTargetType = "post" | "comment" | "ai_content" | "review";

export type ReportReasonCode =
  | "spam"
  | "abuse"
  | "sexual"
  | "misinformation"
  | "illegal"
  | "other";

export const REPORT_REASON_LABELS: Record<ReportReasonCode, string> = {
  spam: "스팸·광고",
  abuse: "욕설·괴롭힘",
  sexual: "음란물",
  misinformation: "허위 정보",
  illegal: "불법 콘텐츠",
  other: "기타",
};

// ─────────────────────────────────────────────
// 신고 접수

export interface ReportContentInput {
  targetType: ReportTargetType;
  targetId: string;
  reasonCode: ReportReasonCode;
  reasonText?: string;
}

export function useReportContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ReportContentInput) => {
      if (!user) throw new Error("로그인이 필요합니다");

      const { error } = await supabase.from("community_reports").insert({
        reporter_id: user.id,
        target_type: input.targetType,
        target_id: input.targetId,
        reason_code: input.reasonCode,
        reason_text: input.reasonText?.trim() || null,
      });

      if (error) {
        // unique 위반 = 이미 같은 대상에 신고한 적 있음
        if (error.code === "23505") {
          throw new Error("이미 신고하신 콘텐츠입니다");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community", "my-reports"] });
    },
  });
}

// ─────────────────────────────────────────────
// 차단 목록

export function useUserBlocks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["community", "user-blocks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_blocks")
        .select("blocked_id")
        .eq("blocker_id", user!.id);

      if (error) throw error;
      return (data ?? []).map((row) => row.blocked_id as string);
    },
    staleTime: 60_000,
  });
}

export function useBlockUser() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blockedId: string) => {
      if (!user) throw new Error("로그인이 필요합니다");
      if (user.id === blockedId) throw new Error("본인은 차단할 수 없습니다");

      const { error } = await supabase.from("user_blocks").insert({
        blocker_id: user.id,
        blocked_id: blockedId,
      });

      if (error) {
        if (error.code === "23505") {
          // 이미 차단된 사용자 — 멱등 처리
          return;
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community", "user-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      queryClient.invalidateQueries({ queryKey: ["community", "post"] });
      queryClient.invalidateQueries({ queryKey: ["community", "comments"] });
    },
  });
}

export function useUnblockUser() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blockedId: string) => {
      if (!user) throw new Error("로그인이 필요합니다");

      const { error } = await supabase
        .from("user_blocks")
        .delete()
        .eq("blocker_id", user.id)
        .eq("blocked_id", blockedId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community", "user-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      queryClient.invalidateQueries({ queryKey: ["community", "post"] });
      queryClient.invalidateQueries({ queryKey: ["community", "comments"] });
    },
  });
}
