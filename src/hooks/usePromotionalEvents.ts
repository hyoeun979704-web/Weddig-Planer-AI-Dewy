// promotional_events 테이블에서 활성 이벤트 카드 로드. Events.tsx 의 하드코딩
// FEATURED/LIVE_EVENTS 대체. 페르소나/스타일 타겟팅 적용 — target_personas 가
// 비어 있으면 모두에게, 채워져 있으면 사용자의 persona_mode가 포함될 때만.
//
// 폴백: 네트워크/DB 오류 시 기본 시드 4개를 반환해 화면이 비지 않도록.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { WeddingPersonaMode } from "@/lib/weddingPersona";
import type { WeddingStyle } from "@/lib/weddingStyle";

export interface PromotionalEvent {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  position: number;
  thumbBg: string | null;
  icon: string | null;
  ctaLabel: string;
  ctaPath: string;
  status: "live" | "ended" | "scheduled";
  startsAt: string | null;
  endsAt: string | null;
  targetPersonas: string[];
  targetStyles: string[];
  badgeLabel: string | null;
  badgeColor: string | null;
  endsLabel: string | null;
}

const FALLBACK: PromotionalEvent[] = [
  {
    id: "fallback-welcome",
    slug: "welcome",
    title: "신규 가입 1달 프리미엄 무료",
    subtitle: "AI 플래너 무제한 + 예산 분석 PDF + 보너스 하트",
    position: 0,
    thumbBg: "from-[#FFEBC9] to-[#F5BE7A]",
    icon: null,
    ctaLabel: "지금 시작",
    ctaPath: "/auth",
    status: "live",
    startsAt: null,
    endsAt: null,
    targetPersonas: [],
    targetStyles: [],
    badgeLabel: null,
    badgeColor: null,
    endsLabel: null,
  },
];

function matchesTarget(
  ev: PromotionalEvent,
  persona: WeddingPersonaMode | null,
  style: WeddingStyle | null,
): boolean {
  if (ev.targetPersonas.length > 0) {
    if (!persona || !ev.targetPersonas.includes(persona)) return false;
  }
  if (ev.targetStyles.length > 0) {
    if (!style || !ev.targetStyles.includes(style)) return false;
  }
  return true;
}

function withinSchedule(ev: PromotionalEvent, now: Date): boolean {
  if (ev.startsAt && new Date(ev.startsAt) > now) return false;
  if (ev.endsAt && new Date(ev.endsAt) < now) return false;
  return true;
}

export function usePromotionalEvents(
  persona: WeddingPersonaMode | null,
  style: WeddingStyle | null,
) {
  const [events, setEvents] = useState<PromotionalEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setIsLoading(true);
        const { data, error } = await (supabase as any)
          .from("promotional_events")
          .select(
            "id, slug, title, subtitle, position, thumb_bg, icon, cta_label, cta_path, status, starts_at, ends_at, target_personas, target_styles, badge_label, badge_color, ends_label"
          )
          .eq("status", "live")
          .order("position", { ascending: true });
        if (error) throw error;
        if (!mounted) return;
        const mapped: PromotionalEvent[] = (data ?? []).map((row: any) => ({
          id: row.id,
          slug: row.slug,
          title: row.title,
          subtitle: row.subtitle ?? null,
          position: row.position ?? 100,
          thumbBg: row.thumb_bg ?? null,
          icon: row.icon ?? null,
          ctaLabel: row.cta_label,
          ctaPath: row.cta_path,
          status: row.status,
          startsAt: row.starts_at ?? null,
          endsAt: row.ends_at ?? null,
          targetPersonas: Array.isArray(row.target_personas) ? row.target_personas : [],
          targetStyles: Array.isArray(row.target_styles) ? row.target_styles : [],
          badgeLabel: row.badge_label ?? null,
          badgeColor: row.badge_color ?? null,
          endsLabel: row.ends_label ?? null,
        }));
        const now = new Date();
        const filtered = mapped
          .filter((ev) => withinSchedule(ev, now))
          .filter((ev) => matchesTarget(ev, persona, style));
        setEvents(filtered.length > 0 ? filtered : FALLBACK);
        setError(null);
      } catch (e) {
        if (!mounted) return;
        console.error("usePromotionalEvents failed", e);
        setEvents(FALLBACK);
        setError(String(e));
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [persona, style]);

  // position 0 을 featured, 그 외를 list 로 분리. featured 가 비면 첫 항목을 승격.
  const featured = events.find((e) => e.position === 0) ?? events[0] ?? null;
  const list = events.filter((e) => e !== featured);

  return { featured, list, isLoading, error };
}
