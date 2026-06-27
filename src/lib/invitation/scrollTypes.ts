/**
 * "html_component" 종류 청첩장의 콘텐츠 계약.
 *
 * 슬롯-캔버스 템플릿은 `invitations.user_data` 에 평면 InvitationUserData
 * (groom_name, bride_name …)를 담지만, 인터랙티브 스크롤 청첩장
 * (slug='tropical-green-scroll')은 이 풍부한 구조를 담는다.
 *
 * 디자인 핸드오프의 integration/user_data.example.json 과 1:1 대응.
 */

export type ScrollTheme = "A" | "B" | "C";

export interface ScrollPerson {
  name?: string;
  father?: string;
  mother?: string;
  /** '아들' | '딸' 등 혼주 관계 라벨 */
  role_label?: string;
  phone?: string;
}

export interface ScrollGreeting {
  label?: string; // 예: "Invitation"
  title?: string; // 예: "초대합니다"
  body?: string; // 줄바꿈(\n) 포함 본문
}

export interface ScrollMapLinks {
  naver?: string;
  kakao?: string;
  tmap?: string;
}

export interface ScrollVenue {
  name?: string;
  address?: string;
  detail?: string; // 예: "5층 그레이스홀"
  lat?: number | null;
  lng?: number | null;
  map_links?: ScrollMapLinks;
  transport?: string;
  parking?: string;
}

export interface ScrollCoupleIntro {
  groom_blurb?: string;
  bride_blurb?: string;
}

export interface ScrollStoryItem {
  year?: string;
  title?: string;
  tag?: string; // 영문 캡션 오버레이 (예: "First Meet")
  desc?: string;
  image_url?: string;
}

export interface ScrollAccount {
  role?: string; // '신랑' | '아버지' | '어머니' …
  name?: string;
  bank?: string;
  num?: string;
}

export interface ScrollAccounts {
  groom?: ScrollAccount[];
  bride?: ScrollAccount[];
}

export interface ScrollInvitationData {
  theme?: ScrollTheme; // 기본 'B' (Tropical Green)
  groom?: ScrollPerson;
  bride?: ScrollPerson;
  greeting?: ScrollGreeting;
  /** 예식 일시 ISO8601 (예: "2026-08-23T12:50:00+09:00") */
  wedding_at?: string;
  venue?: ScrollVenue;
  couple_intro?: ScrollCoupleIntro;
  cover_image_url?: string;
  gallery?: string[]; // 사진 URL 목록 (최대 9장)
  story?: ScrollStoryItem[]; // 러브스토리 타임라인 (최대 5개)
  accounts?: ScrollAccounts;
}

/** 디자인 시드(샘플) 콘텐츠 — 새 청첩장 생성 시 초기값으로 사용. */
export const SCROLL_SEED_DATA: ScrollInvitationData = {
  theme: "B",
  groom: { name: "", father: "", mother: "", role_label: "아들", phone: "" },
  bride: { name: "", father: "", mother: "", role_label: "딸", phone: "" },
  greeting: {
    label: "Invitation",
    title: "초대합니다",
    body: "여름의 푸른 빛이\n가장 짙어질 무렵,\n\n오랜 시간 서로의 계절을\n함께 걸어온 두 사람이\n이제 같은 곳을 바라보며\n새로운 길을 시작합니다.\n\n귀한 걸음으로 축복해 주시면\n더없는 기쁨으로 간직하겠습니다.",
  },
  wedding_at: "",
  venue: {
    name: "",
    address: "",
    detail: "",
    lat: null,
    lng: null,
    map_links: {},
    transport: "",
    parking: "",
  },
  couple_intro: { groom_blurb: "", bride_blurb: "" },
  cover_image_url: "",
  gallery: [],
  story: [
    { year: "", title: "첫 만남", tag: "First Meet", desc: "", image_url: "" },
    { year: "", title: "첫 여행", tag: "First Trip", desc: "", image_url: "" },
    { year: "", title: "함께한 공간", tag: "Our Home", desc: "", image_url: "" },
    { year: "", title: "프러포즈", tag: "Proposal", desc: "", image_url: "" },
    { year: "", title: "결혼", tag: "Wedding", desc: "", image_url: "" },
  ],
  accounts: { groom: [], bride: [] },
};
