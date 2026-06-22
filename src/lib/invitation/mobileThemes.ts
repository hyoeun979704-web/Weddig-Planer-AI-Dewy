// 네이티브 모바일 청첩장 테마 토큰(I-MOBILE Phase 1).
//
// 색·폰트·악센트를 토큰화해 섹션 컴포넌트가 테마 무관하게 동작하도록 한다. 신규 테마는
// 여기 토큰만 추가하면 된다(섹션 코드 수정 없음). tone(템플릿 분위기)→테마 매핑.
// 폰트 family 이름은 invitation_fonts.family 와 일치해야 한다(useInvitationFonts 가 @font-face 주입).

export interface MobileTheme {
  id: string;
  /** 페이지 배경. */
  bg: string;
  /** 카드/표면 배경. */
  surface: string;
  /** 본문 강조 텍스트(제목). */
  ink: string;
  /** 보조 텍스트. */
  inkSoft: string;
  /** 악센트(달력 마커·구분선·D-day). */
  accent: string;
  /** 옅은 악센트(배경 강조). */
  accentSoft: string;
  /** 디스플레이/제목 폰트 스택. */
  serifFont: string;
  /** 본문 폰트 스택. */
  sansFont: string;
  /** useInvitationFonts 로 로드할 family 목록. */
  fonts: string[];
  /** 떠다니는 장식. */
  decor: "petals" | "none";
}

const SERIF_ROMANCE: MobileTheme = {
  id: "serif-romance",
  bg: "#F7F2EC",
  surface: "#FFFFFF",
  ink: "#3A322C",
  inkSoft: "#9A8C80",
  accent: "#C98B8B",
  accentSoft: "#EBD9D3",
  serifFont: "'Gowun Batang', 'Noto Serif KR', serif",
  sansFont: "'Pretendard', system-ui, sans-serif",
  fonts: ["Gowun Batang", "Noto Serif KR", "Pretendard"],
  decor: "petals",
};

const NOIR_EDITORIAL: MobileTheme = {
  id: "noir-editorial",
  bg: "#FFFFFF",
  surface: "#FAFAFA",
  ink: "#1A1A1A",
  inkSoft: "#8A8A8A",
  accent: "#1A1A1A",
  accentSoft: "#ECECEC",
  serifFont: "'Cormorant Garamond', 'Noto Serif KR', serif",
  sansFont: "'Pretendard', system-ui, sans-serif",
  fonts: ["Cormorant Garamond", "Noto Serif KR", "Pretendard"],
  decor: "none",
};

const THEME_BY_TONE: Record<string, MobileTheme> = {
  warm_letter: SERIF_ROMANCE,
  natural_romantic: SERIF_ROMANCE,
  modern_minimal: NOIR_EDITORIAL,
  cinematic_emotional: NOIR_EDITORIAL,
};

export const MOBILE_THEMES: MobileTheme[] = [SERIF_ROMANCE, NOIR_EDITORIAL];

/** tone → 테마. 미지정/미매핑은 serif-romance(따뜻한 기본). */
export function themeForTone(tone: string | undefined): MobileTheme {
  return (tone && THEME_BY_TONE[tone]) || SERIF_ROMANCE;
}
