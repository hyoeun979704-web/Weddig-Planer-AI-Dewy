// 운영자 대시보드 React Query 훅 (Task #3 — console 데이터 레이어).
// 순수 데이터 함수(../data/adminDashboard)를 useQuery 로 감싼다. 페이지는 이 훅만 import.

import { useQuery } from "@tanstack/react-query";
import {
  fetchAdminStats,
  fetchRecentActivity,
  fetchDataFreshness,
  adminDashboardKeys,
  type AdminStats,
  type RecentItem,
  type FreshnessRow,
} from "@/features/console/data/adminDashboard";

export function useAdminStats() {
  const q = useQuery({ queryKey: adminDashboardKeys.stats(), queryFn: fetchAdminStats });
  return { stats: (q.data ?? null) as AdminStats | null };
}

export function useRecentActivity() {
  const q = useQuery({ queryKey: adminDashboardKeys.recent(), queryFn: fetchRecentActivity });
  return { recent: (q.data ?? []) as RecentItem[] };
}

export function useDataFreshness() {
  const q = useQuery({ queryKey: adminDashboardKeys.freshness(), queryFn: fetchDataFreshness });
  return { freshness: (q.data ?? []) as FreshnessRow[] };
}
