// 커뮤니티 작성자 "정체성" — 가명 닉네임 + 안전 뱃지(스타일·역할).
// 프라이버시 원칙: 실명/예식일/지역은 절대 쓰지 않는다. 닉네임은 user_id 에서
// 결정적으로 생성(서버 저장 override 가 있으면 그것 우선), 같은 사람은 어디서나 동일.

export type UserRole = "bride" | "groom" | "shared";
export type WeddingStyle = "general" | "small" | "self" | "custom";

export interface AuthorCard {
  user_id: string;
  community_nickname: string | null;
  wedding_style: WeddingStyle | null;
  role: UserRole | null;
}

export interface AuthorIdentity {
  userId: string;
  nickname: string;
  /** 표시할 뱃지 라벨들 (없으면 빈 배열). 'general' 스타일은 기본값이라 노출 안 함. */
  badges: string[];
  /** 아바타 배경색 (닉네임/ID 기반 결정적). */
  color: string;
  /** 아바타에 그릴 한 글자. */
  initial: string;
}

const ADJECTIVES = [
  "설레는", "행복한", "분주한", "꼼꼼한", "두근대는", "부지런한",
  "다정한", "싱그러운", "포근한", "반짝이는", "상냥한", "느긋한",
];
const NOUNS = ["예비부부", "웨딩러버", "신혼지기", "드림웨딩", "체크리스트", "버킷리스트"];

const AVATAR_COLORS = [
  "#F4A6B8", "#F6C177", "#9DD6B5", "#8FC1E3", "#B8A6E3",
  "#E3A6C8", "#A6D8E3", "#E3C9A6", "#C8E3A6", "#E3A6A6",
];

// 문자열 → 안정적 양의 정수 해시 (djb2 변형). SQL 과 무관하게 클라이언트 단독 결정적.
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** user_id 로부터 결정적 가명 생성 (override 없을 때 폴백). */
export function genNickname(userId: string): string {
  const adj = ADJECTIVES[hashString(userId + "a") % ADJECTIVES.length];
  const noun = NOUNS[hashString(userId + "n") % NOUNS.length];
  const num = (hashString(userId + "s") % 90) + 10; // 10~99
  return `${adj}${noun}${num}`;
}

const ROLE_LABEL: Record<UserRole, string> = {
  bride: "예신",
  groom: "예랑",
  shared: "함께 준비",
};

// 'general' 은 기본값이라 뱃지로 노출하지 않음(노이즈 방지).
const STYLE_LABEL: Partial<Record<WeddingStyle, string>> = {
  small: "스몰웨딩",
  self: "셀프웨딩",
  custom: "맞춤웨딩",
};

/** AuthorCard(서버) → 화면용 AuthorIdentity. card 가 없어도 user_id 만으로 생성 가능. */
export function toIdentity(userId: string, card?: AuthorCard | null): AuthorIdentity {
  const nickname =
    card?.community_nickname?.trim() || genNickname(userId);
  const badges: string[] = [];
  if (card?.role && ROLE_LABEL[card.role]) badges.push(ROLE_LABEL[card.role]);
  if (card?.wedding_style && STYLE_LABEL[card.wedding_style]) {
    badges.push(STYLE_LABEL[card.wedding_style]!);
  }
  return {
    userId,
    nickname,
    badges,
    color: AVATAR_COLORS[hashString(userId) % AVATAR_COLORS.length],
    initial: nickname.charAt(0) || "예",
  };
}
