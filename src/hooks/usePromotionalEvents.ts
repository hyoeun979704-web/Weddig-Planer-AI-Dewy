// promotional_events 테이블에서 활성 이벤트 카드 로드. Events.tsx 의 하드코딩
// FEATURED/LIVE_EVENTS 대체. 페르소나/스타일 타겟팅 적용 — target_personas 가
// 비어 있으면 모두에게, 채워져 있으면 사용자의 persona_mode가 포함될 때만.
//
// 폴백: 네트워크/DB 오류 시 기본 시드 4개를 반환해 화면이 비지 않도록.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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

// 네트워크/DB 실패 시 또는 DB 결과가 0개일 때 noop 가 아니라 핵심 카드 4종을
// 노출. 운영팀이 일부러 persona 별로 좁혀 target 했더라도 적립·미션 같은 일반
// 보상 surface 까지 빈 화면이 되면 안 됨(F#6). welcome 카드만 로그인 여부에 따라 분기.
const FALLBACK_BASE: PromotionalEvent[] = [
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
  {
    id: "fallback-referral",
    slug: "referral",
    title: "친구 초대 1명당 1,000P",
    subtitle: "초대받은 친구도 500P · 무제한 적립",
    position: 10,
    thumbBg: "from-[#F3F8ED] to-[#DDEEDC]",
    icon: null,
    ctaLabel: "초대하기",
    ctaPath: "/mypage?tab=invite",
    status: "live",
    startsAt: null,
    endsAt: null,
    targetPersonas: [],
    targetStyles: [],
    badgeLabel: null,
    badgeColor: null,
    endsLabel: null,
  },
  {
    id: "fallback-attendance",
    slug: "attendance",
    title: "미션 출석 7일 도전",
    subtitle: "연속 출석 시 보너스 하트 +5",
    position: 20,
    thumbBg: "from-[#F5EFFB] to-[#E0CFFB]",
    icon: null,
    ctaLabel: "미션 보기",
    ctaPath: "/mypage?tab=missions",
    status: "live",
    startsAt: null,
    endsAt: null,
    targetPersonas: [],
    targetStyles: [],
    badgeLabel: null,
    badgeColor: null,
    endsLabel: null,
  },
  {
    id: "fallback-review",
    slug: "review",
    title: "본식 사진 후기 작성",
    subtitle: "리뷰 작성 시 3,000P 즉시 적립",
    position: 30,
    thumbBg: "from-[#F1F4FB] to-[#CFDDF5]",
    icon: null,
    ctaLabel: "후기 쓰기",
    ctaPath: "/community/new",
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

// 로그인 여부에 따라 welcome 의 CTA 를 분기 — 로그인된 사용자에게 /auth 를 보여주면 혼란.
function buildFallback(isAuthenticated: boolean): PromotionalEvent[] {
  return FALLBACK_BASE.map((ev) =>
    ev.slug === "welcome" && isAuthenticated
      ? { ...ev, title: "프리미엄으로 더 잘 준비하기", ctaLabel: "혜택 보기", ctaPath: "/premium" }
      : ev
  );
}

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
  const { user } = useAuth();
  const isAuthenticated = !!user;
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
        // Round 15 P0 fix — DB 매칭 1개라도 있을 때 4종 evergreen fallback(welcome/
        // referral/attendance/review)이 사라지던 회귀. 페르소나 타겟 이벤트와 evergreen
        // 둘 다 보장 — slug 로 dedupe 해서 DB 가 같은 slug 로 override 한 경우만 우선.
        const fallback = buildFallback(isAuthenticated);
        const dbSlugs = new Set(filtered.map((ev) => ev.slug));
        const merged = [...filtered, ...fallback.filter((ev) => !dbSlugs.has(ev.slug))];
        setEvents(merged);
        setError(null);
      } catch (e) {
        if (!mounted) return;
        console.error("usePromotionalEvents failed", e);
        setEvents(buildFallback(isAuthenticated));
        setError(String(e));
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [persona, style, isAuthenticated]);

  // position 0 을 featured, 그 외를 list 로 분리. featured 가 비면 첫 항목을 승격.
  const featured = events.find((e) => e.position === 0) ?? events[0] ?? null;
  const list = events.filter((e) => e !== featured);

  return { featured, list, isLoading, error };
}
