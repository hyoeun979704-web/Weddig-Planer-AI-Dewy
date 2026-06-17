// 기업회원 업체정보 등록 완성도 — #318 Phase 1(D). 채워진 핵심 필드 비율 + 미충족 항목.
//
// 큐레이션 정렬이 places.data_completeness 를 쓰므로(추천 노출↑), 사업자에게 "무엇을 더
// 채우면 노출이 오르는지" 진척바·체크리스트로 보여 자발적 완성도를 높인다. 순수 함수(테스트 고정).

export interface ListingFields {
  name: string;
  description: string;
  city: string;
  district: string;
  imageUrl: string;
  minPrice: string;
  tags: string; // 쉼표 구분 원문
  inquiryChannel: "chat" | "url" | "phone";
  inquiryUrl: string;
  inquiryPhone: string;
}

export interface CompletenessItem {
  key: string;
  label: string;
  done: boolean;
}

export interface Completeness {
  percent: number; // 0~100
  doneCount: number;
  total: number;
  items: CompletenessItem[];
  /** 미충족 항목(노출↑ 유도용). */
  missing: CompletenessItem[];
}

const nonEmpty = (v: string) => !!v && v.trim().length > 0;

/** 문의 채널이 실제로 동작 가능하게 설정됐는지(앱채팅=항상 OK, url/phone=값 필요). */
function inquiryConfigured(f: ListingFields): boolean {
  if (f.inquiryChannel === "chat") return true;
  if (f.inquiryChannel === "url") return /^https?:\/\//.test(f.inquiryUrl.trim());
  if (f.inquiryChannel === "phone") return nonEmpty(f.inquiryPhone);
  return false;
}

export function computeListingCompleteness(f: ListingFields): Completeness {
  const items: CompletenessItem[] = [
    { key: "name", label: "업체명", done: nonEmpty(f.name) },
    { key: "image", label: "대표 이미지", done: nonEmpty(f.imageUrl) },
    { key: "description", label: "소개글", done: nonEmpty(f.description) },
    { key: "region", label: "지역(시/도·구/군)", done: nonEmpty(f.city) || nonEmpty(f.district) },
    { key: "price", label: "최소 가격", done: nonEmpty(f.minPrice) },
    { key: "tags", label: "키워드", done: f.tags.split(",").map((t) => t.trim()).filter(Boolean).length > 0 },
    { key: "inquiry", label: "문의 받는 방법", done: inquiryConfigured(f) },
  ];
  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;
  return {
    percent: total === 0 ? 0 : Math.round((doneCount / total) * 100),
    doneCount,
    total,
    items,
    missing: items.filter((i) => !i.done),
  };
}
