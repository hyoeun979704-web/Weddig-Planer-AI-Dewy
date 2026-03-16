export const VENDOR_CATEGORIES = [
  "웨딩홀",
  "스드메",
  "한복",
  "예복",
  "허니문",
  "혼수",
  "청첩장",
  "웨딩플래너",
] as const;

export type VendorCategory = (typeof VENDOR_CATEGORIES)[number];

export const ADVANTAGE_EMOJI_PRESETS = [
  '⭐', '💍', '📸', '🌸', '🎊', '🍽️',
  '🚗', '💐', '✨', '🎵', '🏆', '💎',
] as const;

export const VENDOR_VERIFICATION_STATUS = {
  pending:  { label: '검토 중',  className: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: '승인 완료', className: 'bg-green-50 text-green-700 border-green-200' },
  rejected: { label: '승인 거절', className: 'bg-red-50 text-red-700 border-red-200' },
} as const;
