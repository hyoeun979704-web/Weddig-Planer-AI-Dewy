import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
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
  InvitationSlot,
  InvitationUserData,
} from "@/lib/invitation/types";

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
      shareUrl,
      qrStyle = "basic",
      editable = false,
      positionOverrides = {},
      onMoveSlot,
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
              fill={layout.canvas.bg ?? "#FFFFFF"}
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

            {/* 슬롯들 z 순서대로 */}
            {[...layout.slots]
              .sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
              .map((slot) => {
                // 텍스트·캘린더 슬롯은 폰트가 바뀌거나(고름) 로드 완료되면 재마운트해
                // Konva 가 새 폰트로 글자폭을 다시 측정/렌더하도록 한다.
                // (이미지/QR 슬롯은 stable key 유지 — 불필요한 재로딩 방지)
                const usesFont = slot.type === "text" || slot.type === "calendar";
                const key = usesFont
                  ? `${slot.id}:${fontsReady ? "1" : "0"}:${
                      fontOverrides[slot.id] ?? slot.font_family ?? ""
                    }`
                  : slot.id;
                const pos = positionOverrides[slot.id];
                const draggable =
                  editable && !slot.locked && slot.movable !== false;
                return (
                  <SlotNode
                    key={key}
                    slot={slot}
                    userData={userData}
                    aiText={aiText}
                    textOverrides={textOverrides}
                    imageUrls={imageUrls}
                    fontOverrides={fontOverrides}
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
  shareUrl?: string;
  qrStyle?: ShareCodeStyle;
  isSelected: boolean;
  onClick: () => void;
  posX?: number;
  posY?: number;
  draggable?: boolean;
  onMoveEnd?: (id: string, x: number, y: number) => void;
}

/** 슬롯에 적용할 폰트 family: 사용자 선택 > 템플릿 기본 > fallback */
function resolveFont(
  slot: InvitationSlot,
  fontOverrides: Record<string, string>,
): string {
  return fontOverrides[slot.id] ?? slot.font_family ?? "Pretendard, sans-serif";
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
  if (slot.field && userData[slot.field]) return userData[slot.field]!;
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
}: SlotNodeProps) => {
  const text = resolveText(slot, userData, aiText, textOverrides);
  // 빈 field 슬롯 hide — 사용자가 부모님·계좌 같은 선택 필드를 비워둘 때
  // 빈 줄로 그려져 디자인이 망가지는 걸 방지.
  // 단, ai_promptable 슬롯이나 placeholder 가 있는 슬롯은 그대로 둠 (편집/디자인 의도).
  const isFieldBoundEmpty =
    slot.field &&
    !userData[slot.field] &&
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
      fontSize={slot.font_size ?? 18}
      fontStyle={
        typeof slot.font_weight === "number"
          ? slot.font_weight >= 600
            ? "bold"
            : "normal"
          : (slot.font_weight as string) ?? "normal"
      }
      fill={slot.color ?? "#1A1A1A"}
      align={slot.align ?? "left"}
      lineHeight={slot.line_height ?? 1.4}
      letterSpacing={slot.letter_spacing}
      wrap="word"
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
const AssetSlotBody = ({ slot }: SlotNodeProps) => {
  const [img] = useImage(slot.image_url ?? "", "anonymous");
  if (!img) {
    return (
      <Rect
        x={0}
        y={0}
        width={slot.w}
        height={slot.h}
        fill="transparent"
        stroke="#A1A1AA"
        strokeWidth={1}
        dash={[4, 4]}
      />
    );
  }
  return (
    <KonvaImage
      image={img}
      x={0}
      y={0}
      width={slot.w}
      height={slot.h}
    />
  );
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

  const headerH = slot.h * 0.18;
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
      {/* 헤더: "MM MARCH" 등 */}
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
const QrSlotBody = ({ slot, shareUrl, qrStyle = "basic" }: SlotNodeProps) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

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

  const [img] = useImage(qrDataUrl ?? "", "anonymous");

  if (!shareUrl) {
    return <PlaceholderInner slot={slot} label="QR (발행 후 표시)" />;
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
