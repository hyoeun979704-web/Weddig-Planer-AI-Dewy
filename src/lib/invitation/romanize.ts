/**
 * 한글 이름 → 영문 로마자 변환.
 *
 * 청첩장 앞면 캘리그래피(영문 이름) 슬롯용. 사용자는 한글 이름만 입력하면
 * `groom_name_en` / `bride_name_en` 합성 필드가 이 변환 결과로 자동 채워진다.
 *
 * 정책 (사용자 결정):
 *  - 성씨: 한국에서 쓰이는 성은 많지 않으므로 "표준/통용 영문표기" 사전으로 하드코딩.
 *    (김→Kim, 이→Lee, 박→Park, 최→Choi … 국어 로마자 규칙과 다른 통용 표기)
 *  - 이름: 국어의 로마자 표기법(Revised Romanization) 규칙으로 변환.
 *  - 형식: "Kim Jae hyeon" — 성 + 띄어쓰기 + 이름 음절(첫 음절만 대문자, 띄어쓰기).
 *
 * 한글이 아닌 입력(이미 영문 등)은 그대로 반환 — 한글/영문 둘 다 깨짐 없이 동작.
 */

// ── 성씨 통용 영문표기 사전 (단음절) ──────────────────────────────
const SURNAME: Record<string, string> = {
  김: "Kim", 이: "Lee", 박: "Park", 최: "Choi", 정: "Jung", 강: "Kang",
  조: "Cho", 윤: "Yoon", 장: "Jang", 임: "Lim", 한: "Han", 오: "Oh",
  서: "Seo", 신: "Shin", 권: "Kwon", 황: "Hwang", 안: "Ahn", 송: "Song",
  류: "Ryu", 유: "Yoo", 전: "Jeon", 홍: "Hong", 고: "Ko", 문: "Moon",
  양: "Yang", 손: "Son", 배: "Bae", 백: "Baek", 허: "Heo", 남: "Nam",
  심: "Sim", 노: "Noh", 하: "Ha", 곽: "Kwak", 성: "Sung", 차: "Cha",
  주: "Joo", 우: "Woo", 구: "Koo", 민: "Min", 나: "Na", 진: "Jin",
  지: "Ji", 엄: "Eom", 채: "Chae", 원: "Won", 천: "Cheon", 방: "Bang",
  공: "Kong", 현: "Hyun", 함: "Ham", 변: "Byun", 염: "Yeom", 여: "Yeo",
  추: "Chu", 도: "Do", 소: "So", 석: "Seok", 선: "Sun", 설: "Seol",
  마: "Ma", 길: "Gil", 위: "Wi", 표: "Pyo", 명: "Myung", 기: "Ki",
  반: "Ban", 라: "Ra", 왕: "Wang", 금: "Keum", 옥: "Ok", 육: "Yook",
  인: "In", 맹: "Maeng", 제: "Je", 모: "Mo", 봉: "Bong", 사: "Sa",
  목: "Mok", 동: "Dong", 경: "Kyung", 가: "Ka", 부: "Boo",
};

// ── 복성(두 글자 성씨) ─────────────────────────────────────────
const COMPOUND_SURNAME: Record<string, string> = {
  남궁: "Namgung", 제갈: "Jegal", 선우: "Sunwoo", 황보: "Hwangbo",
  사공: "Sagong", 서문: "Seomun", 독고: "Dokgo", 동방: "Dongbang",
};

// ── Revised Romanization 자모 테이블 ───────────────────────────
const CHO = [
  "g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j",
  "jj", "ch", "k", "t", "p", "h",
];
const JUNG = [
  "a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe",
  "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i",
];
// 종성(받침) 28개(index 0~27). code % 28 로 인덱싱하므로 정확히 28개여야 한다.
// (이전 버전은 29개라 ㄿ(14) 이후가 한 칸씩 밀려 ㅁ/ㅂ/ㅅ/ㅇ/ㅈ/ㅌ/ㅎ 받침이 전부
//  틀렸음 — 예: 창→chat, 영→yeot, 정→jeot. ㅇ 받침은 이름에 매우 흔해 치명적이었음.)
const JONG = [
  "",  "k", "k", "k", "n", "n", "n", "t", "l", "k",  // 0~9
  "m", "l", "l", "l", "p", "l", "m", "p", "p", "t",  // 10~19
  "t", "ng", "t", "t", "k", "t", "p", "t",           // 20~27
];

const isHangulSyllable = (ch: string) => {
  const code = ch.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3;
};

/** 한글 한 음절 → 로마자 (소문자). 한글이 아니면 그대로. */
function syllableToRoman(ch: string): string {
  if (!isHangulSyllable(ch)) return ch;
  const code = ch.charCodeAt(0) - 0xac00;
  const cho = Math.floor(code / 588);
  const jung = Math.floor((code % 588) / 28);
  const jong = code % 28;
  return CHO[cho] + JUNG[jung] + JONG[jong];
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * 한글 이름 → "Kim Jae hyeon" 형식 영문 변환.
 * 빈 값/한글 없음 등 변환할 게 없으면 undefined (슬롯이 자동으로 숨겨지도록).
 */
export function romanizeKoreanName(
  name: string | undefined | null,
): string | undefined {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return undefined;

  // 한글이 전혀 없으면(이미 영문 등) 입력 그대로 사용.
  const hasHangul = [...trimmed].some(isHangulSyllable);
  if (!hasHangul) return trimmed;

  // 공백 없는 순수 한글 이름만 성/이름 분해. 그 외(공백 포함 등)는 음절 단위 변환.
  const chars = [...trimmed].filter((c) => c.trim() !== "");

  let surname = "";
  let givenStart = 0;
  const firstTwo = chars.slice(0, 2).join("");
  if (COMPOUND_SURNAME[firstTwo]) {
    surname = COMPOUND_SURNAME[firstTwo];
    givenStart = 2;
  } else if (SURNAME[chars[0]]) {
    surname = SURNAME[chars[0]];
    givenStart = 1;
  } else {
    // 사전에 없는 성 → 첫 음절을 규칙으로 변환.
    surname = cap(syllableToRoman(chars[0]));
    givenStart = 1;
  }

  const given = chars
    .slice(givenStart)
    .map((c) => syllableToRoman(c))
    .filter((s) => s !== "");

  // 이름 첫 음절만 대문자, 나머지 소문자, 띄어쓰기로 연결 → "Jae hyeon"
  const givenStr = given.map((s, i) => (i === 0 ? cap(s) : s)).join(" ");

  return givenStr ? `${surname} ${givenStr}` : surname;
}

/**
 * 한글 이름 → 성을 뺀 "이름(given name)"만 로마자로. ("김충겸" → "Chung gyeom")
 * 포토카드 앞면처럼 성 없이 이름만 크게 넣는 디자인용.
 * 성이 사전/규칙으로 분리 안 되면(외자 이름 등) 전체를 이름으로 본다.
 */
export function romanizeKoreanGivenName(
  name: string | undefined | null,
): string | undefined {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return undefined;
  const hasHangul = [...trimmed].some(isHangulSyllable);
  if (!hasHangul) return trimmed;

  const chars = [...trimmed].filter((c) => c.trim() !== "");
  let givenStart = 1;
  const firstTwo = chars.slice(0, 2).join("");
  if (COMPOUND_SURNAME[firstTwo]) givenStart = 2;
  else if (SURNAME[chars[0]]) givenStart = 1;
  // 성씨가 없으면(한 글자 이름 등) 전체를 이름으로
  if (chars.length <= givenStart) givenStart = 0;

  const given = chars
    .slice(givenStart)
    .map((c) => syllableToRoman(c))
    .filter((s) => s !== "");
  const givenStr = given.map((s, i) => (i === 0 ? cap(s) : s)).join(" ");
  return givenStr || undefined;
}
