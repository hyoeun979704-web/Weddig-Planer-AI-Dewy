// AI 스튜디오 카드 개인화(깊이 ④) — 역할·페르소나로 카드 "순서"를 바꾸고 힌트를 준다.
// 원칙: **숨기지 않고 순서만**(탐색 자유 유지 — 신랑도 드레스 투어를 볼 수 있게). 예식 유무 hide 는
// 기존 shouldHideWeddingCeremony 가 담당(여기선 관여 안 함). 큰 점수 = 위로.

import type { WeddingPersonaMode, UserRole } from "./weddingPersona";

export interface StudioPersonaCtx {
  personaMode?: WeddingPersonaMode | null;
  role?: UserRole | null;
}

// 카드별 관련성 가중(양수=위로, 음수=아래로). 매핑에 없는 카드는 0(중립).
const roleScore = (cardId: string, role: UserRole | null | undefined): number => {
  if (role === "groom") {
    if (cardId === "hair-room" || cardId === "wedding-consulting") return 1;
    if (cardId === "sdm-preview") return 0.5;
    if (cardId === "dress-tour" || cardId === "makeup-finder") return -2; // 신부 중심 → 아래로
    return 0;
  }
  if (role === "bride") {
    if (cardId === "dress-tour" || cardId === "makeup-finder") return 1;
    return 0;
  }
  return 0;
};

const personaScore = (cardId: string, mode: WeddingPersonaMode | null | undefined): number => {
  if (!mode) return 0;
  // 예산형·초보·처음이라면 상담(비교·혜택)을 앞으로.
  if ((mode === "budget_analytic" || mode === "first_timer") && cardId === "wedding-consulting") return 1.5;
  if (mode === "luxury_hotel" && cardId === "wedding-consulting") return 1;
  if (mode === "luxury_hotel" && cardId === "sdm-preview") return 0.5;
  return 0;
};

/** 카드 id 목록을 역할·페르소나 점수로 재정렬(안정 정렬: 동점이면 원래 순서 유지). 원본 불변. */
export function rankStudioCardIds(ids: readonly string[], ctx: StudioPersonaCtx): string[] {
  const score = (id: string) => roleScore(id, ctx.role) + personaScore(id, ctx.personaMode);
  return ids
    .map((id, i) => ({ id, i, s: score(id) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.id);
}

/** 스튜디오 상단에 덧붙일 성향별 한 줄 힌트. 없으면 null(노이즈 방지). */
export function studioPersonaHint(ctx: StudioPersonaCtx): string | null {
  if (ctx.personaMode === "pregnancy")
    return "임산부도 편한 드레스·헤어와 앉기 편한 스타일을 먼저 살펴보세요.";
  if (ctx.role === "groom")
    return "신랑에게 맞춰 헤어·컨설팅을 먼저 보여드려요.";
  return null;
}
