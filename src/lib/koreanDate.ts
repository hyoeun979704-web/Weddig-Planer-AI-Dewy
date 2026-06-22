import { parseLocalDate } from "@/lib/schedule";

// 한국어 자연어 날짜 입력 파서. 체크리스트/일정 추가 시 "다음 주 토요일", "결혼 3개월 전",
// "D-30" 같은 표현을 YYYY-MM-DD 로 변환한다. 인식 실패 시 null 을 돌려 호출부가 직접
// 입력(달력)을 유지하게 한다(추측 금지 — 모호하면 채우지 않음).

const WEEKDAYS: Record<string, number> = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };

const toYmd = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const addDays = (base: Date, days: number): Date => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
};

const addMonths = (base: Date, months: number): Date => {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d;
};

export interface ParseKoreanDateOptions {
  /** 결혼식 날짜(YYYY-MM-DD) — "결혼 N개월 전", "D-30" 같은 식장 기준 표현에 필요. */
  weddingDate?: string | null;
  /** 기준 오늘(테스트 주입용). 미지정 시 실제 오늘(로컬 자정). */
  today?: Date;
}

/**
 * 한국어 자연어 날짜 → "YYYY-MM-DD". 인식 못 하면 null.
 * 지원: 오늘/내일/모레/글피 · N일·주·개월 후(뒤)/전 · 이번/다음/다다음 주 X요일 ·
 *       (요일만 단독은 다음 도래) · 이번/다음 달 N일 · M월 D일(지났으면 내년) ·
 *       결혼 N개월·주·일 전/후 · D-N / D+N(식장 기준) · 이미 YYYY-MM-DD 면 그대로.
 */
export function parseKoreanDate(raw: string, opts: ParseKoreanDateOptions = {}): string | null {
  const input = (raw ?? "").trim();
  if (!input) return null;

  const today = opts.today ? new Date(opts.today) : new Date();
  today.setHours(0, 0, 0, 0);

  // 0) 이미 ISO(YYYY-MM-DD).
  const iso = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return isNaN(d.getTime()) ? null : toYmd(d);
  }

  // 1) 오늘/내일/모레/글피.
  if (input === "오늘") return toYmd(today);
  if (input === "내일") return toYmd(addDays(today, 1));
  if (input === "모레") return toYmd(addDays(today, 2));
  if (input === "글피") return toYmd(addDays(today, 3));

  // 2) D-N / D+N (식장 기준).
  const dday = input.match(/^[dD]\s*([-+])\s*(\d+)$/);
  if (dday && opts.weddingDate) {
    const w = parseLocalDate(opts.weddingDate);
    const n = Number(dday[2]);
    return toYmd(addDays(w, dday[1] === "-" ? -n : n));
  }

  // 3) 결혼/예식 N개월·주·일 전/후 (식장 기준).
  const wedRel = input.match(/^(?:결혼(?:식)?|예식)\s*(\d+)\s*(개월|달|주|일)\s*(전|후)$/);
  if (wedRel && opts.weddingDate) {
    const w = parseLocalDate(opts.weddingDate);
    const n = Number(wedRel[1]);
    const dir = wedRel[3] === "전" ? -1 : 1;
    if (wedRel[2] === "개월" || wedRel[2] === "달") return toYmd(addMonths(w, dir * n));
    if (wedRel[2] === "주") return toYmd(addDays(w, dir * n * 7));
    return toYmd(addDays(w, dir * n));
  }

  // 4) N일·주·개월 후(뒤)/전 (오늘 기준).
  const rel = input.match(/^(\d+)\s*(개월|달|주|일)\s*(후|뒤|전)$/);
  if (rel) {
    const n = Number(rel[1]);
    const dir = rel[3] === "전" ? -1 : 1;
    if (rel[2] === "개월" || rel[2] === "달") return toYmd(addMonths(today, dir * n));
    if (rel[2] === "주") return toYmd(addDays(today, dir * n * 7));
    return toYmd(addDays(today, dir * n));
  }

  // 5) (이번/다음/다다음) 주 X요일. prefix 없는 단독 요일은 '다음 도래'로.
  const wk = input.match(/^(이번|다음|담|다다음)?\s*주?\s*([일월화수목금토])요일$/);
  if (wk) {
    const target = WEEKDAYS[wk[2]];
    const cur = today.getDay();
    let weekOffset = 0;
    if (wk[1] === "다음" || wk[1] === "담") weekOffset = 1;
    else if (wk[1] === "다다음") weekOffset = 2;
    let diff = target - cur + weekOffset * 7;
    if (!wk[1] && diff <= 0) diff += 7; // 단독 요일 → 가장 가까운 미래.
    return toYmd(addDays(today, diff));
  }

  // 6) (이번/다음) 달 N일.
  const monthDay = input.match(/^(이번|다음|담)\s*달\s*(\d{1,2})\s*일$/);
  if (monthDay) {
    const base = addMonths(today, monthDay[1] === "이번" ? 0 : 1);
    const d = new Date(base.getFullYear(), base.getMonth(), Number(monthDay[2]));
    return toYmd(d);
  }

  // 7) M월 D일 (올해 기준, 이미 지났으면 내년).
  const md = input.match(/^(\d{1,2})\s*월\s*(\d{1,2})\s*일$/);
  if (md) {
    const m = Number(md[1]) - 1;
    const day = Number(md[2]);
    const year = today.getFullYear();
    let d = new Date(year, m, day);
    if (d < today) d = new Date(year + 1, m, day);
    return toYmd(d);
  }

  return null;
}
