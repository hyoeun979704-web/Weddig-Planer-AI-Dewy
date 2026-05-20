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
  color?: string;
  align?: "left" | "center" | "right";
  line_height?: number;
  letter_spacing?: number;

  // 이미지/에셋 슬롯 기본값
  image_url?: string;
  fit?: "cover" | "contain";

  // 에셋 슬롯 — 등록된 에셋 ID
  asset_id?: string;
  tint_color?: string;         // is_recolorable 에셋의 색상 변경

  // 캘린더 슬롯 옵션
  calendar_locale?: string;    // 'ko' (default) | 'en'
  calendar_color?: string;
  calendar_accent_color?: string;
}

export interface InvitationCanvas {
  w: number;
  h: number;
  bg?: string;  // hex 색상 (default '#FFFFFF')
}

export interface InvitationLayout {
  canvas: InvitationCanvas;
  slots: InvitationSlot[];
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
