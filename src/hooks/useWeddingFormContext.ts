import { useWeddingSchedule } from "./useWeddingSchedule";
import { useBudget } from "./useBudget";
import { BUDGET_OPTIONS_VENUE, BUDGET_OPTIONS_SDME } from "@/components/wedding-planner/constants";

/**
 * 챗봇 Survey 모달들이 매번 빈 상태로 열려서 사용자가 같은 정보를 반복 입력해야
 * 했던 문제 해소용. `user_wedding_settings`·`budget_settings`에 이미 저장된
 * 값을 모달 prefill에 쓰는 공통 hook.
 *
 * 각 모달은 `useEffect(isOpen)` 의존성에 이 hook의 값을 넣어, 모달이 열릴
 * 때마다 최신 저장값으로 초기화한다. 사용자가 모달에서 다른 값으로 바꾸는
 * 건 모달 로컬 state로 처리되므로 prefill을 덮어쓴다.
 *
 * Null/빈 문자열 정책: 값이 없으면 `null`을 그대로 노출. 모달에서 `?? ""`로
 * 빈 input fallback. partner_name·planning_stage 같은 모달이 안 쓰는 필드는
 * 노출하지 않는다.
 */
export interface WeddingFormContext {
  defaultWeddingDate: Date | null;
  defaultRegion: string | null;
  defaultGuests: string | null;
  defaultTotalBudget: string | null;
  /** Round 14 — 식장(category 'venue') 예산 금액(만원). picker fatigue 완화: VenueSurvey
   *  의 budgetLabel 칩을 BUDGET_OPTIONS_VENUE 와 매칭해 auto-prefill. */
  defaultVenueBudgetLabel: string | null;
  /** Round 14 — 스드메(sdm) 예산 → BUDGET_OPTIONS_SDME 라벨 매칭. */
  defaultSdmeBudgetLabel: string | null;
}

/** 금액(만원) → BUDGET_OPTIONS_VENUE / SDME label 매칭. 옵션 list 의 max 가 가장 가까운
 *  range. amount <= max 인 첫 옵션 선택. amount=null 또는 0 이면 null. */
function findBudgetLabel(
  amount: number | null | undefined,
  options: ReadonlyArray<{ label: string; max: number | null }>,
): string | null {
  if (!amount || amount <= 0) return null;
  for (const opt of options) {
    if (opt.max === null) return opt.label; // 최상단 "X 이상"
    if (amount <= opt.max) return opt.label;
  }
  return null;
}

export const useWeddingFormContext = (): WeddingFormContext => {
  const { weddingSettings } = useWeddingSchedule();
  const { settings: budgetSettings } = useBudget();

  const weddingDate = weddingSettings.wedding_date
    ? new Date(weddingSettings.wedding_date)
    : null;

  const cat = budgetSettings?.category_budgets ?? {};
  const venueBudget = (cat as Record<string, number>)["venue"] ?? null;
  const sdmeBudget = (cat as Record<string, number>)["sdm"] ?? null;

  return {
    defaultWeddingDate: weddingDate,
    defaultRegion: weddingSettings.wedding_region ?? budgetSettings?.region ?? null,
    defaultGuests: budgetSettings?.guest_count ? String(budgetSettings.guest_count) : null,
    defaultTotalBudget: budgetSettings?.total_budget ? String(budgetSettings.total_budget) : null,
    defaultVenueBudgetLabel: findBudgetLabel(venueBudget, BUDGET_OPTIONS_VENUE),
    defaultSdmeBudgetLabel: findBudgetLabel(sdmeBudget, BUDGET_OPTIONS_SDME),
  };
};
