export const STORE_CATEGORIES = [
  { value: "photo_props", label: "촬영소품" },
  { value: "bouquet", label: "부케 & 부토니에" },
  { value: "self_wedding_dress", label: "셀프웨딩 드레스" },
  { value: "second_dress", label: "2부 드레스" },
  { value: "wedding_shoes", label: "웨딩슈즈" },
  { value: "accessories", label: "액세서리" },
  { value: "frame", label: "액자" },
  { value: "album", label: "앨범 & 포토북" },
  { value: "paper_invitation", label: "종이 청첩장" },
  { value: "return_gift", label: "답례품" },
] as const;

export type StoreCategoryValue = (typeof STORE_CATEGORIES)[number]["value"];

export const PRODUCT_SOURCES = [
  { value: "naver", label: "네이버" },
  { value: "coupang", label: "쿠팡" },
  { value: "manual", label: "직접 등록" },
] as const;

export type ProductSource = (typeof PRODUCT_SOURCES)[number]["value"];

export const getCategoryLabel = (value: string): string =>
  STORE_CATEGORIES.find((c) => c.value === value)?.label ?? value;

export const getSourceLabel = (value: string): string =>
  PRODUCT_SOURCES.find((s) => s.value === value)?.label ?? value;
