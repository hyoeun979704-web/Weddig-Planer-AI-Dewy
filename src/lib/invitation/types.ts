/**
 * 청첩장 layout 슬롯 스키마.
 *
 * 운영자가 invitation_templates.layout JSONB 에 저장하는 구조.
 * DB 변경 없이 JSON 안에서 자유롭게 확장 가능.
 */

export type SlotType =
  | "text"
  | "image"
  | "asset"        // 장식 스티커 (invitation_assets 참조)
  | "calendar"     // wedding_date 의 그 달을 자동 렌더 + 결혼일 마커
  | "qr"           // 모바일 청첩장 발행 후 그 슬러그 URL의 QR
  | "map";         // 식장 약도 — V1은 운영자 PNG, V2 는 카카오맵 자동

export type SlotRole =
  | "intro"
  | "greeting"
  | "names"
  | "parents"
  | "love_message"
  | "venue_address"
  | "venue_time"
  | "contact"
  | "account"
  | "rsvp"
  | "free";

export interface InvitationSlot {
  id: string;
  type: SlotType;

  // 위치·크기 (캔버스 좌표)
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  z?: number;  // z-index, 작을수록 뒤

  // 데이터 바인딩 — user_data[field] 또는 ai_generated_text[id]
  field?: string;
  role?: SlotRole;
  placeholder?: string;       // 빈 상태일 때 보여줄 예시 문구 (text)

  // AI 추천 대상 (text 슬롯만)
  ai_promptable?: boolean;

  // 사진 효과 — 발행 시 추가 하트 발생
  auto_cutout?: boolean;       // 누끼 (remove.bg)
  auto_illustration?: boolean; // 사진→일러스트 변환 (gpt-image-2)

  // 편집 자유도 (default = true)
  movable?: boolean;
  resizable?: boolean;
  editable_color?: boolean;
  editable_font?: boolean;
  locked?: boolean;            // true 면 전체 잠금 (위의 4개 무시)

  // 텍스트 슬롯 기본값
  text?: string;
  font_family?: string;
  font_size?: number;
  font_weight?: string | number;
  font_style?: "normal" | "italic";
  color?: string;
  align?: "left" | "center" | "right";
  line_height?: number;
  letter_spacing?: number;
  /** 줄바꿈 방식. 미지정 시 공백 없는 라벨은 자동 'none'(글자 잘림 방지). */
  wrap?: "word" | "char" | "none";
  /** wedding_date 필드 표시 포맷. 미지정 시 'full_ko'. */
  date_format?:
    | "full_ko"
    | "dot"
    | "month_en"
    | "en_mdy"
    | "month_year_en"
    | "ymd_full_en"
    | "mdy_dot"
    | "en_long_time"
    | "iso";
  /** 텍스트 대소문자 변환 ('upper' 대문자 | 'lower' 소문자). */
  text_transform?: "upper" | "lower" | "none";
  /** 투명도(0~1). 장식 선 등에 사용. */
  opacity?: number;

  // 사진 위 텍스트 가독성 — 그림자. shadow_color 가 있으면 InvitationCanvas 가
  // Konva Text 에 그림자를 적용한다(앞면 사진 위 캘리그래피가 묻히지 않도록).
  shadow_color?: string;
  shadow_blur?: number;
  shadow_offset_x?: number;
  shadow_offset_y?: number;
  shadow_opacity?: number;

  // 이미지/에셋 슬롯 기본값
  image_url?: string;
  fit?: "cover" | "contain";
  /** 다중 사진 자동 분배 시 우선순위 (작을수록 먼저). image / map 슬롯용. */
  image_order?: number;

  // 에셋 슬롯 — 등록된 에셋 ID
  asset_id?: string;
  tint_color?: string;         // is_recolorable 에셋의 색상 변경
  /** 이미지 미등록 장식 에셋의 자동 렌더 종류 ('line' 가는선 | 'monogram' 이니셜). */
  asset_kind?: "line" | "monogram";

  // 캘린더 슬롯 옵션
  calendar_locale?: string;    // 'ko' (default) | 'en'
  calendar_color?: string;
  calendar_accent_color?: string;
  /** 달력 상단 '09 SEPTEMBER' 헤더 숨김 (위에 별도 월/년 라벨 둘 때). */
  calendar_hide_header?: boolean;
}

export interface InvitationCanvas {
  w: number;
  h: number;
  bg?: string;  // 단색 fallback (default '#FFFFFF')
  /**
   * 배경 이미지 (텍스트·사진 자리가 빠진 디자이너의 배경 PNG).
   * 있으면 캔버스 맨 아래에 깔리고 그 위에 슬롯들이 렌더링된다.
   * 풀시안 PNG 는 thumbnail_url 로 따로 보관 — 두 자산은 디자이너가
   * 각각 export 해서 운영자에게 전달.
   */
  background_url?: string;
}

export interface InvitationPrintSpec {
  /** Finished print size in millimeters. */
  wMm: number;
  hMm: number;
  bleedMm?: number;
  safeMarginMm?: number;
}

export interface InvitationPageLayout {
  id: string;
  label?: string;
  order?: number;
  canvas: InvitationCanvas;
  slots: InvitationSlot[];
  print?: InvitationPrintSpec;
}

export interface InvitationLayout {
  canvas: InvitationCanvas;
  slots: InvitationSlot[];
  /** Optional V2 pages. Legacy templates without pages are treated as one page. */
  pages?: InvitationPageLayout[];
  print?: InvitationPrintSpec;
  product_kind?: "card" | "ticket" | "chocolate" | "bifold" | "newspaper" | "mobile" | "mobile_roll";
  /** Multi-frame mobile canvases are rendered without visible page seams. */
  presentation?: "paged" | "seamless_roll";
}

export interface InvitationUserData {
  groom_name?: string;
  bride_name?: string;
  groom_parents?: string;
  bride_parents?: string;
  wedding_date?: string;       // ISO yyyy-mm-dd
  wedding_time?: string;       // 'HH:mm'
  venue_name?: string;
  venue_address?: string;
  contact_groom?: string;
  contact_bride?: string;
  account_groom?: string;
  account_bride?: string;
  // 자유 텍스트 슬롯 — slot.id 또는 slot.role 키로 저장
  [k: string]: string | undefined;
}

export const labelOfRole: Record<SlotRole, string> = {
  intro: "인사말 시작",
  greeting: "인사말",
  names: "신랑·신부 이름",
  parents: "혼주",
  love_message: "사랑의 약속",
  venue_address: "식장 주소",
  venue_time: "식 시간",
  contact: "연락처",
  account: "계좌 안내",
  rsvp: "참석 의사",
  free: "자유 문구",
};

// ════════════════════════════════════════════════════════════════
// 양면(전면/후면) 청첩장 — 면별 편집 데이터
// ════════════════════════════════════════════════════════════════

/** 한 면(face)의 사용자 편집 오버라이드. invitations.layout 에 면별로 저장. */
export interface InvitationFaceData {
  /** slot.id → 사용자가 직접 수정한 텍스트 */
  textOverrides?: Record<string, string>;
  /** slot.id → 업로드 사진 storage path (signed URL 은 저장 X) */
  imagePaths?: Record<string, string>;
  /** slot.id → 사용자가 고른 폰트 family */
  fontOverrides?: Record<string, string>;
  /** slot.id → 사용자가 드래그 이동한 위치(캔버스 좌표). 없으면 슬롯 기본 위치 */
  positionOverrides?: Record<string, { x: number; y: number }>;
  /** slot.id → 폰트 크기 override (크기 조절) */
  fontSizeOverrides?: Record<string, number>;
  /** 사용자가 추가한 텍스트 요소 */
  extraSlots?: InvitationSlot[];
  /** 사용자가 숨긴(삭제한) 템플릿 슬롯 id */
  hiddenSlots?: string[];
  /** 발행 시점 long-lived signed URL (익명 viewer 용) */
  imageUrlsForViewer?: Record<string, string>;
}

export type InvitationFace = "front" | "back";

/**
 * invitations.layout 을 면별 구조로 정규화해 읽는다.
 *
 * 하위호환: 기존 평면 구조({textOverrides, imagePaths, fontOverrides})는
 * 전면(front)으로 간주하고 back 은 빈 객체로 반환한다.
 */
export function readFaceLayout(layout: unknown): {
  front: InvitationFaceData;
  back: InvitationFaceData;
} {
  const l = (layout ?? {}) as Record<string, unknown>;
  if (l.front || l.back) {
    return {
      front: (l.front as InvitationFaceData) ?? {},
      back: (l.back as InvitationFaceData) ?? {},
    };
  }
  // 평면(단면) → 전면으로 승격
  return {
    front: {
      textOverrides: (l.textOverrides as Record<string, string>) ?? {},
      imagePaths: (l.imagePaths as Record<string, string>) ?? {},
      fontOverrides: (l.fontOverrides as Record<string, string>) ?? {},
      imageUrlsForViewer:
        (l.imageUrlsForViewer as Record<string, string>) ?? {},
    },
    back: {},
  };
}
