/**
 * 청첩장 폰트 일괄 등록용 시드 목록.
 *
 * 전부 SIL Open Font License (OFL) — 상업적 사용/임베딩/수정/재배포가 모두 허용된다.
 * (청첩장 이미지·PDF 임베딩 및 웹폰트 사용에 안전)
 *
 * source_url 은 google/fonts 공식 저장소의 원본 TTF(raw) 주소.
 * scripts/importInvitationFonts.ts 가 이 TTF 를 받아 woff2 로 변환 후
 * Storage(invitation-fonts) 에 업로드하고 invitation_fonts 에 upsert 한다.
 *
 * family 는 UNIQUE 키이며 CSS font-family 식별자로 그대로 쓰인다.
 * 새 폰트를 추가하려면 이 배열에 항목을 넣고 `npm run seed:invitation-fonts` 만 다시 실행.
 */

export type FontCategory =
  | "SERIF"
  | "SANS_SERIF"
  | "SCRIPT"
  | "DISPLAY"
  | "HANDWRITING";

export interface SeedInvitationFont {
  /** 어드민/에디터 UI 표시명 */
  name: string;
  /** CSS font-family 식별자 (UNIQUE). 슬롯의 font_family 와 매칭됨 */
  family: string;
  /** 원본 TTF 다운로드 URL (github raw, google/fonts) */
  source_url: string;
  category: FontCategory;
  /** CSS font-weight. 가변폰트는 기본 인스턴스 기준 400 */
  weight?: string;
  style?: "normal" | "italic";
  supports_korean?: boolean;
  /** 라이선스 메모 */
  license: string;
  display_order?: number;
}

const OFL = "SIL Open Font License 1.1";
const RAW = "https://raw.githubusercontent.com/google/fonts/main/ofl";

export const SEED_INVITATION_FONTS: SeedInvitationFont[] = [
  // ── 본문/제목용 산세리프 (고딕) ───────────────────────────
  {
    name: "노토 산스 KR",
    family: "Noto Sans KR",
    source_url: `${RAW}/notosanskr/NotoSansKR%5Bwght%5D.ttf`,
    category: "SANS_SERIF",
    weight: "400",
    license: OFL,
    display_order: 100,
  },
  {
    name: "나눔고딕",
    family: "Nanum Gothic",
    source_url: `${RAW}/nanumgothic/NanumGothic-Regular.ttf`,
    category: "SANS_SERIF",
    weight: "400",
    license: OFL,
    display_order: 90,
  },
  {
    name: "고운돋움",
    family: "Gowun Dodum",
    source_url: `${RAW}/gowundodum/GowunDodum-Regular.ttf`,
    category: "SANS_SERIF",
    weight: "400",
    license: OFL,
    display_order: 80,
  },

  // ── 명조/세리프 (청첩장 본문에 가장 많이 쓰임) ─────────────
  {
    name: "노토 세리프 KR",
    family: "Noto Serif KR",
    source_url: `${RAW}/notoserifkr/NotoSerifKR%5Bwght%5D.ttf`,
    category: "SERIF",
    weight: "400",
    license: OFL,
    display_order: 99,
  },
  {
    name: "나눔명조",
    family: "Nanum Myeongjo",
    source_url: `${RAW}/nanummyeongjo/NanumMyeongjo-Regular.ttf`,
    category: "SERIF",
    weight: "400",
    license: OFL,
    display_order: 89,
  },
  {
    name: "고운바탕",
    family: "Gowun Batang",
    source_url: `${RAW}/gowunbatang/GowunBatang-Regular.ttf`,
    category: "SERIF",
    weight: "400",
    license: OFL,
    display_order: 79,
  },
  {
    name: "송명",
    family: "Song Myung",
    source_url: `${RAW}/songmyung/SongMyung-Regular.ttf`,
    category: "SERIF",
    weight: "400",
    license: OFL,
    display_order: 70,
  },

  // ── 디스플레이/장식체 (제목 강조) ──────────────────────────
  {
    name: "주아",
    family: "Jua",
    source_url: `${RAW}/jua/Jua-Regular.ttf`,
    category: "DISPLAY",
    weight: "400",
    license: OFL,
    display_order: 60,
  },
  {
    name: "도현",
    family: "Do Hyeon",
    source_url: `${RAW}/dohyeon/DoHyeon-Regular.ttf`,
    category: "DISPLAY",
    weight: "400",
    license: OFL,
    display_order: 55,
  },
  {
    name: "검은고딕",
    family: "Black Han Sans",
    source_url: `${RAW}/blackhansans/BlackHanSans-Regular.ttf`,
    category: "DISPLAY",
    weight: "400",
    license: OFL,
    display_order: 50,
  },
  {
    name: "구기",
    family: "Gugi",
    source_url: `${RAW}/gugi/Gugi-Regular.ttf`,
    category: "DISPLAY",
    weight: "400",
    license: OFL,
    display_order: 45,
  },

  // ── 손글씨/필기체 (서명·감성 문구) ─────────────────────────
  {
    name: "나눔손글씨 펜",
    family: "Nanum Pen Script",
    source_url: `${RAW}/nanumpenscript/NanumPenScript-Regular.ttf`,
    category: "HANDWRITING",
    weight: "400",
    license: OFL,
    display_order: 40,
  },
  {
    name: "감자꽃",
    family: "Gamja Flower",
    source_url: `${RAW}/gamjaflower/GamjaFlower-Regular.ttf`,
    category: "HANDWRITING",
    weight: "400",
    license: OFL,
    display_order: 35,
  },
  {
    name: "개구",
    family: "Gaegu",
    source_url: `${RAW}/gaegu/Gaegu-Regular.ttf`,
    category: "HANDWRITING",
    weight: "400",
    license: OFL,
    display_order: 30,
  },
  {
    name: "하이멜로디",
    family: "Hi Melody",
    source_url: `${RAW}/himelody/HiMelody-Regular.ttf`,
    category: "HANDWRITING",
    weight: "400",
    license: OFL,
    display_order: 25,
  },
];
