/**
 * 메이크업 시뮬레이션 필터 정의 (10축, 중요도 순)
 *
 * 신부 메이크업 의사결정 흐름:
 *   "어떤 무드 → 어떤 베이스(피부 마감) → 어떤 입술 → 어떤 눈 → 디테일"
 *
 * 드레스 필터와 동일한 schema(FilterAxis / FilterOption) 사용.
 * 같은 컴포넌트(FilterSheet)를 재활용할 수 있다.
 *
 * icon 경로는 /public/makeup-filters/ 하위 가정. 일러스트 없으면 텍스트만 표시.
 */

export type FilterType = "single" | "multi";

export interface FilterOption {
  value: string;
  label: string;
  icon?: string;
  swatch?: string;
  description?: string;
}

export interface MakeupFilterAxis {
  key:
    | "base_finish"
    | "lip_color"
    | "lip_finish"
    | "eye_style"
    | "eye_color"
    | "blush_color"
    | "blush_placement"
    | "brow_shape"
    | "contour_intensity"
    | "details"
    | "mood";
  label: string;
  importance: number;
  type: FilterType;
  defaultExpanded: boolean;
  options: FilterOption[];
}

export const MAKEUP_FILTERS: MakeupFilterAxis[] = [
  {
    key: "base_finish",
    label: "1. 베이스 마감",
    importance: 1,
    type: "single",
    defaultExpanded: true,
    options: [
      { value: "DEWY", label: "촉촉 글로우", description: "물광·생기 있는 피부" },
      { value: "GLOWY", label: "투명 글로우", description: "은은한 광·맑은 피부" },
      { value: "SATIN", label: "새틴", description: "매트와 글로우 중간 — 결혼식장 추천" },
      { value: "MATTE", label: "매트", description: "보송한 결, 유분 없음" },
      { value: "NATURAL_SKIN", label: "노메이크업 같은", description: "피부결 살리기" },
    ],
  },
  {
    key: "lip_color",
    label: "2. 립 컬러",
    importance: 2,
    type: "single",
    defaultExpanded: true,
    options: [
      { value: "MLBB", label: "MLBB", swatch: "#C68A7F", description: "내 입술보다 살짝 또렷한 톤" },
      { value: "NUDE", label: "뉴드", swatch: "#C7998D" },
      { value: "PEACH", label: "피치", swatch: "#E59A82" },
      { value: "CORAL", label: "코랄", swatch: "#E67860" },
      { value: "ROSE", label: "로즈", swatch: "#CD6A7C" },
      { value: "RED", label: "레드", swatch: "#B7333A" },
      { value: "BERRY", label: "베리", swatch: "#933E58" },
      { value: "MAUVE", label: "모브", swatch: "#A47086" },
    ],
  },
  {
    key: "lip_finish",
    label: "3. 립 마감",
    importance: 3,
    type: "single",
    defaultExpanded: true,
    options: [
      { value: "TINTED", label: "틴티드 블러", description: "내 입술처럼 스며드는 마감" },
      { value: "GLOSSY", label: "글로시", description: "윤기 있는 마감" },
      { value: "SATIN", label: "새틴", description: "은은한 광" },
      { value: "MATTE", label: "매트", description: "또렷한 발색, 광 없음" },
      { value: "BLURRED", label: "블러", description: "경계 흐릿하게" },
    ],
  },
  {
    key: "eye_style",
    label: "4. 아이 스타일",
    importance: 4,
    type: "single",
    defaultExpanded: true,
    options: [
      { value: "NATURAL", label: "내추럴", description: "데일리에서 본식까지 자연스럽게" },
      { value: "KOREAN_INNER", label: "이너 음영", description: "한국 신부 메이크업 시그니처" },
      { value: "BARE", label: "베어", description: "아이라인만 살짝" },
      { value: "DOLL", label: "도리 인형", description: "동그란 큰 눈" },
      { value: "CAT_EYE", label: "캣아이", description: "꼬리를 올린 또렷한 라인" },
      { value: "SMOKY", label: "스모키", description: "그라데이션 깊이감" },
      { value: "GLITTER", label: "글리터", description: "펄·반짝 포인트" },
    ],
  },
  {
    key: "eye_color",
    label: "5. 아이 컬러",
    importance: 5,
    type: "single",
    defaultExpanded: false,
    options: [
      { value: "NEUTRAL", label: "뉴트럴", swatch: "#B89380" },
      { value: "PEACH", label: "피치", swatch: "#E2A487" },
      { value: "ROSE_BROWN", label: "로즈브라운", swatch: "#A57368" },
      { value: "BROWN", label: "브라운", swatch: "#754C36" },
      { value: "BURGUNDY", label: "버건디", swatch: "#7A2E3A" },
      { value: "BRONZE", label: "브론즈", swatch: "#9C6F3D" },
      { value: "PLUM", label: "플럼", swatch: "#704863" },
    ],
  },
  {
    key: "blush_color",
    label: "6. 블러셔 컬러",
    importance: 6,
    type: "single",
    defaultExpanded: false,
    options: [
      { value: "PEACH", label: "피치", swatch: "#F3A98F" },
      { value: "PINK", label: "핑크", swatch: "#EFA0AE" },
      { value: "CORAL", label: "코랄", swatch: "#EF8C73" },
      { value: "ROSE", label: "로즈", swatch: "#D87C90" },
      { value: "NUDE", label: "뉴드", swatch: "#D9AFA0" },
      { value: "NONE", label: "사용 안 함", description: "블러셔 없이 깨끗하게" },
    ],
  },
  {
    key: "blush_placement",
    label: "7. 블러셔 위치",
    importance: 7,
    type: "single",
    defaultExpanded: false,
    options: [
      { value: "APPLE", label: "애플존", description: "광대 정중앙 — 생기" },
      { value: "UNDER_EYE", label: "눈밑 발그레", description: "한국 신부 시그니처" },
      { value: "OUTER_CHEEK", label: "바깥 광대", description: "음영·세련됨" },
      { value: "DRAPED", label: "드레이프", description: "광대뼈를 따라 길게" },
      { value: "NONE", label: "사용 안 함" },
    ],
  },
  {
    key: "brow_shape",
    label: "8. 눈썹 모양",
    importance: 8,
    type: "single",
    defaultExpanded: false,
    options: [
      { value: "KOREAN_STRAIGHT", label: "한국형 일자", description: "부드럽고 자연스러운 일자" },
      { value: "SOFT_ARCH", label: "약한 아치", description: "여성스러운 곡선" },
      { value: "NATURAL_FLAT", label: "내추럴", description: "원래 모양 그대로" },
      { value: "FEATHERY", label: "페더리 결눈썹", description: "결이 살아있는 자연 눈썹" },
      { value: "DEFINED", label: "또렷한 라인", description: "윤곽감 있는 눈썹" },
    ],
  },
  {
    key: "contour_intensity",
    label: "9. 음영(컨투어) 강도",
    importance: 9,
    type: "single",
    defaultExpanded: false,
    options: [
      { value: "NONE", label: "없음", description: "평면적·내추럴" },
      { value: "SUBTLE", label: "은은", description: "거의 안 보이는 음영" },
      { value: "NATURAL", label: "자연스럽게", description: "조명 아래서 입체감" },
      { value: "DEFINED", label: "또렷하게", description: "사진 잘 받는 강한 음영" },
    ],
  },
  {
    key: "details",
    label: "10. 디테일 (복수 선택)",
    importance: 10,
    type: "multi",
    defaultExpanded: false,
    options: [
      { value: "HIGHLIGHT", label: "하이라이터", description: "광대·콧대·큐피드보우 광" },
      { value: "INNER_CORNER", label: "눈 앞머리 펄", description: "또렷한 눈매" },
      { value: "GLITTER_TEAR", label: "눈물점 펄", description: "촬영에서 빛나는 포인트" },
      { value: "OMBRE_LIP", label: "그라데이션 입술", description: "안에서 바깥으로" },
      { value: "FAUX_FRECKLE", label: "주근깨 포인트", description: "자연스러운 분위기" },
      { value: "LASH_EXT", label: "속눈썹 강조", description: "또렷한 눈매" },
    ],
  },
  {
    key: "mood",
    label: "무드 (복수 선택)",
    importance: 11,
    type: "multi",
    defaultExpanded: false,
    options: [
      { value: "SOFT_KOREAN", label: "한국 신부", description: "은은한 신부 메이크업" },
      { value: "ETHEREAL", label: "에테리얼", description: "몽환적·투명" },
      { value: "GLAMOROUS", label: "글래머러스", description: "화려·또렷" },
      { value: "FRESH_NATURAL", label: "프레시", description: "생기 있는 일상감" },
      { value: "CLASSIC", label: "클래식", description: "격식 있는 정통" },
      { value: "ROMANTIC", label: "로맨틱", description: "여성스러움·드라마틱" },
    ],
  },
];

export const MAKEUP_FILTERS_BY_KEY: Record<MakeupFilterAxis["key"], MakeupFilterAxis> =
  MAKEUP_FILTERS.reduce((acc, f) => {
    acc[f.key] = f;
    return acc;
  }, {} as Record<MakeupFilterAxis["key"], MakeupFilterAxis>);

export const labelOfMakeup = (
  axisKey: MakeupFilterAxis["key"],
  value: string | null | undefined,
): string => {
  if (!value) return "";
  const axis = MAKEUP_FILTERS_BY_KEY[axisKey];
  if (!axis) return value;
  const opt = axis.options.find((o) => o.value === value);
  return opt?.label ?? value;
};
