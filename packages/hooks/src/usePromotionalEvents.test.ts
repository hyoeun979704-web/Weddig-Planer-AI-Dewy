import { describe, it, expect } from "vitest";
import {
  matchesTarget,
  withinSchedule,
  resolveCtaForAuth,
  buildEventList,
  type PromotionalEvent,
} from "./usePromotionalEvents";
import type { WeddingPersonaMode } from "@/lib/weddingPersona";

function make(partial: Partial<PromotionalEvent>): PromotionalEvent {
  return {
    id: partial.id ?? "id",
    slug: partial.slug ?? "slug",
    title: partial.title ?? "title",
    subtitle: partial.subtitle ?? null,
    position: partial.position ?? 100,
    thumbBg: partial.thumbBg ?? null,
    icon: partial.icon ?? null,
    ctaLabel: partial.ctaLabel ?? "go",
    ctaPath: partial.ctaPath ?? "/somewhere",
    status: partial.status ?? "live",
    startsAt: partial.startsAt ?? null,
    endsAt: partial.endsAt ?? null,
    targetPersonas: partial.targetPersonas ?? [],
    targetStyles: partial.targetStyles ?? [],
    badgeLabel: partial.badgeLabel ?? null,
    badgeColor: partial.badgeColor ?? null,
    endsLabel: partial.endsLabel ?? null,
  };
}

const NOW = new Date("2026-06-07T00:00:00Z");

describe("matchesTarget", () => {
  it("빈 타겟이면 누구에게나 노출", () => {
    expect(matchesTarget(make({}), null, null)).toBe(true);
    expect(matchesTarget(make({}), "P1" as WeddingPersonaMode, null)).toBe(true);
  });

  it("persona 타겟이 있으면 일치할 때만", () => {
    const ev = make({ targetPersonas: ["P3"] });
    expect(matchesTarget(ev, "P3" as WeddingPersonaMode, null)).toBe(true);
    expect(matchesTarget(ev, "P1" as WeddingPersonaMode, null)).toBe(false);
    expect(matchesTarget(ev, null, null)).toBe(false);
  });

  it("style 타겟이 있으면 일치할 때만", () => {
    const ev = make({ targetStyles: ["modern"] });
    expect(matchesTarget(ev, null, "modern" as never)).toBe(true);
    expect(matchesTarget(ev, null, "classic" as never)).toBe(false);
  });
});

describe("withinSchedule", () => {
  it("시작 전이면 false", () => {
    expect(withinSchedule(make({ startsAt: "2026-07-01T00:00:00Z" }), NOW)).toBe(false);
  });
  it("종료 후면 false", () => {
    expect(withinSchedule(make({ endsAt: "2026-01-01T00:00:00Z" }), NOW)).toBe(false);
  });
  it("기간 내/무기한이면 true", () => {
    expect(withinSchedule(make({}), NOW)).toBe(true);
    expect(withinSchedule(make({ startsAt: "2026-01-01T00:00:00Z", endsAt: "2026-12-31T00:00:00Z" }), NOW)).toBe(true);
  });
});

describe("resolveCtaForAuth", () => {
  it("비로그인은 모든 CTA 를 /auth 로", () => {
    expect(resolveCtaForAuth(make({ ctaPath: "/referral" }), false).ctaPath).toBe("/auth");
    expect(resolveCtaForAuth(make({ ctaPath: "/points" }), false).ctaPath).toBe("/auth");
  });
  it("로그인 + welcome 은 프리미엄 안내로 치환(label↔value 함께)", () => {
    const r = resolveCtaForAuth(make({ slug: "welcome", ctaPath: "/auth", title: "신규 가입", ctaLabel: "지금 시작" }), true);
    expect(r.ctaPath).toBe("/premium");
    expect(r.title).not.toBe("신규 가입");
    expect(r.ctaLabel).toBe("혜택 보기");
  });
  it("로그인 + 일반 카드는 그대로", () => {
    const ev = make({ slug: "referral", ctaPath: "/referral" });
    expect(resolveCtaForAuth(ev, true)).toEqual(ev);
  });
});

describe("buildEventList", () => {
  it("DB 0건이면 evergreen 폴백을 position 순으로 노출", () => {
    const list = buildEventList([], null, null, true, NOW);
    expect(list.map((e) => e.slug)).toEqual([
      "welcome", "referral", "attendance", "mini_game", "review", "partner_link",
    ]);
  });

  it("폴백 cta_path 는 실제 라우트(App.tsx) 화이트리스트의 부분집합 — F2 회귀 가드", () => {
    // 로그인 사용자 기준(비로그인은 전부 /auth 로 치환되어 의미 없음).
    const validRoutes = new Set([
      "/auth", "/referral", "/points", "/merge-game", "/community/write", "/mypage", "/premium",
    ]);
    const list = buildEventList([], null, null, true, NOW);
    for (const e of list) {
      const base = e.ctaPath.split(/[?#]/)[0];
      expect(validRoutes.has(base)).toBe(true);
    }
  });

  it("같은 slug 는 DB 가 폴백을 override(dedupe)", () => {
    const db = [make({ slug: "welcome", title: "DB 환영", position: 0, ctaPath: "/auth" })];
    const list = buildEventList(db, null, null, true, NOW);
    const welcomes = list.filter((e) => e.slug === "welcome");
    expect(welcomes).toHaveLength(1);
    // DB row 가 welcome 이고 로그인 → 프리미엄 치환됨
    expect(welcomes[0].ctaPath).toBe("/premium");
  });

  it("비로그인은 노출 카드 전부 /auth", () => {
    const list = buildEventList([], null, null, false, NOW);
    expect(list.every((e) => e.ctaPath === "/auth")).toBe(true);
  });

  it("ended 는 최대 MAX_ENDED(3)개만, live 뒤에 배치", () => {
    const db = [
      make({ id: "l1", slug: "welcome", position: 0 }),
      ...Array.from({ length: 5 }, (_, i) =>
        make({ id: `e${i}`, slug: `ended_${i}`, status: "ended", position: 50 + i })),
    ];
    const list = buildEventList(db, null, null, true, NOW);
    const ended = list.filter((e) => e.status === "ended");
    expect(ended).toHaveLength(3);
    // ended 는 전부 live 뒤
    const firstEndedIdx = list.findIndex((e) => e.status === "ended");
    expect(list.slice(0, firstEndedIdx).every((e) => e.status !== "ended")).toBe(true);
  });

  it("persona 타겟 카드는 일치 사용자에게만, evergreen 은 항상", () => {
    const db = [make({ slug: "vip", title: "VIP", position: 5, targetPersonas: ["P3"], ctaPath: "/premium" })];
    const matched = buildEventList(db, "P3" as WeddingPersonaMode, null, true, NOW);
    expect(matched.some((e) => e.slug === "vip")).toBe(true);
    const unmatched = buildEventList(db, "P1" as WeddingPersonaMode, null, true, NOW);
    expect(unmatched.some((e) => e.slug === "vip")).toBe(false);
    // evergreen 은 두 경우 모두 존재
    expect(unmatched.some((e) => e.slug === "welcome")).toBe(true);
  });
});
