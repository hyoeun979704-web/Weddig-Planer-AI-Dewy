// Type definitions for AI-generated "savable" plans surfaced by
// AIPlanApplyCard. These describe the preview/apply payload shape that the
// card renders and forwards to its onApply callback. Kept colocated with the
// chatbot handlers so both the card and any future apply logic share one
// source of truth.

/** A single budget category allocation line in a savable budget plan. */
export interface SavableBudgetAllocation {
  category: string;
  label: string;
  amount: number;
  isPriority?: boolean;
}

/** AI-proposed budget distribution the user can save to their real budget. */
export interface SavableBudgetPlan {
  totalBudget: number;
  allocations: SavableBudgetAllocation[];
}

/** A single timeline event line in a savable timeline plan. */
export interface SavableTimelineEvent {
  time: string;
  title: string;
  emphasis?: boolean;
}

/** AI-proposed wedding-day timeline the user can save to their schedule. */
export interface SavableTimelinePlan {
  events: SavableTimelineEvent[];
}
