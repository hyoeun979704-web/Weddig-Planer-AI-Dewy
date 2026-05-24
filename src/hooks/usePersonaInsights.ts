import { useMemo } from "react";
import { useWeddingSchedule, type ScheduleItem } from "@/hooks/useWeddingSchedule";
import {
  WEDDING_STYLE_LABEL,
  type WeddingStyle,
} from "@/lib/weddingStyle";
import {
  getMissionsForStyle,
  getStyleIntro,
  type PersonaMission,
} from "@/data/personaMissions";
import { computePregnancyContext, type PregnancyContext } from "@/lib/pregnancy";
import {
  PERSONA_HEADER,
  PERSONA_LABEL,
  type WeddingPersonaMode,
} from "@/lib/weddingPersona";

export interface PersonaInsights {
  isLoaded: boolean;
  hasOnboarded: boolean;
  weddingStyle: WeddingStyle;
  styleLabel: string;
  styleIntro: { title: string; subtitle: string; accentEmoji: string };
  daysUntilWedding: number | null;
  /** % of seeded checklist items completed (0–100). */
  progressPercent: number;
  completedCount: number;
  totalCount: number;
  /** Up to 3 next actionable items, sorted by nearest due date. */
  nextActions: ScheduleItem[];
  missions: PersonaMission[];
  /** 임신 차수·주수 컨텍스트. pregnant=false 거나 dueDate 미설정이면 모든 필드 null. */
  pregnancy: PregnancyContext;
  /** 페르소나 모드(P1~P20 매핑). NULL이면 standard_bride 폴백. */
  personaMode: WeddingPersonaMode;
  personaLabel: string;
  /** 페르소나별 홈 헤더 카피 — styleIntro 보다 우선하는 비표준 페르소나용 라벨. */
  personaHeader: { title: string; subtitle: string };
}

const computeDaysUntil = (date: string | null): number | null => {
  if (!date) return null;
  const wedding = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((wedding.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

/**
 * Aggregates the data needed for the style-aware home dashboard:
 *  - wedding style metadata (label + intro copy + accent emoji)
 *  - checklist progress (% complete from seeded schedule items)
 *  - the next 3 actionable upcoming items
 *  - style-tailored daily missions
 *
 * Onboarding gate: returns hasOnboarded=false until the user has either
 * entered a real wedding_date or explicitly checked 미정. Callers should
 * branch on that to show the welcome/setup CTA instead of the dashboard.
 */
export function usePersonaInsights(): PersonaInsights {
  const { weddingSettings, scheduleItems, isLoading } = useWeddingSchedule();

  return useMemo(() => {
    const style = (weddingSettings.wedding_style ?? "general") as WeddingStyle;
    const styleIntro = getStyleIntro(style);
    const styleLabel = WEDDING_STYLE_LABEL[style] ?? WEDDING_STYLE_LABEL.general;

    const hasDateInfo =
      !!weddingSettings.wedding_date || weddingSettings.wedding_date_tbd;
    const hasOnboarded =
      hasDateInfo || !!weddingSettings.planning_stage;

    const daysUntilWedding = computeDaysUntil(weddingSettings.wedding_date);

    const pregnancy = computePregnancyContext(
      weddingSettings.pregnant,
      weddingSettings.pregnancy_due_date,
      weddingSettings.wedding_date,
    );

    // Progress + next actions are only meaningful once items are seeded.
    const totalCount = scheduleItems.length;
    const completedCount = scheduleItems.filter(i => i.completed).length;
    const progressPercent = totalCount === 0
      ? 0
      : Math.round((completedCount / totalCount) * 100);

    // Next actions: open items, soonest scheduled_date first. Falls back to
    // any open items if everything is past-due (still actionable, just late).
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const openItems = scheduleItems.filter(i => !i.completed);
    const upcoming = openItems.filter(i => new Date(i.scheduled_date) >= now);
    const nextActions = (upcoming.length > 0 ? upcoming : openItems)
      .slice()
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
      .slice(0, 3);

    const personaMode = (weddingSettings.persona_mode ?? "standard_bride") as WeddingPersonaMode;
    const personaHeader = PERSONA_HEADER[personaMode] ?? PERSONA_HEADER.standard_bride;
    const personaLabel = PERSONA_LABEL[personaMode] ?? PERSONA_LABEL.standard_bride;

    return {
      isLoaded: !isLoading,
      hasOnboarded,
      weddingStyle: style,
      styleLabel,
      styleIntro,
      daysUntilWedding,
      progressPercent,
      completedCount,
      totalCount,
      nextActions,
      missions: getMissionsForStyle(style, {
        pregnant: weddingSettings.pregnant,
        pregnancyTrimester: pregnancy.trimesterAtWedding,
        personaMode,
        // Round 8 A — role layering 으로 호텔/지방/해외/single 신랑이 신랑 미션 받게.
        role: weddingSettings.role ?? null,
      }),
      pregnancy,
      personaMode,
      personaLabel,
      personaHeader,
    };
  }, [
    isLoading,
    weddingSettings.wedding_style,
    weddingSettings.wedding_date,
    weddingSettings.wedding_date_tbd,
    weddingSettings.planning_stage,
    weddingSettings.pregnant,
    weddingSettings.pregnancy_due_date,
    weddingSettings.persona_mode,
    // Round 8 A — role layering 활성/비활성이 미션에 영향. dep 누락 시 미션 미동기화.
    weddingSettings.role,
    scheduleItems,
  ]);
}
