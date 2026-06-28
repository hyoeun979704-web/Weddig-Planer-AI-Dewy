// 1:1 문의 카테고리 단일 소스 — Contact(접수)·MyInquiries(내역)·AdminInquiries(운영)
// 가 공유한다. value 는 DB(inquiries.category) 매칭 값 — 변경 금지(label 만 수정).
export const INQUIRY_CATEGORIES = [
  { value: "reservation", label: "예약 문의" },
  { value: "payment", label: "결제 문의" },
  { value: "cancel", label: "취소/환불 문의" },
  { value: "service", label: "서비스 이용 문의" },
  { value: "partnership", label: "제휴/입점 문의" },
  { value: "complaint", label: "불편/오류 신고" },
  { value: "other", label: "기타 문의" },
] as const;

export type InquiryCategory = typeof INQUIRY_CATEGORIES[number]["value"];

export const inquiryCategoryLabel = (value: string): string =>
  INQUIRY_CATEGORIES.find((c) => c.value === value)?.label ?? value;
