import { useRef, useEffect, useState, useMemo, forwardRef, useImperativeHandle } from "react";
import { Stage, Layer, Rect, Text, Image as KonvaImage, Group, Line } from "react-konva";
import type Konva from "konva";
import useImage from "use-image";
import QRCode from "qrcode";
import {
  shareCodeToDataUrl,
  type ShareCodeStyle,
} from "@/lib/invitation/shareCode";
import type {
  InvitationLayout,
  InvitationCanvas as InvitationCanvasSpec,
  InvitationSlot,
  InvitationUserData,
  BgFill,
} from "@/lib/invitation/types";
import {
  romanizeKoreanName,
  romanizeKoreanGivenName,
  romanizeKoreanText,
  koreanGivenName,
} from "@/lib/invitation/romanize";

/**
 * 청첩장 캔버스 — Konva 기반 슬롯 렌더링.
 *
 * V1 범위:
 *   · 슬롯 클릭 → onSelectSlot (편집은 PropertyPanel에서 숫자 입력)
 *   · 모든 슬롯 타입 렌더 (text / image / asset / calendar / qr / map)
 *   · 드래그·핀치는 V2
 *   · selectedSlotId 가 일치하는 슬롯은 점선 테두리
 *
 * PDF export 는 stageRef 를 부모가 들고 있으면서 toDataURL({pixelRatio:3})
 * 로 추출 → jsPDF 에 박기.
 */

export interface InvitationCanvasHandle {
  /** 고해상도 PNG dataURL 반환 (PDF/이미지 export 용) */
  toDataUrl: (pixelRatio?: number) => string | null;
}

interface Props {
  layout: InvitationLayout;
  userData: InvitationUserData;
  /** slot.id → 사용자가 채택한 AI 추천 문구 */
  aiText: Record<string, string>;
  /** 사용자가 직접 수정한 텍스트 (priority 최상) */
  textOverrides: Record<string, string>;
  /** slot.id → 화면 표시용 signed URL (만료되니 DB 에 저장하지 말 것) */
  imageUrls: Record<string, string>;
  /** slot.id → 사용자가 고른 폰트 family (없으면 slot.font_family → fallback) */
  fontOverrides?: Record<string, string>;
  /**
   * 폰트 파일 로드 완료 여부. false 면 텍스트가 fallback 으로 그려지므로,
   * true 로 바뀌는 순간 텍스트·캘린더 슬롯을 재렌더해 올바른 폰트로 다시 그린다.
   * 폰트를 신경쓰지 않는 호출부는 생략(default true) — 하위호환.
   */
  fontsReady?: boolean;
  selectedSlotId: string | null;
  onSelectSlot: (id: string | null) => void;
  /** 화면 표시 폭(px). default 360. */
  displayWidth?: number;
  background?: string;  // 캔버스 외부 영역 배경
  /** 사용자가 바꾼 캔버스 배경(단색/그라디언트). 없으면 템플릿 canvas.bg 사용. */
  bgOverride?: BgFill;
  /** 발행된 모바일 청첩장 share URL — QR 슬롯이 렌더할 데이터 */
  shareUrl?: string;
  /** QR 슬롯 스타일 — 공유 카드 선택과 통일. barcode 는 정사각 슬롯이라 basic 로 폴백. */
  qrStyle?: ShareCodeStyle;
  /** 편집 모드 — true 면 슬롯 드래그 이동 허용(잠금/movable:false 슬롯 제외). */
  editable?: boolean;
  /** slot.id → 사용자가 이동한 위치(캔버스 좌표). 없으면 slot.x/y 사용. */
  positionOverrides?: Record<string, { x: number; y: number }>;
  /** 드래그 종료 시 호출 — 이동한 위치 저장용 */
  onMoveSlot?: (id: string, x: number, y: number) => void;
  /** slot.id → 폰트 크기 override */
  fontSizeOverrides?: Record<string, number>;
  /** 사용자가 추가한 텍스트 요소 */
  extraSlots?: InvitationSlot[];
  /** 숨긴(삭제한) 슬롯 id */
  hiddenSlots?: string[];
  /** 템플릿 편집기 모드 — locked/mov:false 무시하고 모든 슬롯 드래그 허용. */
  unlockAll?: boolean;
}

/**
 * 캔버스 배경 fill 을 Konva Rect props 로 변환.
 * 우선순위: 사용자 override(그라디언트>단색) → 템플릿 canvas(그라디언트>단색) → 흰색.
 */
function resolveBgFill(
  canvas: InvitationCanvasSpec,
  override: BgFill | undefined,
  w: number,
  h: number,
): Record<string, unknown> {
  // 사용자 override 가 단색을 지정하면 템플릿 그라디언트보다 우선(단색 분기로).
  // override 가 아예 없을 때만 템플릿 canvas.bg_gradient 사용.
  const grad = override?.gradient ?? (override?.color ? undefined : canvas.bg_gradient);
  if (grad && grad.stops?.length >= 2) {
    const stops = grad.stops
      .slice()
      .sort((a, b) => a.offset - b.offset)
      .flatMap((s) => [s.offset, s.color]);
    const cx = w / 2;
    const cy = h / 2;
    if (grad.type === "radial") {
      return {
        fillRadialGradientStartPoint: { x: cx, y: cy },
        fillRadialGradientStartRadius: 0,
        fillRadialGradientEndPoint: { x: cx, y: cy },
        fillRadialGradientEndRadius: (Math.max(w, h) / 2) * 1.25,
        fillRadialGradientColorStops: stops,
      };
    }
    const rad = ((grad.angle ?? 0) * Math.PI) / 180;
    const ux = Math.sin(rad);
    const uy = Math.cos(rad);
    return {
      fillLinearGradientStartPoint: { x: cx - (ux * w) / 2, y: cy - (uy * h) / 2 },
      fillLinearGradientEndPoint: { x: cx + (ux * w) / 2, y: cy + (uy * h) / 2 },
      fillLinearGradientColorStops: stops,
    };
  }
  return { fill: override?.color ?? canvas.bg ?? "#FFFFFF" };
}

const InvitationCanvas = forwardRef<InvitationCanvasHandle, Props>(
  (
    {
      layout,
      userData,
      aiText,
      textOverrides,
      imageUrls,
      fontOverrides = {},
      fontsReady = true,
      selectedSlotId,
      onSelectSlot,
      displayWidth = 360,
      background = "transparent",
      bgOverride,
      shareUrl,
      qrStyle = "basic",
      editable = false,
      positionOverrides = {},
      onMoveSlot,
      fontSizeOverrides = {},
      extraSlots = [],
      hiddenSlots = [],
      unlockAll = false,
    },
    ref,
  ) => {
    const stageRef = useRef<Konva.Stage>(null);

    useImperativeHandle(ref, () => ({
      toDataUrl: (pixelRatio = 3) => {
        const stage = stageRef.current;
        if (!stage) return null;
        return stage.toDataURL({ pixelRatio, mimeType: "image/png" });
      },
    }));

    const canvasW = layout.canvas.w;
    const canvasH = layout.canvas.h;
    const scale = displayWidth / canvasW;
    const stageH = canvasH * scale;

    return (
      <div
        style={{
          width: displayWidth,
          height: stageH,
          background,
        }}
      >
        <Stage
          ref={stageRef}
          width={displayWidth}
          height={stageH}
          scaleX={scale}
          scaleY={scale}
          onClick={(e) => {
            // 빈 영역 클릭하면 선택 해제
            if (e.target === e.target.getStage()) {
              onSelectSlot(null);
            }
          }}
        >
          <Layer>
            {/* 캔버스 배경 색 + (있다면) 배경 이미지 */}
            <Rect
              x={0}
              y={0}
              width={canvasW}
              height={canvasH}
              {...resolveBgFill(layout.canvas, bgOverride, canvasW, canvasH)}
              onClick={() => onSelectSlot(null)}
            />
            {layout.canvas.background_url && (
              <CanvasBackgroundImage
                url={layout.canvas.background_url}
                w={canvasW}
                h={canvasH}
                onClick={() => onSelectSlot(null)}
              />
            )}

            {/* 슬롯들 z 순서대로 (템플릿 슬롯 + 추가 요소, 숨긴 것 제외) */}
            {[...layout.slots, ...extraSlots]
              .filter((s) => !hiddenSlots.includes(s.id))
              .sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
              .map((slot) => {
                // 텍스트·캘린더 슬롯은 폰트가 바뀌거나(고름) 로드 완료되면 재마운트해
                // Konva 가 새 폰트로 글자폭을 다시 측정/렌더하도록 한다.
                // (이미지/QR 슬롯은 stable key 유지 — 불필요한 재로딩 방지)
                const usesFont = slot.type === "text" || slot.type === "calendar";
                const key = usesFont
                  ? `${slot.id}:${fontsReady ? "1" : "0"}:${
                      fontOverrides[slot.id] ?? slot.font_family ?? ""
                    }:${fontSizeOverrides[slot.id] ?? ""}`
                  : slot.id;
                const pos = positionOverrides[slot.id];
                // 선택된 슬롯만 드래그 가능 — 미선택 슬롯을 draggable 로 두면
                // 터치에서 탭이 드래그로 가로채져 '탭=선택'이 동작하지 않는다.
                // (1탭 선택 → 선택된 요소만 드래그로 이동)
                const draggable =
                  editable &&
                  (unlockAll || (!slot.locked && slot.movable !== false)) &&
                  slot.id === selectedSlotId;
                return (
                  <SlotNode
                    key={key}
                    slot={slot}
                    userData={userData}
                    aiText={aiText}
                    textOverrides={textOverrides}
                    imageUrls={imageUrls}
                    fontOverrides={fontOverrides}
                    fontSizeOverrides={fontSizeOverrides}
                    shareUrl={shareUrl}
                    qrStyle={qrStyle}
                    isSelected={slot.id === selectedSlotId}
                    onClick={() => onSelectSlot(slot.id)}
                    posX={pos?.x ?? slot.x}
                    posY={pos?.y ?? slot.y}
                    draggable={draggable}
                    onMoveEnd={onMoveSlot}
                  />
                );
              })}
          </Layer>
        </Stage>
      </div>
    );
  },
);

InvitationCanvas.displayName = "InvitationCanvas";
export default InvitationCanvas;

// ════════════════════════════════════════════════════════════════
// 배경 이미지 — 디자이너가 텍스트·사진 레이어 빼고 export 한 PNG
// ════════════════════════════════════════════════════════════════
interface CanvasBackgroundImageProps {
  url: string;
  w: number;
  h: number;
  onClick: () => void;
}
const CanvasBackgroundImage = ({ url, w, h, onClick }: CanvasBackgroundImageProps) => {
  const [img] = useImage(url, "anonymous");
  if (!img) return null;
  return (
    <KonvaImage
      image={img}
      x={0}
      y={0}
      width={w}
      height={h}
      onClick={onClick}
      onTap={onClick}
      listening
    />
  );
};

// ════════════════════════════════════════════════════════════════
// 슬롯 라우터
// ════════════════════════════════════════════════════════════════
interface SlotNodeProps {
  slot: InvitationSlot;
  userData: InvitationUserData;
  aiText: Record<string, string>;
  textOverrides: Record<string, string>;
  imageUrls: Record<string, string>;
  fontOverrides: Record<string, string>;
  fontSizeOverrides?: Record<string, number>;
  shareUrl?: string;
  qrStyle?: ShareCodeStyle;
  isSelected: boolean;
  onClick: () => void;
  posX?: number;
  posY?: number;
  draggable?: boolean;
  onMoveEnd?: (id: string, x: number, y: number) => void;
}

// 영문 이름(캘리그래피) 필드 — 폰트 미지정 시 서명체 기본 적용 (디자인 시그니처)
const EN_NAME_FIELDS = new Set([
  "groom_name_en",
  "bride_name_en",
  "couple_names_en",
]);

const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_FULL_EN = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];
const MONTHS_TITLE_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_EN = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];
const MONTHS_FULL_EN = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

/** 'HH:mm' → '오후 2시 30분' (분이 0이면 '오후 2시'). */
function formatTimeKo(time: string | undefined): string {
  if (!time) return "";
  const m = time.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "";
  const h = Number(m[1]);
  const min = Number(m[2]);
  const ampm = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return min === 0 ? `${ampm} ${h12}시` : `${ampm} ${h12}시 ${min}분`;
}

/** 'HH:mm' → '02:30 PM' (영문 12시간 표기). */
function formatTimeEn(time: string | undefined): string {
  if (!time) return "";
  const m = time.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "";
  const h = Number(m[1]);
  const min = Number(m[2]);
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(min).padStart(2, "0")} ${ampm}`;
}

/**
 * wedding_date(ISO) 를 슬롯의 date_format 에 맞춰 사람이 읽는 문구로 변환.
 *  - full_ko(기본): '2025년 11월 22일 토요일 오후 2시 30분'
 *  - dot:           '2025. 11. 22'
 *  - month_en:      '2025 NOV 22'
 *  - iso:           원본 그대로
 */
function formatWeddingDate(
  iso: string,
  format: InvitationSlot["date_format"],
  time?: string,
): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  const pad2 = (n: number) => String(n).padStart(2, "0");
  switch (format) {
    case "iso":
      return iso;
    case "dot":
      return `${y}. ${Number(mo)}. ${Number(d)}`;
    case "month_en":
      return `${y} ${MONTHS_EN[Number(mo) - 1]} ${Number(d)}`;
    case "en_mdy":
      return `${MONTHS_EN[Number(mo) - 1]} ${Number(d)}, ${y}`;
    case "en_long_time": {
      const wd = WEEKDAYS_EN[date.getDay()];
      const t = formatTimeEn(time);
      const base = `${MONTHS_TITLE_EN[Number(mo) - 1]} ${Number(d)}, ${y} ${wd}`;
      return t ? `${base} ${t}` : base;
    }
    case "month_year_en":
      return `${MONTHS_FULL_EN[Number(mo) - 1]} ${y}`;
    case "ymd_full_en":
      return `${y} ${MONTHS_FULL_EN[Number(mo) - 1]} ${Number(d)}`;
    case "mdy_dot":
      return `${pad2(Number(mo))}.${pad2(Number(d))}.${y}`;
    case "ymd_dot":
      return `${y}.${pad2(Number(mo))}.${pad2(Number(d))}`;
    case "weekday_en":
      return WEEKDAYS_FULL_EN[date.getDay()];
    case "month_ko":
      return `${Number(mo)}월`;
    case "md_slash":
      return `${pad2(Number(mo))} / ${pad2(Number(d))}`;
    case "month_2d":
      return pad2(Number(mo));
    case "day_2d":
      return pad2(Number(d));
    case "full_ko":
    default: {
      const wd = WEEKDAYS_KO[date.getDay()];
      const t = formatTimeKo(time);
      const base = `${y}년 ${Number(mo)}월 ${Number(d)}일 ${wd}요일`;
      return t ? `${base} ${t}` : base;
    }
  }
}

/** field 바인딩 값의 표시용 포맷(날짜 등). 미해당 필드는 원본 그대로. */
function formatFieldValue(
  slot: InvitationSlot,
  value: string,
  userData: InvitationUserData,
): string {
  if (slot.field === "wedding_date" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return formatWeddingDate(value, slot.date_format, userData.wedding_time);
  }
  return value;
}

/** 슬롯에 적용할 폰트 family: 사용자 선택 > 템플릿 지정 > 영문이름 서명체 > fallback */
function resolveFont(
  slot: InvitationSlot,
  fontOverrides: Record<string, string>,
): string {
  const explicit = fontOverrides[slot.id] ?? slot.font_family;
  if (explicit) return explicit;
  // 앞면 영문 이름은 폰트를 따로 안 줘도 우아한 서명체로 — 안 보이던 캘리 자동 적용.
  if (slot.field && EN_NAME_FIELDS.has(slot.field)) {
    return "Great Vibes, cursive";
  }
  return "Pretendard, sans-serif";
}

/** Konva fontStyle — italic(slot.font_style) 와 bold(font_weight) 를 조합. */
function resolveFontStyle(slot: InvitationSlot): string {
  const italic = slot.font_style === "italic";
  const bold =
    typeof slot.font_weight === "number"
      ? slot.font_weight >= 600
      : slot.font_weight === "bold";
  const parts = [italic ? "italic" : "", bold ? "bold" : ""].filter(Boolean);
  return parts.length ? parts.join(" ") : "normal";
}

/**
 * 줄바꿈 방식. 템플릿이 slot.wrap 을 주면 그대로,
 * 아니면 공백이 없는 텍스트(단어 1개 라벨)는 'none' 으로 — 단어 쪼개짐/글자 잘림 방지.
 */
function resolveWrap(slot: InvitationSlot, text: string): "word" | "char" | "none" {
  if (slot.wrap) return slot.wrap;
  return /\s/.test(text) ? "word" : "none";
}

const SlotNode = (props: SlotNodeProps) => {
  const { slot, isSelected, posX, posY, draggable, onMoveEnd } = props;

  return (
    <Group
      x={posX ?? slot.x}
      y={posY ?? slot.y}
      rotation={slot.rotation ?? 0}
      draggable={draggable}
      onClick={props.onClick}
      onTap={props.onClick}
      onDragEnd={(e) => onMoveEnd?.(slot.id, e.target.x(), e.target.y())}
    >
      {renderSlotBody(props)}
      {isSelected && (
        <Rect
          x={0}
          y={0}
          width={slot.w}
          height={slot.h}
          stroke="#FF66A8"
          strokeWidth={2}
          dash={[8, 6]}
          listening={false}
        />
      )}
    </Group>
  );
};

function renderSlotBody(props: SlotNodeProps) {
  const { slot } = props;
  switch (slot.type) {
    case "text":
      return <TextSlotBody {...props} />;
    case "image":
      return <ImageSlotBody {...props} />;
    case "asset":
      return <AssetSlotBody {...props} />;
    case "calendar":
      return <CalendarSlotBody {...props} />;
    case "qr":
      return <QrSlotBody {...props} />;
    case "map":
      return <ImageSlotBody {...props} />;
    default:
      return <PlaceholderSlotBody label="알 수 없는 슬롯" {...props} />;
  }
}

// ════════════════════════════════════════════════════════════════
// 텍스트 슬롯
// ════════════════════════════════════════════════════════════════
// 카드 템플릿의 합성 필드 → user_data 조합 (위저드 입력에서 자동 채움)
function compositeField(
  field: string,
  userData: InvitationUserData,
): string | undefined {
  if (field === "couple_names") {
    const g = userData.groom_name?.trim();
    const b = userData.bride_name?.trim();
    if (g && b) return `${g} · ${b}`;
    return g || b || undefined;
  }
  // 영문 이름 — 한글 이름에서 자동 로마자 변환 (앞면 캘리그래피 슬롯용).
  // 사용자가 영문 필드를 직접 입력한 경우(userData[field])는 resolveText 가 먼저 쓰므로
  // 여기 합성은 한글만 입력했을 때의 자동 변환 폴백이다.
  if (field === "groom_name_en") return romanizeKoreanName(userData.groom_name);
  if (field === "bride_name_en") return romanizeKoreanName(userData.bride_name);
  // 성 뺀 이름만 (포토카드 앞면 큰 글씨용) — "김충겸" → "Chung gyeom"
  if (field === "groom_given_en")
    return romanizeKoreanGivenName(userData.groom_name);
  if (field === "bride_given_en")
    return romanizeKoreanGivenName(userData.bride_name);
  // 장소명 영문(앞면 세로 텍스트용) — 한글 장소를 로마자로 자동 변환
  if (field === "venue_address_en")
    return romanizeKoreanText(userData.venue_address);
  if (field === "venue_name_en")
    return romanizeKoreanText(userData.venue_name);
  if (field === "couple_names_en") {
    const g = romanizeKoreanName(userData.groom_name);
    const b = romanizeKoreanName(userData.bride_name);
    if (g && b) return `${g} & ${b}`;
    return g || b || undefined;
  }
  // 한글 이름(성 제외)만 "호진 그리고 정윤" — 후면 인사말 제목용
  if (field === "couple_given_ko") {
    const g = koreanGivenName(userData.groom_name);
    const b = koreanGivenName(userData.bride_name);
    if (g && b) return `${g} 그리고 ${b}`;
    return g || b || undefined;
  }
  // "김범수 그리고 이난영" — 풀네임 + 그리고 (후면 제목용)
  if (field === "couple_and_ko") {
    const g = userData.groom_name?.trim();
    const b = userData.bride_name?.trim();
    if (g && b) return `${g} 그리고 ${b}`;
    return g || b || undefined;
  }
  // "이현우 · 정서연 결혼합니다" — 표지형 카드 신랑·신부 + 결혼합니다
  if (field === "couple_marry_ko") {
    const g = userData.groom_name?.trim();
    const b = userData.bride_name?.trim();
    if (g && b) return `${g} · ${b} 결혼합니다`;
    return undefined;
  }
  // "신랑 김리아 ♥ 신부 이망고" — 달력형 카드 하단 신랑·신부 한 줄
  if (field === "couple_marriage_ko") {
    const g = userData.groom_name?.trim();
    const b = userData.bride_name?.trim();
    if (g && b) return `신랑 ${g}  ♥  신부 ${b}`;
    return g ? `신랑 ${g}` : b ? `신부 ${b}` : undefined;
  }
  return undefined;
}

function resolveText(
  slot: InvitationSlot,
  userData: InvitationUserData,
  aiText: Record<string, string>,
  textOverrides: Record<string, string>,
): string {
  // priority: textOverrides > aiText > userData[field] > 합성필드 > slot.text > placeholder
  if (textOverrides[slot.id] !== undefined) return textOverrides[slot.id];
  if (aiText[slot.id]) return aiText[slot.id];
  if (slot.field && userData[slot.field])
    return formatFieldValue(slot, userData[slot.field]!, userData);
  if (slot.field) {
    const c = compositeField(slot.field, userData);
    if (c) return c;
  }
  if (slot.text) return slot.text;
  return slot.placeholder ?? "";
}

const TextSlotBody = ({
  slot,
  userData,
  aiText,
  textOverrides,
  fontOverrides,
  fontSizeOverrides = {},
}: SlotNodeProps) => {
  const rawText = resolveText(slot, userData, aiText, textOverrides);
  const text =
    slot.text_transform === "upper"
      ? rawText.toUpperCase()
      : slot.text_transform === "lower"
        ? rawText.toLowerCase()
        : rawText;
  // 빈 field 슬롯 hide — 사용자가 부모님·계좌 같은 선택 필드를 비워둘 때
  // 빈 줄로 그려져 디자인이 망가지는 걸 방지.
  // 단, ai_promptable 슬롯이나 placeholder 가 있는 슬롯은 그대로 둠 (편집/디자인 의도).
  const isFieldBoundEmpty =
    slot.field &&
    !userData[slot.field] &&
    !compositeField(slot.field, userData) && // 합성 필드(couple_names, *_en)도 비었을 때만 숨김
    !textOverrides[slot.id] &&
    !aiText[slot.id] &&
    !slot.text;
  if (isFieldBoundEmpty) {
    return null;
  }
  return (
    <Text
      x={0}
      y={0}
      width={slot.w}
      height={slot.h}
      text={text}
      fontFamily={resolveFont(slot, fontOverrides)}
      fontSize={fontSizeOverrides[slot.id] ?? slot.font_size ?? 18}
      fontStyle={resolveFontStyle(slot)}
      fill={slot.color ?? "#1A1A1A"}
      align={slot.align ?? "left"}
      lineHeight={slot.line_height ?? 1.4}
      letterSpacing={slot.letter_spacing}
      // 사진 위 텍스트 가독성 — 템플릿이 shadow_color 를 주면 그림자 적용.
      shadowEnabled={!!slot.shadow_color}
      shadowColor={slot.shadow_color}
      shadowBlur={slot.shadow_blur ?? 0}
      shadowOffsetX={slot.shadow_offset_x ?? 0}
      shadowOffsetY={slot.shadow_offset_y ?? 0}
      shadowOpacity={slot.shadow_opacity ?? 1}
      // 한 줄 라벨(INVITATION 등)은 슬롯폭에 빠듯하면 Konva 가 단어를 쪼개
      // 마지막 글자를 다음 줄로 흘려 "INVITATIO" 처럼 잘려 보인다.
      // → 공백 없는 텍스트는 줄바꿈 금지(가로 오버플로 허용)로 글자 보존.
      wrap={resolveWrap(slot, text)}
    />
  );
};

// ════════════════════════════════════════════════════════════════
// 이미지 슬롯 (image / map)
// ════════════════════════════════════════════════════════════════
const ImageSlotBody = ({ slot, imageUrls }: SlotNodeProps) => {
  const url = imageUrls[slot.id] ?? slot.image_url ?? "";
  const [img] = useImage(url, "anonymous");

  if (!url) {
    return (
      <Group>
        <Rect
          x={0}
          y={0}
          width={slot.w}
          height={slot.h}
          fill="#F4F4F5"
          stroke="#D4D4D8"
          strokeWidth={1}
          dash={[6, 4]}
        />
        <Text
          x={0}
          y={slot.h / 2 - 8}
          width={slot.w}
          text="사진 자리"
          fontSize={14}
          fill="#71717A"
          align="center"
        />
      </Group>
    );
  }

  if (!img) {
    return (
      <Rect
        x={0}
        y={0}
        width={slot.w}
        height={slot.h}
        fill="#E4E4E7"
      />
    );
  }

  // cover/contain 계산
  const fit = slot.fit ?? "cover";
  const scale =
    fit === "cover"
      ? Math.max(slot.w / img.width, slot.h / img.height)
      : Math.min(slot.w / img.width, slot.h / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const offX = (slot.w - drawW) / 2;
  const offY = (slot.h - drawH) / 2;

  return (
    <Group clipFunc={(ctx) => {
      ctx.rect(0, 0, slot.w, slot.h);
    }}>
      <KonvaImage
        image={img}
        x={offX}
        y={offY}
        width={drawW}
        height={drawH}
      />
    </Group>
  );
};

// ════════════════════════════════════════════════════════════════
// 에셋 슬롯
// ════════════════════════════════════════════════════════════════
/** SVG data URI 에셋을 단색(tint_color)으로 치환. 라인/프레임 등 단색 에셋 색변경용. */
function tintSvgDataUri(url: string | undefined, color: string | undefined): string {
  if (!url || !color || !url.startsWith("data:image/svg+xml;base64,")) return url ?? "";
  try {
    const b64 = url.slice("data:image/svg+xml;base64,".length);
    const svg = atob(b64).replace(/#[0-9a-fA-F]{6}/g, color);
    return "data:image/svg+xml;base64," + btoa(svg);
  } catch {
    return url;
  }
}

const AssetSlotBody = ({ slot, userData }: SlotNodeProps) => {
  const tintedUrl = useMemo(
    () => tintSvgDataUri(slot.image_url, slot.tint_color),
    [slot.image_url, slot.tint_color],
  );
  const [img] = useImage(tintedUrl, "anonymous");
  if (slot.image_url) {
    // 등록 이미지가 있으면 그대로(로딩 중엔 아무것도 안 그림 — 점선 깜빡임 방지).
    return img ? (
      <KonvaImage image={img} x={0} y={0} width={slot.w} height={slot.h} />
    ) : null;
  }

  // 이미지 미등록 장식 에셋 — 모양에 맞게 직접 그려 마감(점선 디버그 박스 제거).
  //  · 가는 선(구분선/세로선): 실선 하나
  //  · 모노그램: 신랑·신부 영문 이니셜을 서명체로
  //  · 그 외: 숨김(빈 점선 박스보다 깔끔)
  const kind =
    slot.asset_kind ?? (Math.min(slot.w, slot.h) <= 4 ? "line" : undefined);

  if (kind === "line") {
    return (
      <Rect
        x={0}
        y={0}
        width={slot.w}
        height={slot.h}
        fill={slot.color ?? "#D9D2C6"}
        opacity={slot.opacity ?? 1}
      />
    );
  }

  if (kind === "monogram") {
    const g = romanizeKoreanName(userData.groom_name);
    const b = romanizeKoreanName(userData.bride_name);
    const initials = [g?.[0], b?.[0]].filter(Boolean).join(" & ");
    if (!initials) return null;
    return (
      <Text
        x={0}
        y={0}
        width={slot.w}
        height={slot.h}
        text={initials}
        fontFamily="Great Vibes, cursive"
        fontSize={slot.font_size ?? slot.h * 0.55}
        fill={slot.color ?? "#1A1A1A"}
        align="center"
        verticalAlign="middle"
        shadowEnabled={!!slot.shadow_color}
        shadowColor={slot.shadow_color}
        shadowBlur={slot.shadow_blur ?? 0}
        shadowOpacity={slot.shadow_opacity ?? 1}
      />
    );
  }

  return null;
};

// ════════════════════════════════════════════════════════════════
// 캘린더 슬롯 — 결혼 날짜의 그 달을 자동 렌더 + 결혼일에 하트 마커
// ════════════════════════════════════════════════════════════════
const CalendarSlotBody = ({ slot, userData, fontOverrides }: SlotNodeProps) => {
  const dateStr = userData.wedding_date;
  if (!dateStr) {
    return <PlaceholderInner slot={slot} label="📅 결혼 날짜 미입력" />;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return <PlaceholderInner slot={slot} label="📅 날짜 형식 오류" />;
  }

  return (
    <CalendarMonthGrid slot={slot} date={d} fontFamily={resolveFont(slot, fontOverrides)} />
  );
};

interface CalendarMonthGridProps {
  slot: InvitationSlot;
  date: Date;
  fontFamily: string;
}

const CalendarMonthGrid = ({ slot, date, fontFamily }: CalendarMonthGridProps) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const targetDay = date.getDate();

  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  const color = slot.calendar_color ?? "#1A1A1A";
  const accent = slot.calendar_accent_color ?? "#E91E63";

  // 헤더("09 SEPTEMBER")를 숨기면 요일+날짜만 — 위에 별도 라벨을 둘 때 사용.
  const showHeader = !slot.calendar_hide_header;
  const headerH = showHeader ? slot.h * 0.18 : 0;
  const weekdayH = slot.h * 0.1;
  const gridYStart = headerH + weekdayH;
  const gridH = slot.h - gridYStart;
  const cellW = slot.w / 7;
  const rows = Math.ceil((firstDay + lastDate) / 7);
  const cellH = gridH / rows;
  const cellFontSize = Math.min(cellW, cellH) * 0.36;

  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];

  const days: { day: number; col: number; row: number }[] = [];
  for (let i = 1; i <= lastDate; i++) {
    const offset = firstDay + i - 1;
    days.push({ day: i, col: offset % 7, row: Math.floor(offset / 7) });
  }

  return (
    <Group>
      {/* 헤더: "MM MARCH" 등 (calendar_hide_header 면 생략) */}
      {showHeader && (
        <Text
          x={0}
          y={0}
          width={slot.w}
          height={headerH}
          text={`${String(month + 1).padStart(2, "0")} ${monthNameEn(month)}`}
          fontFamily={fontFamily}
          fontSize={headerH * 0.6}
          fill={color}
          align="center"
          verticalAlign="middle"
          letterSpacing={2}
        />
      )}

      {/* 요일 라인 */}
      {weekdays.map((w, i) => (
        <Text
          key={i}
          x={cellW * i}
          y={headerH}
          width={cellW}
          height={weekdayH}
          text={w}
          fontFamily={fontFamily}
          fontSize={weekdayH * 0.5}
          fill={color}
          align="center"
          verticalAlign="middle"
          fontStyle="bold"
        />
      ))}

      {/* 일자들 */}
      {days.map(({ day, col, row }) => {
        const isTarget = day === targetDay;
        const cx = cellW * col;
        const cy = gridYStart + cellH * row;
        return (
          <Group key={day} x={cx} y={cy}>
            {isTarget && (
              <Heart
                cx={cellW / 2}
                cy={cellH / 2}
                size={Math.min(cellW, cellH) * 0.85}
                color={accent}
              />
            )}
            <Text
              x={0}
              y={0}
              width={cellW}
              height={cellH}
              text={String(day)}
              fontFamily={fontFamily}
              fontSize={cellFontSize}
              fill={isTarget ? accent : color}
              align="center"
              verticalAlign="middle"
              fontStyle={isTarget ? "bold" : "normal"}
            />
          </Group>
        );
      })}
    </Group>
  );
};

function monthNameEn(m: number) {
  return [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
  ][m];
}

// 하트 SVG path — Konva Line + bezier 보다 간단히 사용
interface HeartProps {
  cx: number;
  cy: number;
  size: number;
  color: string;
}
const Heart = ({ cx, cy, size, color }: HeartProps) => {
  // 16x16 viewbox 기준 하트 path 점들 (대략)
  // 단순화: 두 원 + 삼각형으로 근사 (Konva Line)
  const r = size / 2;
  const pts: number[] = [
    cx, cy - r * 0.2,
    cx - r * 0.65, cy - r * 0.7,
    cx - r * 0.95, cy - r * 0.4,
    cx - r * 0.95, cy,
    cx, cy + r * 0.7,
    cx + r * 0.95, cy,
    cx + r * 0.95, cy - r * 0.4,
    cx + r * 0.65, cy - r * 0.7,
    cx, cy - r * 0.2,
  ];
  return (
    <Line
      points={pts}
      fill={color}
      closed
      stroke={color}
      strokeWidth={1}
      tension={0.35}
      opacity={0.9}
    />
  );
};

// ════════════════════════════════════════════════════════════════
// QR 슬롯 — share URL 을 QR 코드로 렌더
// ════════════════════════════════════════════════════════════════
const QrSlotBody = ({
  slot,
  shareUrl,
  qrStyle = "basic",
  imageUrls = {},
}: SlotNodeProps) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  // 사용자가 직접 올린 QR 이미지(있으면 우선) — 종이 청첩장의 외부 QR 등.
  const attachedQr = imageUrls[slot.id];

  useEffect(() => {
    if (!shareUrl) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    // barcode 는 가로로 길어 정사각 QR 슬롯에 안 맞으므로 basic 으로 폴백.
    // heart 는 공유 카드와 동일 렌더(shareCodeToDataUrl)로 스타일 통일.
    if (qrStyle === "heart") {
      shareCodeToDataUrl(shareUrl, "heart").then((url) => {
        if (!cancelled) setQrDataUrl(url);
      });
    } else {
      QRCode.toDataURL(shareUrl, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: Math.max(slot.w, slot.h),
        color: { dark: slot.color ?? "#000000", light: "#FFFFFF" },
      }).then((url) => {
        if (!cancelled) setQrDataUrl(url);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [shareUrl, slot.w, slot.h, slot.color, qrStyle]);

  const [img] = useImage(attachedQr ?? qrDataUrl ?? "", "anonymous");

  // QR 소스가 전혀 없으면(발행 전 + 첨부 이미지 없음) 표시하지 않음 — 사용자 요청.
  // 빈 자리/플레이스홀더 없이 깔끔하게 숨긴다.
  if (!shareUrl && !attachedQr) {
    return null;
  }
  if (!img) {
    return (
      <Rect
        x={0}
        y={0}
        width={slot.w}
        height={slot.h}
        fill="#FFFFFF"
        stroke="#E5E5E5"
      />
    );
  }
  return <KonvaImage image={img} x={0} y={0} width={slot.w} height={slot.h} />;
};

// ════════════════════════════════════════════════════════════════
// Placeholder (map 등)
// ════════════════════════════════════════════════════════════════
const PlaceholderSlotBody = ({
  label,
  slot,
}: SlotNodeProps & { label: string }) => <PlaceholderInner slot={slot} label={label} />;

const PlaceholderInner = ({
  slot,
  label,
}: {
  slot: InvitationSlot;
  label: string;
}) => (
  <Group>
    <Rect
      x={0}
      y={0}
      width={slot.w}
      height={slot.h}
      fill="#F4F4F5"
      stroke="#D4D4D8"
      strokeWidth={1}
      dash={[4, 4]}
    />
    <Text
      x={0}
      y={slot.h / 2 - 8}
      width={slot.w}
      text={label}
      fontSize={12}
      fill="#71717A"
      align="center"
    />
  </Group>
);
