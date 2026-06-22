// 네이티브 모바일 청첩장 데모 샘플(I-MOBILE). /i2/demo 로 즉시 미리보기 — DB·인증 없이
// 실제 발행 카드와 동일한 섹션 구성을 채워, 프리뷰에서 품질(타이포·모션·구성)을 평가하도록.
// 사진은 안정적인 placeholder(picsum). 실제 발행 카드는 /i2/<slug> 로 DB 에서 로드된다.

import type { MobileInvitationContent } from "./mobileContent";

const pic = (seed: string, w: number, h: number) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

export const SAMPLE_MOBILE_CONTENT: MobileInvitationContent = {
  groomName: "김민준",
  brideName: "이서연",
  namesEn: "Minjun & Seoyeon",
  weddingDateText: "2026년 10월 17일 토요일 오후 1시",
  weddingDate: new Date("2026-10-17T00:00:00"),
  greeting:
    "서로 마주보며 사랑을 키워온 저희 두 사람이\n이제 같은 곳을 바라보며\n한 길을 걸어가고자 합니다.\n\n귀한 걸음으로 축복해 주시면\n더없는 기쁨으로 간직하겠습니다.",
  groomParents: "김재호 · 박정숙 의 아들 민준",
  brideParents: "이성훈 · 최은영 의 딸 서연",
  heroImage: pic("dewy-hero", 1080, 1280),
  gallery: [
    pic("dewy-g1", 600, 600),
    pic("dewy-g2", 600, 600),
    pic("dewy-g3", 600, 600),
    pic("dewy-g4", 600, 600),
    pic("dewy-g5", 600, 600),
    pic("dewy-g6", 600, 600),
  ],
  venueName: "그랜드 웨딩홀 5층 그랜드볼룸",
  venueAddress: "서울특별시 강남구 테헤란로 123",
  accounts: [
    { side: "groom", label: "신랑측", value: "국민은행 123456-78-901234 김민준" },
    { side: "bride", label: "신부측", value: "신한은행 110-234-567890 이서연" },
  ],
  bgmUrl: undefined,
  tone: "natural_romantic",
};
