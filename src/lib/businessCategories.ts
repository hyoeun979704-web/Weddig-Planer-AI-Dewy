// 기업회원 서비스 업종(service_category) 단일 소스 — 온보딩·운영자 전환 등에서 공용.
// value 는 business_profiles.service_category 에 저장되고, _biz_category_to_place 로
// places.category 에 매핑된다(대부분 동일, suit→tailor_shop). value 변경 금지(매칭 키).

export interface ServiceCategory {
  value: string;
  label: string;
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { value: "wedding_hall", label: "웨딩홀" },
  { value: "studio", label: "스드메 (스튜디오/드레스/메이크업)" },
  { value: "hanbok", label: "한복" },
  { value: "suit", label: "예복" },
  { value: "honeymoon", label: "허니문" },
  { value: "appliance", label: "혼수가전" },
  { value: "jewelry", label: "예물/예단" },
  { value: "invitation_venue", label: "청첩장 모임" },
  // 기타 — 본식DVD·스냅·네일·축가·부케 등(260612 신설 카테고리와 동일 slug)
  { value: "etc", label: "기타 (스냅·DVD·네일·축가 등)" },
];

export const serviceCategoryLabel = (value: string | null | undefined): string =>
  SERVICE_CATEGORIES.find((c) => c.value === value)?.label ?? (value ?? "");
