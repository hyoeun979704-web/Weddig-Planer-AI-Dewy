import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { Stage, Layer, Rect, Text, Image as KonvaImage, Group, Line } from "react-konva";
import type Konva from "konva";
import useImage from "use-image";
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
  /** slot.id → uploaded image URL */
  imageOverrides: Record<string, string>;
  selectedSlotId: string | null;
  onSelectSlot: (id: string | null) => void;
  /** 화면 표시 폭(px). default 360. */
  displayWidth?: number;
  background?: string;  // 캔버스 외부 영역 배경
}

const InvitationCanvas = forwardRef<InvitationCanvasHandle, Props>(
  (
    {
      layout,
      userData,
      aiText,
      textOverrides,
      imageOverrides,
      selectedSlotId,
      onSelectSlot,
      displayWidth = 360,
      background = "transparent",
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
            {/* 캔버스 배경 */}
            <Rect
              x={0}
              y={0}
              width={canvasW}
              height={canvasH}
              fill={layout.canvas.bg ?? "#FFFFFF"}
              onClick={() => onSelectSlot(null)}
            />

            {/* 슬롯들 z 순서대로 */}
            {[...layout.slots]
              .sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
              .map((slot) => (
                <SlotNode
                  key={slot.id}
                  slot={slot}
                  userData={userData}
                  aiText={aiText}
                  textOverrides={textOverrides}
                  imageOverrides={imageOverrides}
                  isSelected={slot.id === selectedSlotId}
                  onClick={() => onSelectSlot(slot.id)}
                />
              ))}
          </Layer>
        </Stage>
      </div>
    );
  },
);

InvitationCanvas.displayName = "InvitationCanvas";
export default InvitationCanvas;

// ════════════════════════════════════════════════════════════════
// 슬롯 라우터
// ════════════════════════════════════════════════════════════════
interface SlotNodeProps {
  slot: InvitationSlot;
  userData: InvitationUserData;
  aiText: Record<string, string>;
  textOverrides: Record<string, string>;
  imageOverrides: Record<string, string>;
  isSelected: boolean;
  onClick: () => void;
}

const SlotNode = (props: SlotNodeProps) => {
  const { slot, isSelected } = props;

  return (
    <Group
      x={slot.x}
      y={slot.y}
      rotation={slot.rotation ?? 0}
      onClick={props.onClick}
      onTap={props.onClick}
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
      return <PlaceholderSlotBody label="QR 코드" {...props} />;
    case "map":
      return <ImageSlotBody {...props} />;
    default:
      return <PlaceholderSlotBody label="알 수 없는 슬롯" {...props} />;
  }
}

// ════════════════════════════════════════════════════════════════
// 텍스트 슬롯
// ════════════════════════════════════════════════════════════════
function resolveText(
  slot: InvitationSlot,
  userData: InvitationUserData,
  aiText: Record<string, string>,
  textOverrides: Record<string, string>,
): string {
  // priority: textOverrides > aiText > userData[field] > slot.text > placeholder
  if (textOverrides[slot.id] !== undefined) return textOverrides[slot.id];
  if (aiText[slot.id]) return aiText[slot.id];
  if (slot.field && userData[slot.field]) return userData[slot.field]!;
  if (slot.text) return slot.text;
  return slot.placeholder ?? "";
}

const TextSlotBody = ({
  slot,
  userData,
  aiText,
  textOverrides,
}: SlotNodeProps) => {
  const text = resolveText(slot, userData, aiText, textOverrides);
  return (
    <Text
      x={0}
      y={0}
      width={slot.w}
      height={slot.h}
      text={text}
      fontFamily={slot.font_family ?? "Pretendard, sans-serif"}
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
const ImageSlotBody = ({ slot, imageOverrides }: SlotNodeProps) => {
  const url = imageOverrides[slot.id] ?? slot.image_url ?? "";
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
          text="📷 사진 자리"
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
const CalendarSlotBody = ({ slot, userData }: SlotNodeProps) => {
  const dateStr = userData.wedding_date;
  if (!dateStr) {
    return <PlaceholderInner slot={slot} label="📅 결혼 날짜 미입력" />;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return <PlaceholderInner slot={slot} label="📅 날짜 형식 오류" />;
  }

  return <CalendarMonthGrid slot={slot} date={d} />;
};

interface CalendarMonthGridProps {
  slot: InvitationSlot;
  date: Date;
}

const CalendarMonthGrid = ({ slot, date }: CalendarMonthGridProps) => {
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
        fontFamily={slot.font_family ?? "Pretendard, sans-serif"}
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
          fontFamily={slot.font_family ?? "Pretendard, sans-serif"}
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
              fontFamily={slot.font_family ?? "Pretendard, sans-serif"}
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
// Placeholder (qr 등)
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
