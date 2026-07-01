// 식대 추정 훅 — 흩어진 신호를 모아 computeMealCost 로 넘긴다(표시는 컴포넌트가).
//
// 개인화 핵심(경쟁사는 "식수 Excel"에서 멈춤): 단순 지역평균이 아니라
//   · 식수: 하객 명단 실집계 > 예상 하객수 > 식장 보증인원 > 기본값  (있는 신호 우선)
//   · 단가: 내 식장 실단가(정규화·현실범위 통과 시) > 지역 평균
//   · 보증인원 미달 시 "헛돈" 경고 + 예산형 페르소나 강조
// 식장 단가가 더럽거나 없으면 우아하게 지역평균으로 폴백(빈 화면/오추정 금지).

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGuestList } from "@/hooks/useGuestList";
import { useBudget } from "@/hooks/useBudget";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { useWeddingVenue } from "@/hooks/useWeddingVenue";
import { regionalAverages, regions, resolveRegionKey } from "@/data/budgetData";
import {
  computeMealCost,
  normalizeMealPriceManwon,
  type MealCostEstimate,
  type MealHeadsSource,
} from "@/lib/mealCost";

const DEFAULT_HEADS = 200;

interface VenueMeal {
  mealPriceManwon: number | null;
  minGuarantee: number | null;
  maxGuarantee: number | null;
}

export interface MealCostEstimateResult {
  estimate: MealCostEstimate;
  /** 내 식장(place_halls) 단가를 실제로 썼는지. */
  usingVenuePrice: boolean;
  venueName: string | null;
  regionLabel: string;
  perGuestRegional: number;
  /** 하객 명단에서 집계된 식수(있을 때만 > 0). */
  guestListHeads: number;
  /** 예산형 페르소나 — 보증인원 미달 경고 색을 강조. */
  isBudgetPersona: boolean;
  /** 성향(planning_style) — 미달 경고 코칭 카피 분기용. */
  planningStyle: import("@/lib/weddingPersona").PlanningStyle | null;
  daysUntilWedding: number | null;
  isLoading: boolean;
}

export function useMealCostEstimate(): MealCostEstimateResult {
  const { stats, isLoading: guestsLoading } = useGuestList();
  const { settings, isLoading: budgetLoading } = useBudget();
  const { weddingSettings } = useWeddingSchedule();
  const venue = useWeddingVenue();

  // 내 식장 place_halls 단가·보증인원 (공개 read). 식장 미등록이면 쿼리 비활성.
  const venueQuery = useQuery<VenueMeal>({
    queryKey: ["venue-meal", venue.placeId],
    enabled: !!venue.placeId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("place_halls")
        .select("meal_price, min_guarantee, max_guarantee")
        .eq("place_id", venue.placeId)
        .order("meal_price", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return {
        mealPriceManwon: normalizeMealPriceManwon(data?.meal_price ?? null),
        minGuarantee: data?.min_guarantee ?? null,
        maxGuarantee: data?.max_guarantee ?? null,
      };
    },
  });

  // settings.region 은 키("seoul")나 공식라벨("서울특별시") 둘 다일 수 있어 resolveRegionKey 로 정규화.
  const regionKey =
    resolveRegionKey(settings?.region) ||
    resolveRegionKey(weddingSettings.wedding_region) ||
    resolveRegionKey(weddingSettings.wedding_venue_city) ||
    "seoul";
  const regional = regionalAverages[regionKey] ?? regionalAverages.seoul;
  const regionLabel = regions[regionKey]?.label ?? "지역";

  const daysUntilWedding = useMemo(() => {
    if (weddingSettings.wedding_date_tbd || !weddingSettings.wedding_date) return null;
    const target = new Date(weddingSettings.wedding_date + "T00:00:00").getTime();
    if (Number.isNaN(target)) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.ceil((target - today.getTime()) / 86_400_000);
  }, [weddingSettings.wedding_date, weddingSettings.wedding_date_tbd]);

  const result = useMemo<MealCostEstimateResult>(() => {
    const venueMeal = venueQuery.data;

    // 식수 우선순위 — 실집계 > 예상 > 보증 > 기본.
    let expectedHeads = DEFAULT_HEADS;
    let headsSource: MealHeadsSource = "default";
    const guestListHeads = stats.expectedHeads.all;
    if (guestListHeads > 0) {
      expectedHeads = guestListHeads;
      headsSource = "guestlist";
    } else if (settings?.guest_count && settings.guest_count > 0) {
      expectedHeads = settings.guest_count;
      headsSource = "guestcount";
    } else if (venueMeal?.minGuarantee && venueMeal.minGuarantee > 0) {
      expectedHeads = venueMeal.minGuarantee;
      headsSource = "guarantee";
    }

    // 단가 우선순위 — 내 식장(정규화 통과) > 지역 평균.
    const usingVenuePrice = venueMeal?.mealPriceManwon != null;
    const unitPriceManwon = usingVenuePrice
      ? (venueMeal!.mealPriceManwon as number)
      : regional.per_guest_meal;

    const estimate = computeMealCost({
      expectedHeads,
      headsSource,
      unitPriceManwon,
      priceSource: usingVenuePrice ? "venue" : "regional",
      minGuarantee: venueMeal?.minGuarantee ?? null,
      maxCapacity: venueMeal?.maxGuarantee ?? null,
      budgetedManwon: settings?.category_budgets?.meal ?? null,
    });

    return {
      estimate,
      usingVenuePrice,
      venueName: venue.name,
      regionLabel,
      perGuestRegional: regional.per_guest_meal,
      guestListHeads,
      isBudgetPersona: weddingSettings.planning_style === "budget_analytic",
      planningStyle: weddingSettings.planning_style ?? null,
      daysUntilWedding,
      isLoading: guestsLoading || budgetLoading || venueQuery.isLoading,
    };
  }, [
    venueQuery.data,
    venueQuery.isLoading,
    stats.expectedHeads.all,
    settings?.guest_count,
    settings?.category_budgets,
    regional,
    regionLabel,
    venue.name,
    weddingSettings.planning_style,
    daysUntilWedding,
    guestsLoading,
    budgetLoading,
  ]);

  return result;
}
