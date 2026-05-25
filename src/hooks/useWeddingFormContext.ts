import { useWeddingSchedule } from "./useWeddingSchedule";
import { useBudget } from "./useBudget";
import { BUDGET_OPTIONS_VENUE, BUDGET_OPTIONS_SDME, REGIONS as SURVEY_REGIONS } from "@/components/wedding-planner/constants";
import { normalizeRegion } from "@/lib/regions";

// Round 14 self-review P0 fix — budgetSettings.region 은 영문 key("chungnam"/"seoul" 등)
// 로 저장됨. Survey REGIONS.searchKey 는 한글("충청남"/"서울" 등). 매핑 안 하면 단축 카드가
// region 없이 submit. lib/regions normalizeRegion 으로 한글 풀네임("충청남도")→약자
// ("충청남") 매핑 후 영문 key 도 동일한 약자로 변환.
const BUDGET_REGION_TO_SEARCH_KEY: Record<string, string> = {
  seoul: "서울",
  gyeonggi: "경기",
  incheon: "인천",
  busan: "부산",
  daegu: "대구",
  gwangju: "광주",
  daejeon: "대전",
  ulsan: "울산",
  sejong: "세종",
  gangwon: "강원",
  chungbuk: "충청북",
  chungnam: "충청남",
  jeonbuk: "전북",
  jeonnam: "전라남",
  gyeongbuk: "경상북",
  gyeongnam: "경상남",
  jeju: "제주",
};

/** 어떤 형태(wedding_region 풀네임 / budget region 영문 key / 약자) 가 들어와도
 *  Survey REGIONS.searchKey 와 매칭되는 값으로 정규화. 매칭 실패 시 null (prefill skip). */
function normalizeToSurveyKey(input: string | null | undefined): string | null {
  if (!input) return null;
  // 1차 — 영문 key 직접 매핑
  if (BUDGET_REGION_TO_SEARCH_KEY[input]) return BUDGET_REGION_TO_SEARCH_KEY[input];
  // 2차 — 한글 (풀네임/약자/value) → lib/regions value 로 정규화
  const normalized = normalizeRegion(input);
  if (!normalized) return null;
  // 3차 — Survey REGIONS.searchKey 에 실제 존재하는지 검증 (없으면 select <option> 매칭 안 됨)
  if (SURVEY_REGIONS.some((r) => r.searchKey === normalized)) return normalized;
  return null;
}

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

  // Round 14 P0 fix — Survey REGIONS.searchKey 와 매칭되는 정규화 값 반환. raw wedding_region
  // ("충청남도") 또는 budget region ("chungnam") 그대로 반환하면 모달 select 매칭 0 + 단축
  // 카드가 region 없이 submit 하는 회귀. 매칭 실패 시 null → prefill 안 함.
  const normalizedRegion =
    normalizeToSurveyKey(weddingSettings.wedding_region) ??
    normalizeToSurveyKey(budgetSettings?.region);

  return {
    defaultWeddingDate: weddingDate,
    defaultRegion: normalizedRegion,
    defaultGuests: budgetSettings?.guest_count ? String(budgetSettings.guest_count) : null,
    defaultTotalBudget: budgetSettings?.total_budget ? String(budgetSettings.total_budget) : null,
    defaultVenueBudgetLabel: findBudgetLabel(venueBudget, BUDGET_OPTIONS_VENUE),
    defaultSdmeBudgetLabel: findBudgetLabel(sdmeBudget, BUDGET_OPTIONS_SDME),
  };
};
