import { useWeddingSchedule } from "./useWeddingSchedule";
import { useBudget } from "./useBudget";

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
}

export const useWeddingFormContext = (): WeddingFormContext => {
  const { weddingSettings } = useWeddingSchedule();
  const { settings: budgetSettings } = useBudget();

  const weddingDate = weddingSettings.wedding_date
    ? new Date(weddingSettings.wedding_date)
    : null;

  return {
    defaultWeddingDate: weddingDate,
    defaultRegion: weddingSettings.wedding_region ?? budgetSettings?.region ?? null,
    defaultGuests: budgetSettings?.guest_count ? String(budgetSettings.guest_count) : null,
    defaultTotalBudget: budgetSettings?.total_budget ? String(budgetSettings.total_budget) : null,
  };
};
