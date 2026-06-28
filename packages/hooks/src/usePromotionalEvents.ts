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

// 네트워크/DB 실패 시 또는 DB 결과가 0개일 때 noop 가 아니라 핵심 카드를 노출.
// 운영팀이 일부러 persona 별로 좁혀 target 했더라도 적립·미션 같은 일반 보상
// surface 까지 빈 화면이 되면 안 됨(F#6).
//
// ⚠️ cta_path/title 은 실 DB·라우트(App.tsx)와 반드시 일치시킬 것. 과거 폴백이
// 옛 경로 복붙본이라 /community/new(404)·/mypage?tab=* (핸들러 없음) 으로 끊겨
// 있었음. 라우트 개명/추가 시 여기도 갱신(usePromotionalEvents.test 가 회귀 방지).
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
    title: "친구 초대 1명당 1,000포인트",
    subtitle: "초대받은 친구도 500포인트 · 무제한 적립",
    position: 10,
    thumbBg: "from-[#F3F8ED] to-[#DDEEDC]",
    icon: null,
    ctaLabel: "초대하기",
    ctaPath: "/referral",
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
    ctaPath: "/points",
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
    id: "fallback-mini_game",
    slug: "mini_game",
    title: "꽃 머지 미니게임으로 적립",
    subtitle: "게임하고 포인트 받기 · 광고 시 2배",
    position: 25,
    thumbBg: "from-[#FFF1F4] to-[#FAD0DA]",
    icon: null,
    ctaLabel: "게임 시작",
    ctaPath: "/merge-game",
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
    subtitle: "리뷰 작성 시 3,000포인트 즉시 적립",
    position: 30,
    thumbBg: "from-[#F1F4FB] to-[#CFDDF5]",
    icon: null,
    ctaLabel: "후기 쓰기",
    ctaPath: "/community/write",
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
    id: "fallback-partner_link",
    slug: "partner_link",
    title: "파트너와 함께 준비해요",
    subtitle: "일정·예산·일기를 둘이서 함께 관리",
    position: 40,
    thumbBg: "from-[#FFF0F4] to-[#FAD0DA]",
    icon: null,
    ctaLabel: "파트너 연동",
    ctaPath: "/mypage#partner-link",
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

function buildFallback(): PromotionalEvent[] {
  return FALLBACK_BASE.map((ev) => ({ ...ev }));
}

// 로그인 여부에 맞춰 CTA 목적지를 해석한다 — DB·폴백 카드 공통 적용(단일 지점).
// - 비로그인: 모든 이벤트는 적립/보상 surface 라 로그인이 선행 → /auth 로 유도.
// - 로그인 + welcome: 이미 가입했으므로 "가입" 카피/경로 대신 프리미엄 안내로 치환.
// 표시 문구(title/ctaLabel)와 이동 경로(ctaPath)를 함께 바꿔 label↔value 정합 유지.
export function resolveCtaForAuth(ev: PromotionalEvent, isAuthenticated: boolean): PromotionalEvent {
  if (!isAuthenticated) {
    if (ev.ctaPath === "/auth") return ev;
    return { ...ev, ctaPath: "/auth" };
  }
  if (ev.slug === "welcome") {
    return { ...ev, title: "프리미엄으로 더 잘 준비하기", ctaLabel: "혜택 보기", ctaPath: "/premium" };
  }
  return ev;
}

// ended 카드는 최근 종료분만 소수 노출(FOMO·활동 증빙). 무한 누적 방지.
const MAX_ENDED = 3;

export function matchesTarget(
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

export function withinSchedule(ev: PromotionalEvent, now: Date): boolean {
  if (ev.startsAt && new Date(ev.startsAt) > now) return false;
  if (ev.endsAt && new Date(ev.endsAt) < now) return false;
  return true;
}

function mapRow(row: any): PromotionalEvent {
  return {
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
  };
}

// DB row 들 → 화면에 뿌릴 최종 목록(순수 함수, 테스트 대상). 흐름:
// 1) 타겟팅(persona/style) 필터 2) live 는 스케줄 검사, ended 는 명시 종료라 통과
// 3) evergreen fallback 을 '없는 slug 만' 병합(DB override 우선 — Round 15 회귀 방지)
// 4) live 는 position 정렬, 최근 ended 소수(MAX_ENDED)를 뒤에 5) 로그인별 CTA 해석.
export function buildEventList(
  mapped: PromotionalEvent[],
  persona: WeddingPersonaMode | null,
  style: WeddingStyle | null,
  isAuthenticated: boolean,
  now: Date,
): PromotionalEvent[] {
  const live: PromotionalEvent[] = [];
  const ended: PromotionalEvent[] = [];
  for (const ev of mapped) {
    if (!matchesTarget(ev, persona, style)) continue;
    if (ev.status === "ended") { ended.push(ev); continue; }
    if (!withinSchedule(ev, now)) continue;
    live.push(ev);
  }
  const presentSlugs = new Set([...live, ...ended].map((e) => e.slug));
  const fallback = buildFallback().filter(
    (ev) => !presentSlugs.has(ev.slug) && matchesTarget(ev, persona, style),
  );
  const liveSorted = [...live, ...fallback].sort((a, b) => a.position - b.position);
  const endedCapped = ended.slice(0, MAX_ENDED);
  return [...liveSorted, ...endedCapped].map((ev) => resolveCtaForAuth(ev, isAuthenticated));
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
        const { data, error } = await supabase
          .from("promotional_events")
          .select(
            "id, slug, title, subtitle, position, thumb_bg, icon, cta_label, cta_path, status, starts_at, ends_at, target_personas, target_styles, badge_label, badge_color, ends_label"
          )
          .in("status", ["live", "ended"])
          .order("position", { ascending: true });
        if (error) throw error;
        if (!mounted) return;
        const mapped = (data ?? []).map(mapRow);
        setEvents(buildEventList(mapped, persona, style, isAuthenticated, new Date()));
        setError(null);
      } catch (e) {
        if (!mounted) return;
        console.error("usePromotionalEvents failed", e);
        // DB 실패 시 evergreen 폴백만(로그인별 CTA 해석 포함)
        setEvents(buildEventList([], persona, style, isAuthenticated, new Date()));
        setError(String(e));
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [persona, style, isAuthenticated]);

  // position 0(live)을 featured, 그 외를 list 로 분리. featured 가 비면 첫 live 승격.
  const featured =
    events.find((e) => e.position === 0 && e.status !== "ended") ??
    events.find((e) => e.status !== "ended") ??
    null;
  const list = events.filter((e) => e !== featured);

  return { featured, list, isLoading, error };
}
