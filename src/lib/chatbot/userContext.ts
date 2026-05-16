/**
 * LLM 호출 시 시스템 컨텍스트로 주입할 사용자 데이터 빌더.
 *
 * 라우터에 안 잡히는 자유 자연어 질문이 LLM으로 폴백될 때, 기본 페르소나
 * (wedding_style)만 주입되면 답변이 일반론 수준에 그친다. 결혼일·예산
 * 진척률·지역·하객수 같은 사용자 컨텍스트를 함께 주입해 답변이 사용자
 * 상황에 맞춰지도록 한다.
 *
 * ⚠️ 토큰 비용 고려: 컨텍스트 텍스트는 매 LLM 호출마다 전송된다. 변동
 * 가능성 있는 정보(예산 사용액·체크리스트 진척)도 포함하지만, 항목 수와
 * 각 라인 길이는 보수적으로 유지한다.
 *
 * 모든 필드 누락 / 비로그인 → null 반환 (주입 X).
 */

import type { WeddingStyle } from "@/lib/weddingStyle";

export interface UserContextInput {
  weddingSettings?: {
    wedding_date?: string | null;
    wedding_region?: string | null;
    partner_name?: string | null;
    planning_stage?: string | null;
    wedding_style?: WeddingStyle | null;
    excluded_categories?: string[];
  } | null;
  budgetSettings?: {
    total_budget?: number;
    guest_count?: number;
  } | null;
  budgetSummary?: {
    totalSpent: number;
    remaining: number;
  } | null;
  scheduleSummary?: {
    completed: number;
    total: number;
    nextUpcoming?: { title: string; daysAway: number } | null;
  } | null;
}

const STAGE_LABEL: Record<string, string> = {
  just_started: "막 시작",
  partly_done: "절반 정도",
  further_along: "후반부",
  almost_ready: "마무리 단계",
};

const STYLE_LABEL: Record<WeddingStyle, string> = {
  general: "일반 결혼식",
  small: "스몰웨딩",
  self: "셀프웨딩",
  custom: "맞춤형 결혼식",
};

const daysUntil = (dateStr: string): number | null => {
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
};

const formatKoDate = (dateStr: string): string | null => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
};

export const buildUserContextPrompt = (input: UserContextInput): string | null => {
  const lines: string[] = [];
  const ws = input.weddingSettings;
  const bs = input.budgetSettings;
  const sum = input.budgetSummary;
  const sch = input.scheduleSummary;

  // ── 결혼 기본 정보 ─────────────────────────────────
  const weddingLines: string[] = [];
  if (ws?.wedding_date) {
    const dateStr = formatKoDate(ws.wedding_date);
    const dday = daysUntil(ws.wedding_date);
    if (dateStr && dday !== null) {
      const ddayLabel = dday > 0 ? `D-${dday}` : dday === 0 ? "오늘" : `D+${-dday}`;
      weddingLines.push(`결혼식: ${dateStr} (${ddayLabel})`);
    }
  }
  if (ws?.wedding_region) weddingLines.push(`지역: ${ws.wedding_region}`);
  if (ws?.wedding_style) {
    const label = STYLE_LABEL[ws.wedding_style] ?? ws.wedding_style;
    weddingLines.push(`스타일: ${label}`);
  }
  if (ws?.planning_stage && STAGE_LABEL[ws.planning_stage]) {
    weddingLines.push(`준비 단계: ${STAGE_LABEL[ws.planning_stage]}`);
  }
  if (ws?.partner_name) weddingLines.push(`파트너: ${ws.partner_name}님`);
  if (ws?.excluded_categories && ws.excluded_categories.length > 0) {
    weddingLines.push(`제외 카테고리: ${ws.excluded_categories.join(", ")}`);
  }
  if (weddingLines.length > 0) {
    lines.push("[사용자 결혼 정보]");
    lines.push(...weddingLines.map((l) => `- ${l}`));
  }

  // ── 예산 현황 ──────────────────────────────────────
  const budgetLines: string[] = [];
  if (bs?.total_budget) {
    budgetLines.push(`총 예산: ${(bs.total_budget / 10000).toLocaleString()}만원`);
  }
  if (bs?.guest_count) {
    budgetLines.push(`예상 하객: ${bs.guest_count}명`);
  }
  if (sum && bs?.total_budget) {
    const usedPct = Math.round((sum.totalSpent / bs.total_budget) * 100);
    budgetLines.push(
      `사용: ${(sum.totalSpent / 10000).toLocaleString()}만원 (${usedPct}%) · 남은: ${(sum.remaining / 10000).toLocaleString()}만원`,
    );
  }
  if (budgetLines.length > 0) {
    lines.push("");
    lines.push("[예산 현황]");
    lines.push(...budgetLines.map((l) => `- ${l}`));
  }

  // ── 진행 상황 ──────────────────────────────────────
  const scheduleLines: string[] = [];
  if (sch && sch.total > 0) {
    const pct = Math.round((sch.completed / sch.total) * 100);
    scheduleLines.push(`체크리스트: ${sch.completed}/${sch.total}개 완료 (${pct}%)`);
  }
  if (sch?.nextUpcoming) {
    const { title, daysAway } = sch.nextUpcoming;
    const label = daysAway === 0 ? "오늘" : daysAway > 0 ? `D-${daysAway}` : `${-daysAway}일 지남`;
    scheduleLines.push(`다음 일정: "${title}" (${label})`);
  }
  if (scheduleLines.length > 0) {
    lines.push("");
    lines.push("[진행 상황]");
    lines.push(...scheduleLines.map((l) => `- ${l}`));
  }

  if (lines.length === 0) return null;

  // 시스템 가이드: LLM이 위 정보를 자연스럽게 활용하도록.
  lines.unshift(
    "[사용자 컨텍스트 — 답변 시 자연스럽게 활용해주세요. D-day·예산·지역·스타일에 맞춰 구체적인 조언을 제공하되, 사용자가 묻지 않은 정보는 굳이 나열하지 마세요.]",
    "",
  );
  return lines.join("\n");
};
