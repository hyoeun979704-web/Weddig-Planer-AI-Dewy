import { useRef, useEffect, useState, useMemo, forwardRef, useImperativeHandle } from "react";
import { Stage, Layer, Rect, Text, Image as KonvaImage, Group, Line, Circle } from "react-konva";
import Konva from "konva";
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
import { resolveSlotAnim, type SlotAnim } from "@/lib/invitation/slotAnim";

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
  /** slot.id → 사용자가 조절한 크기(캔버스 좌표). 없으면 slot.w/h 사용. */
  sizeOverrides?: Record<string, { w: number; h: number }>;
  /** 리사이즈 핸들 드래그 종료 시 호출 — 크기 저장용 */
  onResizeSlot?: (id: string, w: number, h: number) => void;
  /** slot.id → 사용자가 고른 등장/루프 효과 (slot.anim 보다 우선) */
  animOverrides?: Record<string, SlotAnim>;
  /** 증가할 때마다 등장 애니메이션을 처음부터 재생 (스튜디오 미리보기) */
  animPreviewNonce?: number;
  /** slot.id → 레이어 순서(z) override */
  zOverrides?: Record<string, number>;
  /** slot.id → 회전(deg) override */
  rotationOverrides?: Record<string, number>;
  /** slot.id → 폰트 크기 override */
  fontSizeOverrides?: Record<string, number>;
  /** 사용자가 추가한 텍스트 요소 */
  extraSlots?: InvitationSlot[];
  /** 숨긴(삭제한) 슬롯 id */
  hiddenSlots?: string[];
  /** 템플릿 편집기 모드 — locked/mov:false 무시하고 모든 슬롯 드래그 허용. */
  unlockAll?: boolean;
  /** slot.id → 이미지 맞춤(fit) override */
  imageFitOverrides?: Record<string, "cover" | "contain">;
  /** slot.id → 공개 뷰어 액션 override */
  actionOverrides?: Record<string, InvitationSlot["action"]>;
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
      sizeOverrides = {},
      onResizeSlot,
      animOverrides = {},
      animPreviewNonce = 0,
      zOverrides = {},
      rotationOverrides = {},
      fontSizeOverrides = {},
      extraSlots = [],
      hiddenSlots = [],
      unlockAll = false,
      imageFitOverrides = {},
      actionOverrides = {},
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

    // 드래그 중앙 스냅 가이드라인 (편집 모드)
    const [guideV, setGuideV] = useState(false);
    const [guideH, setGuideH] = useState(false);
    const handleGuideChange = (v: boolean, h: boolean) => {
      setGuideV(v);
      setGuideH(h);
    };

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
              .map((slot) =>
                actionOverrides[slot.id]
                  ? { ...slot, action: actionOverrides[slot.id] }
                  : slot,
              )
              .map((slot) => {
                const size = sizeOverrides[slot.id];
                const anim = animOverrides[slot.id];
                const z = zOverrides[slot.id];
                const rotation = rotationOverrides[slot.id];
                if (!size && !anim && z === undefined && rotation === undefined)
                  return slot;
                return {
                  ...slot,
                  ...(size ? { w: size.w, h: size.h } : {}),
                  ...(anim ? { anim } : {}),
                  ...(z !== undefined ? { z } : {}),
                  ...(rotation !== undefined ? { rotation } : {}),
                };
              })
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
                    imageFitOverrides={imageFitOverrides}
                    animPreviewNonce={animPreviewNonce}
                    canvasW={canvasW}
                    canvasH={canvasH}
                    onGuideChange={editable ? handleGuideChange : undefined}
                    movableHint={
                      editable &&
                      selectedSlotId === null &&
                      (unlockAll || (!slot.locked && slot.movable !== false))
                    }
                  />
                );
              })}

            {/* 드래그 중앙 스냅 가이드라인 */}
            {editable && guideV && (
              <Line
                points={[canvasW / 2, 0, canvasW / 2, canvasH]}
                stroke="#FF66A8"
                strokeWidth={1.5 / scale}
                dash={[8 / scale, 6 / scale]}
                listening={false}
              />
            )}
            {editable && guideH && (
              <Line
                points={[0, canvasH / 2, canvasW, canvasH / 2]}
                stroke="#FF66A8"
                strokeWidth={1.5 / scale}
                dash={[8 / scale, 6 / scale]}
                listening={false}
              />
            )}

            {/* 선택 슬롯 리사이즈 핸들 (우하단 1점) — 회전 슬롯은 좌표계가 달라 제외 */}
            {editable &&
              onResizeSlot &&
              (() => {
                const sel = [...layout.slots, ...extraSlots].find(
                  (s) => s.id === selectedSlotId,
                );
                if (!sel || (rotationOverrides[sel.id] ?? sel.rotation)) return null;
                if (!unlockAll && (sel.locked || sel.resizable === false)) return null;
                const w = sizeOverrides[sel.id]?.w ?? sel.w;
                const h = sizeOverrides[sel.id]?.h ?? sel.h;
                const x = positionOverrides[sel.id]?.x ?? sel.x;
                const y = positionOverrides[sel.id]?.y ?? sel.y;
                const MIN = 24; // 캔버스 좌표 최소 크기
                const commit = (node: Konva.Node) => {
                  const nw = Math.max(MIN, node.x() - x);
                  const nh = Math.max(MIN, node.y() - y);
                  node.position({ x: x + nw, y: y + nh });
                  onResizeSlot(sel.id, Math.round(nw), Math.round(nh));
                };
                return (
                  <Circle
                    x={x + w}
                    y={y + h}
                    radius={12 / scale}
                    fill="#6366f1"
                    stroke="#ffffff"
                    strokeWidth={2 / scale}
                    draggable
                    onDragMove={(e) => commit(e.target)}
                    onDragEnd={(e) => commit(e.target)}
                  />
                );
              })()}
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
  imageFitOverrides?: Record<string, "cover" | "contain">;
  /** 증가 시 등장 애니메이션 재생 (스튜디오 ▶ 미리보기) */
  animPreviewNonce?: number;
  /** 캔버스 크기 — 드래그 중앙 스냅 계산용 (편집 모드) */
  canvasW?: number;
  canvasH?: number;
  /** 드래그 중 중앙 정렬 여부 통지 (가이드라인 표시용) */
  onGuideChange?: (v: boolean, h: boolean) => void;
  /** 아무것도 선택 안 된 편집 화면에서 '움직일 수 있어요' 힌트 점선 */
  movableHint?: boolean;
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
  const groupRef = useRef<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  // 뷰포트 진입 감지 (IntersectionObserver)
  useEffect(() => {
    const node = groupRef.current;
    if (!node || props.draggable || isSelected) {
      setIsVisible(true);
      return;
    }

    let observer: IntersectionObserver | null = null;
    const checkTimer = setTimeout(() => {
      const stage = node.getStage();
      if (!stage) {
        setIsVisible(true);
        return;
      }
      const container = stage.container();
      if (!container) {
        setIsVisible(true);
        return;
      }

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsVisible(true);
              observer?.disconnect();
            }
          });
        },
        { threshold: 0.1 }
      );

      observer.observe(container);
    }, 50);

    return () => {
      clearTimeout(checkTimer);
      observer?.disconnect();
    };
  }, [slot.id, props.draggable, isSelected]);

  // 등장/루프 애니메이션 — 효과는 resolveSlotAnim(사용자 override > slot.anim >
  // 레거시 휴리스틱)으로 결정. 드래그 중·선택 중 슬롯은 제외(편집 방해 방지).
  // animPreviewNonce 가 바뀌면 처음부터 재생 (스튜디오 ▶ 미리보기).
  const effectiveAnim = resolveSlotAnim(slot);
  useEffect(() => {
    const node = groupRef.current;
    if (!node || !isVisible || props.draggable || isSelected) return;

    if (effectiveAnim === "heartbeat") {
      const targetScaleX = slot.scaleX ?? 1;
      const targetScaleY = slot.scaleY ?? 1;

      const anim = new Konva.Animation((frame) => {
        if (!frame) return;
        const period = 1200; // 1.2초 주기
        const time = frame.time % period;
        let scaleFactor = 1;
        if (time < 300) {
          // 첫 번째 수축-이완 (쿵)
          scaleFactor = 1 + 0.12 * Math.sin((time / 300) * Math.PI);
        } else if (time >= 350 && time < 650) {
          // 두 번째 수축-이완 (쾅)
          scaleFactor = 1 + 0.08 * Math.sin(((time - 350) / 300) * Math.PI);
        }
        node.scale({ x: targetScaleX * scaleFactor, y: targetScaleY * scaleFactor });
      }, node.getLayer());

      anim.start();
      return () => {
        anim.stop();
        node.scale({ x: slot.scaleX ?? 1, y: slot.scaleY ?? 1 });
      };
    }

    if (effectiveAnim === "spring") {
      const targetY = posY ?? slot.y;
      node.scale({ x: 0.7, y: 0.7 });
      node.y(targetY + 60);
      node.opacity(0);

      const tween = new Konva.Tween({
        node: node,
        duration: 0.95,
        scaleX: 1,
        scaleY: 1,
        y: targetY,
        opacity: 1,
        easing: Konva.Easings.BackEaseOut,
      });

      const delayTimer = setTimeout(() => {
        tween.play();
      }, slot.id.includes("2") ? 220 : 60);

      return () => {
        clearTimeout(delayTimer);
        tween.destroy();
        node.scale({ x: 1, y: 1 });
        node.y(targetY);
        node.opacity(1);
      };
    }

    if (effectiveAnim === "fade") {
      node.opacity(0);
      const tween = new Konva.Tween({
        node,
        duration: 0.9,
        opacity: 1,
        easing: Konva.Easings.EaseInOut,
      });
      const delayTimer = setTimeout(() => tween.play(), 60);
      return () => {
        clearTimeout(delayTimer);
        tween.destroy();
        node.opacity(1);
      };
    }
  }, [slot.id, slot.type, effectiveAnim, posX, posY, isSelected, isVisible, props.draggable, props.animPreviewNonce, slot.scaleX, slot.scaleY]);

  return (
    <Group
      ref={groupRef}
      x={posX ?? slot.x}
      y={posY ?? slot.y}
      rotation={slot.rotation ?? 0}
      draggable={draggable}
      onClick={props.onClick}
      onTap={props.onClick}
      onDragMove={(e) => {
        // 캔버스 가로/세로 중앙에 가까워지면 자석 스냅 + 가이드라인 통지
        if (!props.onGuideChange || !props.canvasW || !props.canvasH) return;
        const node = e.target;
        const threshold = props.canvasW * 0.015;
        let v = false;
        let h = false;
        const cx = node.x() + slot.w / 2;
        if (Math.abs(cx - props.canvasW / 2) < threshold) {
          node.x(props.canvasW / 2 - slot.w / 2);
          v = true;
        }
        const cy = node.y() + slot.h / 2;
        if (Math.abs(cy - props.canvasH / 2) < threshold) {
          node.y(props.canvasH / 2 - slot.h / 2);
          h = true;
        }
        props.onGuideChange(v, h);
      }}
      onDragEnd={(e) => {
        props.onGuideChange?.(false, false);
        onMoveEnd?.(slot.id, e.target.x(), e.target.y());
      }}
    >
      {renderSlotBody({ ...props, isVisible })}
      {props.movableHint && !isSelected && (
        <Rect
          x={0}
          y={0}
          width={slot.w}
          height={slot.h}
          stroke="#FF66A8"
          strokeWidth={1}
          dash={[4, 6]}
          opacity={0.25}
          listening={false}
        />
      )}
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

function renderSlotBody(props: SlotNodeProps & { isVisible?: boolean }) {
  const { slot } = props;
  switch (slot.type) {
    case "text":
      return <TextSlotBody {...props} />;
    case "image":
      return <ImageSlotBody {...props} />;
    case "asset":
      return <AssetSlotBody {...props} />;
    case "gallery":
      return <GallerySlotBody {...props} />;
    case "calendar":
      return <CalendarSlotBody {...props} />;
    case "qr":
      return <QrSlotBody {...props} />;
    case "map":
      return <ImageSlotBody {...props} />;
    case "countdown":
      return <CountdownSlotBody {...props} />;
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

const TextSlotBody = (props: SlotNodeProps & { isVisible?: boolean }) => {
  const {
    slot,
    userData,
    aiText,
    textOverrides,
    fontOverrides,
    fontSizeOverrides = {},
    isVisible = true,
  } = props;
  const rawText = resolveText(slot, userData, aiText, textOverrides);
  const text =
    slot.text_transform === "upper"
      ? rawText.toUpperCase()
      : slot.text_transform === "lower"
        ? rawText.toLowerCase()
        : rawText;

  // 타이핑 효과 — anim==="typing" 슬롯 (resolveSlotAnim: 사용자 선택 > 템플릿 >
  // love_story_intro 레거시). 드래그(편집) 중에는 전체 텍스트 표시.
  const [displayedText, setDisplayedText] = useState("");
  const isTypingSlot = resolveSlotAnim(slot) === "typing";
  const editable = props.draggable || false;

  useEffect(() => {
    if (!isTypingSlot || editable) {
      setDisplayedText(text);
      return;
    }

    if (!isVisible) {
      setDisplayedText("");
      return;
    }

    let currentText = "";
    let index = 0;
    setDisplayedText("");

    const timer = setInterval(() => {
      if (index < text.length) {
        currentText += text[index];
        setDisplayedText(currentText);
        index++;
      } else {
        clearInterval(timer);
      }
    }, 45); // 타이핑 속도 (글자당 45ms)

    return () => clearInterval(timer);
  }, [text, isTypingSlot, editable, isVisible, props.animPreviewNonce]);

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
      text={isTypingSlot ? displayedText : text}
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
const ImageSlotBody = ({ slot, imageUrls, imageFitOverrides }: SlotNodeProps) => {
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
          text={slot.type === "map" ? "약도 자리" : "사진 자리"}
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

  // 폴라로이드 사진 마스크 패딩 처리
  const isPolaroid = slot.id.includes("photo_1") || slot.id.includes("photo_2") || slot.id.includes("polaroid");

  const padL = isPolaroid ? 18 : 0;
  const padR = isPolaroid ? 18 : 0;
  const padT = isPolaroid ? 18 : 0;
  const padB = isPolaroid ? 60 : 0;

  const contentW = slot.w - (padL + padR);
  const contentH = slot.h - (padT + padB);

  // cover/contain 계산
  const fit = imageFitOverrides?.[slot.id] ?? slot.fit ?? "cover";
  const scale =
    fit === "cover"
      ? Math.max(contentW / img.width, contentH / img.height)
      : Math.min(contentW / img.width, contentH / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const offX = padL + (contentW - drawW) / 2;
  const offY = padT + (contentH - drawH) / 2;

  return (
    <Group clipFunc={(ctx) => {
      ctx.rect(padL, padT, contentW, contentH);
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
/** PNG 스티커 단색 틴트 — 그룹을 캐시해 source-atop 합성이 스티커 실루엣에만 적용되게. */
const TintedRasterAsset = ({
  img,
  w,
  h,
  color,
}: {
  img: HTMLImageElement;
  w: number;
  h: number;
  color: string;
}) => {
  const groupRef = useRef<Konva.Group>(null);
  useEffect(() => {
    const node = groupRef.current;
    if (!node) return;
    node.cache();
    node.getLayer()?.batchDraw();
    return () => {
      node.clearCache();
    };
  }, [img, w, h, color]);
  return (
    <Group ref={groupRef}>
      <KonvaImage image={img} x={0} y={0} width={w} height={h} />
      <Rect
        x={0}
        y={0}
        width={w}
        height={h}
        fill={color}
        globalCompositeOperation="source-atop"
        listening={false}
      />
    </Group>
  );
};

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

// ════════════════════════════════════════════════════════════════
// 갤러리 — `${slot.id}#index` 키의 이미지들을 2열 콜라주로 렌더.
// 공개 뷰어에서 탭하면 라이트박스(뷰어 측 DOM)가 열린다.
// ════════════════════════════════════════════════════════════════

/** imageUrls 에서 갤러리 슬롯의 사진 키들을 index 순으로 수집. */
export const galleryUrlKeys = (
  slotId: string,
  imageUrls: Record<string, string>,
): string[] =>
  Object.keys(imageUrls)
    .filter((k) => k.startsWith(`${slotId}#`))
    .sort((a, b) => Number(a.split("#")[1]) - Number(b.split("#")[1]));

const GALLERY_GAP = 10;

const GallerySlotBody = ({ slot, imageUrls }: SlotNodeProps) => {
  const urls = galleryUrlKeys(slot.id, imageUrls).map((k) => imageUrls[k]);

  if (urls.length === 0) {
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
          text="갤러리 — 사진을 추가하세요"
          fontSize={14}
          fill="#71717A"
          align="center"
        />
      </Group>
    );
  }

  const cols = urls.length === 1 ? 1 : 2;
  const rows = Math.ceil(urls.length / cols);
  const cellW = (slot.w - GALLERY_GAP * (cols - 1)) / cols;
  const cellH = (slot.h - GALLERY_GAP * (rows - 1)) / rows;
  return (
    <Group>
      {urls.map((u, i) => (
        <GalleryCell
          key={`${slot.id}#${i}`}
          url={u}
          x={(i % cols) * (cellW + GALLERY_GAP)}
          y={Math.floor(i / cols) * (cellH + GALLERY_GAP)}
          w={cellW}
          h={cellH}
        />
      ))}
    </Group>
  );
};

const GalleryCell = ({
  url,
  x,
  y,
  w,
  h,
}: {
  url: string;
  x: number;
  y: number;
  w: number;
  h: number;
}) => {
  const [img] = useImage(url, "anonymous");
  if (!img) {
    return <Rect x={x} y={y} width={w} height={h} fill="#E4E4E7" />;
  }
  // cover 크롭
  const scale = Math.max(w / img.width, h / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  return (
    <Group
      clipFunc={(ctx) => {
        ctx.rect(x, y, w, h);
      }}
    >
      <KonvaImage
        image={img}
        x={x + (w - drawW) / 2}
        y={y + (h - drawH) / 2}
        width={drawW}
        height={drawH}
      />
    </Group>
  );
};

const AssetSlotBody = ({ slot, userData }: SlotNodeProps) => {
  const tintedUrl = useMemo(
    () => tintSvgDataUri(slot.image_url, slot.tint_color),
    [slot.image_url, slot.tint_color],
  );
  const [img] = useImage(tintedUrl, "anonymous");
  const isSvg = !!slot.image_url?.startsWith("data:image/svg+xml;base64,");
  if (slot.image_url) {
    if (!img) return null; // 로딩 중엔 아무것도 안 그림 — 점선 깜빡임 방지
    // 래스터(PNG) 스티커의 색상 변경 — SVG 는 위 tintSvgDataUri 가 처리,
    // PNG 는 실루엣 위에 단색을 source-atop 합성(그룹 캐시로 로컬 합성).
    if (slot.tint_color && !isSvg) {
      return (
        <TintedRasterAsset
          img={img}
          w={slot.w}
          h={slot.h}
          color={slot.tint_color}
        />
      );
    }
    return <KonvaImage image={img} x={0} y={0} width={slot.w} height={slot.h} />;
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

// ════════════════════════════════════════════════════════════════
// 카운트다운 타이머 슬롯
// ════════════════════════════════════════════════════════════════
const CountdownSlotBody = ({ slot, userData }: SlotNodeProps) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const dateStr = userData.wedding_date;
  const timeStr = userData.wedding_time ?? "00:00";

  useEffect(() => {
    if (!dateStr) return;

    const dateParts = dateStr.split("-");
    const timeParts = timeStr.split(":");
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const day = parseInt(dateParts[2], 10);
    const hours = parseInt(timeParts[0] || "0", 10);
    const minutes = parseInt(timeParts[1] || "0", 10);
    const targetDate = new Date(year, month, day, hours, minutes, 0);

    if (isNaN(targetDate.getTime())) {
      console.warn("Invalid countdown target date:", dateStr, timeStr);
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [dateStr, timeStr]);

  if (!dateStr) {
    return <PlaceholderInner slot={slot} label="⏳ 결혼 날짜 미입력" />;
  }

  const items = [
    { num: String(timeLeft.days), label: "일" },
    { num: String(timeLeft.hours).padStart(2, "0"), label: "시간" },
    { num: String(timeLeft.minutes).padStart(2, "0"), label: "분" },
    { num: String(timeLeft.seconds).padStart(2, "0"), label: "초" },
  ];

  const cellW = slot.w / 4;
  const numberFontSize = slot.h * 0.45;
  const labelFontSize = slot.h * 0.18;
  const color = slot.color ?? "#8B3E42";

  return (
    <Group>
      {items.map((item, i) => (
        <Group key={i} x={cellW * i}>
          {/* 구분선 (콜론) 표시 - 마지막 셀 제외 */}
          {i < 3 && (
            <Text
              x={cellW - 8}
              y={slot.h * 0.1}
              text=":"
              fontFamily="Tenor Sans, sans-serif"
              fontSize={numberFontSize * 0.8}
              fill={color}
              align="center"
            />
          )}
          {/* 시간 숫자 */}
          <Text
            x={0}
            y={0}
            width={cellW - 10}
            height={slot.h * 0.6}
            text={item.num}
            fontFamily="Tenor Sans, sans-serif"
            fontSize={numberFontSize}
            fill={color}
            align="center"
            verticalAlign="middle"
          />
          {/* 시간 단위 라벨 */}
          <Text
            x={0}
            y={slot.h * 0.62}
            width={cellW - 10}
            height={slot.h * 0.3}
            text={item.label}
            fontFamily="Pretendard, sans-serif"
            fontSize={labelFontSize}
            fill="#71717A"
            align="center"
          />
        </Group>
      ))}
    </Group>
  );
};
