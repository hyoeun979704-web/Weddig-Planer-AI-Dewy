// Budget-specific number formatters. Centralized so a future locale/unit
// change (e.g. supporting 원 base instead of 만원) only touches one place.

/** Formats a 만원 amount with thousand separators (e.g. 1234 → "1,234"). */
export const fmt = (n: number): string => n.toLocaleString();

/** Converts a 만원 amount to its 원 equivalent for inline preview text. */
export const manwonToWon = (manwon: number): number => Math.round(manwon * 10000);

/** Inline "= 12,340,000원" preview used under amount inputs. */
export const wonPreview = (manwon: number): string => manwonToWon(manwon).toLocaleString();

/**
 * 예산 도메인 금액의 사람 표기 — budget_settings.total_budget / budget_items.amount 는
 * **만원 단위로 저장**된다(예: 1500 = 1,500만원). 챗봇이 이를 "1,500원"으로 표기한
 * 회귀(260612)가 있어 표기를 이 함수로 단일화한다.
 *   formatBudgetAmount(1500)  → "1,500만원"
 *   formatBudgetAmount(128.5) → "128.5만원"   (소수 입력 보존, 1자리까지)
 *   formatBudgetAmount(12000) → "1억 2,000만원"
 *   formatBudgetAmount(0.5)   → "5,000원"
 */
export const formatBudgetAmount = (manwon: number): string => {
  const won = Math.round(manwon * 10000);
  if (won >= 100_000_000) {
    const eok = Math.floor(won / 100_000_000);
    const restMan = Math.round((won % 100_000_000) / 10000);
    return restMan > 0 ? `${eok}억 ${restMan.toLocaleString()}만원` : `${eok}억원`;
  }
  if (won > 0 && won < 10_000) return `${won.toLocaleString()}원`;
  const man = Math.round((won / 10000) * 10) / 10;
  return `${man.toLocaleString()}만원`;
};
