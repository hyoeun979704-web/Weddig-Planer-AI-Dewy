// 일반회원 등급제 단일 소스. profiles.member_tier(basic/gold/vip) 와 미러 —
// 키는 DB CHECK 제약·admin_set_member_tier RPC 의 허용값과 일치(변경 금지).
// 변경은 운영자만(어드민 회원관리 → admin_set_member_tier RPC).

export type MemberTier = "basic" | "gold" | "vip";

export const MEMBER_TIERS: MemberTier[] = ["basic", "gold", "vip"];

interface TierMeta {
  label: string;
  /** 배지 색상(라이트/다크 공용 토큰 기반) */
  badgeClass: string;
}

const TIER_META: Record<MemberTier, TierMeta> = {
  basic: { label: "일반", badgeClass: "bg-muted text-muted-foreground" },
  gold: { label: "우수", badgeClass: "bg-amber-100 text-amber-700" },
  vip: { label: "VIP", badgeClass: "bg-purple-100 text-purple-700" },
};

export const isMemberTier = (v: unknown): v is MemberTier =>
  typeof v === "string" && (MEMBER_TIERS as string[]).includes(v);

export const memberTierLabel = (tier: string | null | undefined): string =>
  isMemberTier(tier) ? TIER_META[tier].label : TIER_META.basic.label;

export const memberTierBadgeClass = (tier: string | null | undefined): string =>
  isMemberTier(tier) ? TIER_META[tier].badgeClass : TIER_META.basic.badgeClass;
