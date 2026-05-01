// 17개 시·도 라벨/풀네임/value 모두 매핑.
// DB의 places.city는 풀네임 ("충청남도", "제주특별자치도", "전북특별자치도" 등)으로 저장됨.
// 사용자의 wedding_region 또는 필터 칩은 짧은 라벨("충남", "제주") 또는
// value("충청남", "제주")로 들어올 수 있어 ILIKE 매칭이 깨지기 쉬움.
// 이 헬퍼는 어떤 형태든 ILIKE 매칭이 잘 되는 짧은 검색 키워드로 정규화.

export interface RegionEntry {
  value: string;     // ILIKE 검색용 짧은 키워드 (places.city 부분 매칭)
  label: string;     // 짧은 표시명 (사용자 친화)
  fullName: string;  // 행정 풀네임 (저장 시 사용)
}

export const REGIONS: RegionEntry[] = [
  { value: "서울특별시", label: "서울", fullName: "서울특별시" },
  { value: "경기도",     label: "경기", fullName: "경기도" },
  { value: "인천광역시", label: "인천", fullName: "인천광역시" },
  { value: "부산광역시", label: "부산", fullName: "부산광역시" },
  { value: "대구광역시", label: "대구", fullName: "대구광역시" },
  { value: "대전광역시", label: "대전", fullName: "대전광역시" },
  { value: "광주광역시", label: "광주", fullName: "광주광역시" },
  { value: "울산광역시", label: "울산", fullName: "울산광역시" },
  { value: "세종",       label: "세종", fullName: "세종특별자치시" },
  { value: "강원",       label: "강원", fullName: "강원특별자치도" },
  { value: "충청북",     label: "충북", fullName: "충청북도" },
  { value: "충청남",     label: "충남", fullName: "충청남도" },
  { value: "전북",       label: "전북", fullName: "전북특별자치도" },
  { value: "전라남",     label: "전남", fullName: "전라남도" },
  { value: "경상북",     label: "경북", fullName: "경상북도" },
  { value: "경상남",     label: "경남", fullName: "경상남도" },
  { value: "제주",       label: "제주", fullName: "제주특별자치도" },
];

/** 어떤 형태(label/value/fullName)로 들어와도 ILIKE 검색에 안전한 value로 정규화.
 *  매칭 실패 시 입력값 그대로 (빈 결과 / 자유 검색은 호출측에서 처리). */
export function normalizeRegion(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const hit = REGIONS.find(
    (r) => r.label === trimmed || r.value === trimmed || r.fullName === trimmed
  );
  return hit ? hit.value : trimmed;
}

/** value(또는 어떤 형태)를 사용자 표시용 label로. 매칭 실패 시 원본 그대로. */
export function regionLabel(input: string | null | undefined): string {
  if (!input) return "";
  const hit = REGIONS.find(
    (r) => r.label === input || r.value === input || r.fullName === input
  );
  return hit ? hit.label : input;
}
