// 모달 폼 옵션들. label은 사용자에게 보이는 문자열,
// searchKey/max 는 핸들러가 DB 쿼리나 계산에 쓰는 안전한 값.
//
// label을 그대로 PostgREST .or() 필터에 넣으면 괄호·쉼표·슬래시 때문에
// 쿼리 grammar가 깨지거나 의도치 않은 매칭이 발생해서, 표시용/검색용을 분리.

export interface RegionOption {
  label: string;     // UI 표시용
  searchKey: string; // places.city / district ILIKE 검색용 (특수문자 없음)
}

export const REGIONS: RegionOption[] = [
  { label: "서울 강남/서초",                       searchKey: "강남" },
  { label: "서울 마포/홍대",                       searchKey: "마포" },
  { label: "서울 종로/중구",                       searchKey: "종로" },
  { label: "서울 기타",                            searchKey: "서울" },
  { label: "경기 (수원/성남/고양/용인/화성 등)",   searchKey: "경기" },
  { label: "인천",                                 searchKey: "인천" },
  { label: "부산",                                 searchKey: "부산" },
  { label: "대구",                                 searchKey: "대구" },
  { label: "광주",                                 searchKey: "광주" },
  { label: "대전",                                 searchKey: "대전" },
  { label: "울산",                                 searchKey: "울산" },
  { label: "세종",                                 searchKey: "세종" },
  { label: "강원",                                 searchKey: "강원" },
  { label: "충북",                                 searchKey: "충청북" },
  { label: "충남",                                 searchKey: "충청남" },
  { label: "전북",                                 searchKey: "전북" },
  { label: "전남",                                 searchKey: "전라남" },
  { label: "경북",                                 searchKey: "경상북" },
  { label: "경남",                                 searchKey: "경상남" },
  { label: "제주",                                 searchKey: "제주" },
];

export interface BudgetOption {
  label: string;
  /** 만원 단위 상한. null이면 상한 없음(예: "3,000만원 이상"). */
  max: number | null;
}

export const BUDGET_OPTIONS_VENUE: BudgetOption[] = [
  { label: "500만원 이하",       max: 500 },
  { label: "500만~1,000만원",    max: 1000 },
  { label: "1,000만~2,000만원",  max: 2000 },
  { label: "2,000만~3,000만원",  max: 3000 },
  { label: "3,000만원 이상",     max: null },
];

export const WEDDING_STYLES = [
  "호텔 웨딩",
  "컨벤션홀",
  "하우스웨딩",
  "야외 가든",
  "채플",
  "스몰웨딩 (50인 이하)",
] as const;

export const BUDGET_OPTIONS_SDME: BudgetOption[] = [
  { label: "200만원 이하",   max: 200 },
  { label: "200~350만원",    max: 350 },
  { label: "350~500만원",    max: 500 },
  { label: "500~700만원",    max: 700 },
  { label: "700만원 이상",   max: null },
];

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
