// Budget-specific number formatters. Centralized so a future locale/unit
// change (e.g. supporting 원 base instead of 만원) only touches one place.

/** Formats a 만원 amount with thousand separators (e.g. 1234 → "1,234"). */
export const fmt = (n: number): string => n.toLocaleString();

/** Converts a 만원 amount to its 원 equivalent for inline preview text. */
export const manwonToWon = (manwon: number): number => Math.round(manwon * 10000);

/** Inline "= 12,340,000원" preview used under amount inputs. */
export const wonPreview = (manwon: number): string => manwonToWon(manwon).toLocaleString();
