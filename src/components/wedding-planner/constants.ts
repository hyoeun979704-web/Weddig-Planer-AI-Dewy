export const REGIONS = [
  "서울 강남/서초",
  "서울 마포/홍대",
  "서울 종로/중구",
  "서울 기타",
  "경기 (수원/성남/고양/용인/화성 등)",
  "인천",
  "부산",
  "대구",
  "광주",
  "대전",
  "울산",
  "세종",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
] as const;

export const BUDGET_OPTIONS_VENUE = [
  "500만원 이하",
  "500만~1,000만원",
  "1,000만~2,000만원",
  "2,000만~3,000만원",
  "3,000만원 이상",
] as const;

export const WEDDING_STYLES = [
  "호텔 웨딩",
  "컨벤션홀",
  "하우스웨딩",
  "야외 가든",
  "채플",
  "스몰웨딩 (50인 이하)",
] as const;

export const BUDGET_OPTIONS_SDME = [
  "200만원 이하",
  "200~350만원",
  "350~500만원",
  "500~700만원",
  "700만원 이상",
] as const;

export const TIME_OPTIONS = Array.from({ length: 17 }, (_, i) => {
  const hour = Math.floor(i / 2) + 10;
  const min = i % 2 === 0 ? "00" : "30";
  return `${hour}:${min}`;
});

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isHtml?: boolean;
};
