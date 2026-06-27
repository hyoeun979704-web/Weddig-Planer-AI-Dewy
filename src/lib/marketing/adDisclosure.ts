// 제휴업체 마케팅(페르소나 소개형 광고)의 "광고 표기 강제" 단일 소스.
// 한국 표시·광고의 공정화에 관한 법률 + 공정위 추천·보증 심사지침(이른바 '뒷광고') 준수:
// 경제적 이해관계가 있는 추천 콘텐츠는 '광고/제휴'임을 명확·눈에 띄게 고지해야 한다.
// 생성 단계에서 끄기 불가로 강제한다 — 모든 생성 마케팅 산출물(캡션·해시태그·카드 라벨)은
// ensureAdDisclosure 를 통과해야 한다. (회귀 방지: 광고인데 표기 누락 = 법적 리스크)
//
// 상세 기획: docs/260624_console_structure_analysis.md §3-A.

export const AD_DISCLOSURE_LABEL = "광고";
export const AD_DISCLOSURE_NOTICE = "본 콘텐츠는 제휴업체와 함께하는 유료 광고입니다.";
export const AD_DISCLOSURE_HASHTAGS = ["#광고", "#제휴"] as const;

// "#태그"/"태그"/" ##태그 " → "#태그". 빈 값은 "".
const normalizeTag = (t: string): string => {
  const body = t.trim().replace(/^#+/, "").trim();
  return body ? `#${body}` : "";
};

// 캡션에 이미 광고 고지가 있는지(중복 추가 방지). '제휴'만으로는 부족 — '광고/협찬/유료광고'를 본다.
const hasAdNotice = (caption: string): boolean =>
  /\[?\s*광고\s*\]?|협찬|유료\s*광고/.test(caption);

// 해시태그에 광고 표기(#광고·#제휴)를 보장. 정규화·중복제거 후 맨 앞에 배치(눈에 띄게).
export const withDisclosureHashtags = (hashtags: readonly string[] = []): string[] => {
  const normalized = hashtags.map(normalizeTag).filter(Boolean);
  const seen = new Set(normalized.map((t) => t.toLowerCase()));
  const missing = AD_DISCLOSURE_HASHTAGS.filter((t) => !seen.has(t.toLowerCase()));
  // 중복 제거(입력에 #광고 가 이미 있으면 그대로 두되 한 번만).
  const deduped: string[] = [];
  const out = new Set<string>();
  for (const t of [...missing, ...normalized]) {
    const key = t.toLowerCase();
    if (out.has(key)) continue;
    out.add(key);
    deduped.push(t);
  }
  return deduped;
};

// 캡션에 광고 고지 문구를 보장(이미 광고/협찬/유료광고 고지가 있으면 그대로).
export const withDisclosureCaption = (caption = ""): string => {
  if (hasAdNotice(caption)) return caption;
  const body = caption.trim();
  return body ? `${body}\n\n${AD_DISCLOSURE_NOTICE}` : AD_DISCLOSURE_NOTICE;
};

export interface DisclosedContent {
  caption: string;
  hashtags: string[];
  label: string | null; // 카드 내 시각 라벨(광고일 때 '광고', 정보성이면 null)
}

// 생성 산출물에 광고 표기를 강제 적용. 단독 업체 광고(vendor_ad)일 때만 호출한다.
export const ensureAdDisclosure = (input: {
  caption?: string;
  hashtags?: readonly string[];
}): DisclosedContent => ({
  caption: withDisclosureCaption(input.caption),
  hashtags: withDisclosureHashtags(input.hashtags),
  label: AD_DISCLOSURE_LABEL,
});

// 마케팅 콘텐츠 종류.
//  - "vendor_ad": 단독 업체 광고(유료·제휴 = 경제적 이해관계 있음) → 광고 표기 강제.
//  - "editorial": 정보성·큐레이션 등 이해관계 없는 콘텐츠 → 광고 아님(표기 안 함).
export type MarketingContentKind = "vendor_ad" | "editorial";

// 광고 표기 필요 여부 — 경제적 이해관계가 있는 단독 업체 광고에만 필요.
// 주의(법적 안전장치): 표기 의무 기준은 '경제적 이해관계'다. 정보성처럼 보여도 대가·제휴가
// 있으면 vendor_ad 로 분류해야 한다(공정위 추천보증 지침 — '뒷광고' 회피 금지).
export const requiresAdDisclosure = (kind: MarketingContentKind): boolean =>
  kind === "vendor_ad";

// 콘텐츠 종류에 따라 광고 표기를 적용한다. vendor_ad 만 강제, editorial 은 원본 유지(label=null).
export const applyDisclosure = (
  kind: MarketingContentKind,
  input: { caption?: string; hashtags?: readonly string[] },
): DisclosedContent =>
  requiresAdDisclosure(kind)
    ? ensureAdDisclosure(input)
    : { caption: input.caption ?? "", hashtags: [...(input.hashtags ?? [])], label: null };
