/**
 * 드레스 피팅 필터 정의 (10축, 중요도 순)
 *
 * 각 축은 신부의 의사결정 흐름을 반영한 우선순위로 정렬되어 있다.
 * - 형태축(실루엣·네크라인·슬리브·길이·백·허리): 일러스트 아이콘 사용
 * - 컨텐츠축(소재·디테일·컬러·무드): 색상 칩 또는 마네킹 샘플 썸네일
 *
 * icon 경로는 /public/dress-filters/ 하위에 PNG/SVG 파일이 있다고 가정.
 * 일러스트가 없을 경우 텍스트만 표시되도록 UI에서 fallback 처리.
 */

export type FilterType = "single" | "multi";

export interface FilterOption {
  /** DB에 저장되는 값 (UPPER_SNAKE_CASE) */
  value: string;
  /** UI 표시 라벨 (한글) */
  label: string;
  /** /public/dress-filters/ 기준 상대 경로 (없을 수 있음) */
  icon?: string;
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
      { value: "A_LINE", label: "A라인", icon: "/dress-filters/silhouette-a-line.png" },
      { value: "MERMAID", label: "머메이드", icon: "/dress-filters/silhouette-mermaid.png" },
      { value: "BALL", label: "볼 가운", icon: "/dress-filters/silhouette-ball.png" },
      { value: "EMPIRE", label: "엠파이어", icon: "/dress-filters/silhouette-empire.png" },
      { value: "SHEATH", label: "시스 (직선)", icon: "/dress-filters/silhouette-sheath.png" },
      { value: "TRUMPET", label: "트럼펫", icon: "/dress-filters/silhouette-trumpet.png" },
    ],
  },
  {
    key: "neckline",
    label: "2. 네크라인",
    importance: 2,
    type: "single",
    defaultExpanded: true,
    options: [
      { value: "V", label: "V넥", icon: "/dress-filters/neckline-v.png" },
      { value: "SWEETHEART", label: "스위트하트", icon: "/dress-filters/neckline-sweetheart.png" },
      { value: "OFF_SHOULDER", label: "오프숄더", icon: "/dress-filters/neckline-off-shoulder.png" },
      { value: "HALTER", label: "홀터", icon: "/dress-filters/neckline-halter.png" },
      { value: "BOAT", label: "보트넥", icon: "/dress-filters/neckline-boat.png" },
      { value: "SQUARE", label: "스퀘어", icon: "/dress-filters/neckline-square.png" },
      { value: "ILLUSION", label: "일루전", icon: "/dress-filters/neckline-illusion.png" },
    ],
  },
  {
    key: "sleeve",
    label: "3. 슬리브",
    importance: 3,
    type: "single",
    defaultExpanded: true,
    options: [
      { value: "SLEEVELESS", label: "민소매", icon: "/dress-filters/sleeve-sleeveless.png" },
      { value: "CAP", label: "캡 슬리브", icon: "/dress-filters/sleeve-cap.png" },
      { value: "SHORT", label: "짧은 소매", icon: "/dress-filters/sleeve-short.png" },
      { value: "LONG", label: "긴 소매", icon: "/dress-filters/sleeve-long.png" },
      { value: "OFF_SHOULDER", label: "오프숄더 슬리브", icon: "/dress-filters/sleeve-off-shoulder.png" },
      { value: "CAPE", label: "케이프", icon: "/dress-filters/sleeve-cape.png" },
    ],
  },
  {
    key: "length",
    label: "4. 길이·트레인",
    importance: 4,
    type: "single",
    defaultExpanded: false,
    options: [
      { value: "MINI", label: "미니", icon: "/dress-filters/length-mini.png" },
      { value: "MIDI", label: "미디", icon: "/dress-filters/length-midi.png" },
      { value: "FULL", label: "발목 길이", icon: "/dress-filters/length-full.png" },
      { value: "SHORT_TRAIN", label: "숏 트레인 (1m)", icon: "/dress-filters/length-short-train.png" },
      { value: "CHAPEL", label: "채플 (1.5m)", icon: "/dress-filters/length-chapel.png" },
      { value: "CATHEDRAL", label: "캐서드럴 (3m+)", icon: "/dress-filters/length-cathedral.png" },
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
      { value: "CLOSED", label: "클로즈드", icon: "/dress-filters/back-closed.png" },
      { value: "ILLUSION", label: "일루전 백", icon: "/dress-filters/back-illusion.png" },
      { value: "OPEN", label: "오픈 백", icon: "/dress-filters/back-open.png" },
      { value: "KEYHOLE", label: "키홀", icon: "/dress-filters/back-keyhole.png" },
      { value: "V_BACK", label: "V 백", icon: "/dress-filters/back-v.png" },
      { value: "CORSET", label: "코르셋", icon: "/dress-filters/back-corset.png" },
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
    ],
  },
  {
    key: "waist",
    label: "9. 허리 라인",
    importance: 9,
    type: "single",
    defaultExpanded: false,
    options: [
      { value: "NATURAL", label: "자연 허리", icon: "/dress-filters/waist-natural.png" },
      { value: "EMPIRE", label: "엠파이어 (가슴 아래)", icon: "/dress-filters/waist-empire.png" },
      { value: "DROPPED", label: "드롭 웨이스트", icon: "/dress-filters/waist-dropped.png" },
      { value: "NONE", label: "벨트 없음", icon: "/dress-filters/waist-none.png" },
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
