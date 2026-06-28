/**
 * 드레스 피팅 필터 정의 (10축, 중요도 순)
 *
 * 각 축은 신부의 의사결정 흐름을 반영한 우선순위로 정렬되어 있다.
 * - 형태축(실루엣·네크라인·슬리브·길이·백·허리): 라벨 텍스트 표시
 * - 컨텐츠축(소재·디테일·컬러·무드): 색상 칩(swatch) 또는 설명
 *
 * 참고: 이전에 각 옵션에 `icon: "/dress-filters/*.png"` 경로가 있었으나 해당
 * 에셋이 존재하지 않고(미렌더) 404 잠복 위험이라 제거했다. 일러스트를 도입하려면
 * public/dress-filters/ 에 에셋을 추가하면서 icon 필드 + onError fallback 렌더를
 * 함께 넣을 것(에셋 없이 경로만 박지 말 것).
 */

export type FilterType = "single" | "multi";

export interface FilterOption {
  /** DB에 저장되는 값 (UPPER_SNAKE_CASE) */
  value: string;
  /** UI 표시 라벨 (한글) */
  label: string;
  /** 색상 칩용 hex (color 축 전용) */
  swatch?: string;
  /** 옵션 부가 설명 (툴팁용) */
  description?: string;
}

export interface FilterAxis {
  /** DB 컬럼명과 동일 */
  key:
    | "silhouette"
    | "neckline"
    | "sleeve"
    | "length"
    | "fabric"
    | "details"
    | "back_design"
    | "color"
    | "waist"
    | "mood";
  /** UI 표시 라벨 */
  label: string;
  /** 중요도 (1=가장 결정적, 10=참고용) */
  importance: number;
  /** single: 단일 선택, multi: 복수 선택 */
  type: FilterType;
  /** 첫 진입 시 펼침 여부 */
  defaultExpanded: boolean;
  /** 옵션 목록 */
  options: FilterOption[];
}

export const DRESS_FILTERS: FilterAxis[] = [
  {
    key: "silhouette",
    label: "1. 실루엣",
    importance: 1,
    type: "single",
    defaultExpanded: true,
    options: [
      { value: "FIT_AND_FLARE", label: "핏앤플레어" },
      { value: "COLUMN", label: "컬럼" },
      { value: "A_LINE", label: "A라인" },
      { value: "SHEATH", label: "시스" },
      { value: "MERMAID", label: "머메이드" },
      { value: "TRUMPET", label: "트럼펫" },
      { value: "TAPERED", label: "테이퍼드" },
      { value: "BALL_GOWN", label: "볼가운" },
      { value: "DROP_WAIST", label: "드롭웨이스트" },
    ],
  },
  {
    key: "neckline",
    label: "2. 네크라인",
    importance: 2,
    type: "single",
    defaultExpanded: true,
    options: [
      { value: "V", label: "V넥" },
      { value: "SWEETHEART", label: "스위트하트" },
      { value: "OFF_SHOULDER", label: "오프숄더" },
      { value: "HALTER", label: "홀터" },
      { value: "BOAT", label: "보트넥" },
      { value: "SQUARE", label: "스퀘어" },
      { value: "ILLUSION", label: "일루전" },
    ],
  },
  {
    key: "sleeve",
    label: "3. 슬리브",
    importance: 3,
    type: "single",
    defaultExpanded: true,
    options: [
      { value: "SLEEVELESS", label: "민소매" },
      { value: "TANK", label: "탑" },
      { value: "CAP", label: "캡 슬리브" },
      { value: "SHORT", label: "짧은 소매" },
      { value: "LONG", label: "긴 소매" },
      { value: "OFF_SHOULDER", label: "오프숄더 슬리브" },
      { value: "CAPE", label: "케이프" },
    ],
  },
  {
    key: "length",
    label: "4. 길이·트레인",
    importance: 4,
    type: "single",
    defaultExpanded: false,
    options: [
      { value: "MINI", label: "미니" },
      { value: "MIDI", label: "미디" },
      { value: "FULL", label: "발목 길이" },
      { value: "SHORT_TRAIN", label: "숏 트레인 (1m)" },
      { value: "CHAPEL", label: "채플 (1.5m)" },
      { value: "CATHEDRAL", label: "캐서드럴 (3m+)" },
    ],
  },
  {
    key: "fabric",
    label: "5. 소재",
    importance: 5,
    type: "single",
    defaultExpanded: false,
    options: [
      { value: "SILK", label: "실크/새틴", description: "광택 있고 매끄러운 질감" },
      { value: "LACE", label: "레이스", description: "섬세한 패턴, 클래식한 무드" },
      { value: "TULLE", label: "튤", description: "부드럽고 풍성한 망사" },
      { value: "CHIFFON", label: "시폰", description: "가볍고 흐르는 듯한 질감" },
      { value: "ORGANZA", label: "오간자", description: "빳빳하고 비치는 질감" },
      { value: "MIKADO", label: "미카도", description: "두껍고 구조적인 질감" },
    ],
  },
  {
    key: "details",
    label: "6. 디테일",
    importance: 6,
    type: "multi",
    defaultExpanded: false,
    options: [
      { value: "MINIMAL", label: "미니멀", description: "장식 없이 깔끔" },
      { value: "LACE", label: "레이스 디테일" },
      { value: "BEADING", label: "비즈 장식" },
      { value: "EMBROIDERY", label: "자수" },
      { value: "FLORAL", label: "플라워" },
      { value: "HANDWORK", label: "핸드워크" },
    ],
  },
  {
    key: "back_design",
    label: "7. 백 디자인",
    importance: 7,
    type: "single",
    defaultExpanded: false,
    options: [
      { value: "CLOSED", label: "클로즈드" },
      { value: "ILLUSION", label: "일루전 백" },
      { value: "OPEN", label: "오픈 백" },
      { value: "KEYHOLE", label: "키홀" },
      { value: "V_BACK", label: "V 백" },
      { value: "CORSET", label: "코르셋" },
    ],
  },
  {
    key: "color",
    label: "8. 컬러",
    importance: 8,
    type: "single",
    defaultExpanded: false,
    options: [
      { value: "PURE_WHITE", label: "퓨어 화이트", swatch: "#FFFFFF" },
      { value: "IVORY", label: "아이보리", swatch: "#FFFFF0" },
      { value: "BLUSH", label: "블러시 핑크", swatch: "#FFE4E1" },
      { value: "CHAMPAGNE", label: "샴페인", swatch: "#F7E7CE" },
      { value: "NUDE", label: "누드", swatch: "#E8C9A0" },
      { value: "PINK", label: "핑크", swatch: "#FFB6C1" },
      { value: "LAVENDER", label: "라벤더", swatch: "#E6E6FA" },
      { value: "BLUE", label: "블루", swatch: "#ADD8E6" },
      { value: "MINT", label: "민트", swatch: "#B5EAD7" },
      { value: "SAGE", label: "세이지 그린", swatch: "#A9C9A4" },
      { value: "YELLOW", label: "옐로우", swatch: "#FFF1A8" },
      { value: "GRAY", label: "그레이", swatch: "#C0C0C0" },
      { value: "RED", label: "레드", swatch: "#B22222" },
      { value: "BLACK", label: "블랙", swatch: "#2C2C2C" },
    ],
  },
  {
    key: "waist",
    label: "9. 허리 절개선",
    importance: 9,
    type: "single",
    defaultExpanded: false,
    options: [
      { value: "NONE", label: "절개라인 없음" },
      { value: "EMPIRE", label: "엠파이어 (가슴 아래)" },
      { value: "HIGH", label: "하이 웨이스트" },
      { value: "NATURAL", label: "내추럴 (자연 허리선)" },
      { value: "DROPPED", label: "드롭 웨이스트" },
      { value: "BASQUE", label: "바스크 (V형)" },
    ],
  },
  {
    key: "mood",
    label: "10. 무드",
    importance: 10,
    type: "multi",
    defaultExpanded: false,
    options: [
      { value: "CLASSIC", label: "클래식", description: "전통적·격식 있음" },
      { value: "MODERN", label: "모던", description: "심플·세련됨" },
      { value: "BOHEMIAN", label: "보헤미안", description: "자유로움·러프함" },
      { value: "VINTAGE", label: "빈티지", description: "고풍스러움" },
      { value: "MINIMAL", label: "미니멀", description: "장식 최소" },
      { value: "ROMANTIC", label: "로맨틱", description: "여성스러움·드라마틱" },
    ],
  },
];

/** 필터 키별 빠른 조회용 맵 */
export const DRESS_FILTERS_BY_KEY: Record<FilterAxis["key"], FilterAxis> =
  DRESS_FILTERS.reduce((acc, f) => {
    acc[f.key] = f;
    return acc;
  }, {} as Record<FilterAxis["key"], FilterAxis>);

/** 옵션 value → label 변환 (DB 값을 한글로 표시할 때) */
export const labelOf = (
  axisKey: FilterAxis["key"],
  value: string | null | undefined,
): string => {
  if (!value) return "";
  const axis = DRESS_FILTERS_BY_KEY[axisKey];
  if (!axis) return value;
  const opt = axis.options.find((o) => o.value === value);
  return opt?.label ?? value;
};
