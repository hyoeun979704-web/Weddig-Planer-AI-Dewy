// 온보딩 완료 판정 utility.
//
// 같은 로직이 여러 곳 (useHomeFirstRun, TutorialWelcomeSheet, useWeddingInfoPrompt,
// useBudget 등) 에 inline 으로 흩어져 있어 drift 위험. 정의를 한 곳에 모음.
//
// 판정 기준 (의도적으로 느슨):
//   - (날짜 정보 + 지역 정보) 모두 있거나
//   - planning_stage 가 채워져 있으면 온보딩 완료로 간주.
//
// 날짜/지역의 "있다" 는 실제 값(wedding_date / wedding_region) 또는 "미정"
// 플래그(wedding_date_tbd / wedding_region_tbd) 어느 쪽이든 OK — 사용자가
// 명시적으로 "미정" 을 선택한 것도 정보 입력으로 본다.
//
// CLAUDE.md Round 13 회귀: "미정" 을 선택 안 한 사용자가 강제로 다시 모달
// 보지 않도록 하는 의도. 실제 정보 부재는 페이지별 gate (예산·일정) 에서
// 다시 묻는다.

export interface OnboardingSettings {
  wedding_date?: string | null;
  wedding_region?: string | null;
  wedding_date_tbd?: boolean | null;
  wedding_region_tbd?: boolean | null;
  planning_stage?: string | null;
}

export function isOnboarded(settings: OnboardingSettings | null | undefined): boolean {
  if (!settings) return false;
  const hasDate = !!settings.wedding_date || !!settings.wedding_date_tbd;
  const hasRegion = !!settings.wedding_region || !!settings.wedding_region_tbd;
  return (hasDate && hasRegion) || !!settings.planning_stage;
}
