/**
 * 모바일 청첩장 공유 코드 — 3가지 스타일.
 *
 *   · basic   — 기본 QR
 *   · heart   — 중앙 하트 QR (errorCorrectionLevel 'H' 로 중앙 가림 보정)
 *   · barcode — share URL 을 Code128B 1D 바코드로 인코딩 (스캔 가능)
 *
 * 발행된 모바일 청첩장의 share URL 을 받아 캔버스에 렌더하고, PNG 로 다운로드한다.
 * Code128 인코더(encodeCode128B / code128Modules)는 순수 함수라 shareCode.test.ts
 * 에서 단위 테스트. 패턴 테이블은 표준 Code128 (0..106) 그대로.
 */
import QRCode from "qrcode";

export type ShareCodeStyle = "basic" | "heart" | "barcode";

export const SHARE_CODE_STYLES: { value: ShareCodeStyle; label: string }[] = [
  { value: "basic", label: "기본" },
  { value: "heart", label: "하트 포함" },
  { value: "barcode", label: "바코드" },
];

export function shareCodeFilename(style: ShareCodeStyle): string {
  return `dewy-invitation-${style}.png`;
}

// ════════════════════════════════════════════════════════════════
// Code128B 인코더 (순수 — 단위 테스트 대상)
// ════════════════════════════════════════════════════════════════

/** 표준 Code128 패턴 테이블 (값 0..106). 0..105 는 width 합 11, 106(stop) 은 13. */
export const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

const START_B = 104;
const STOP = 106;

/** Code128B 코드값 배열 (start + data + checksum + stop) 반환. */
export function encodeCode128B(text: string): number[] {
  const values: number[] = [START_B];
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    // Code128B 는 ASCII 32~126 만 지원. 범위 밖 문자는 '?'(31) 로 대체.
    values.push(code >= 32 && code <= 126 ? code - 32 : "?".charCodeAt(0) - 32);
  }
  let sum = START_B;
  for (let i = 1; i < values.length; i++) sum += values[i] * i;
  values.push(sum % 103);
  values.push(STOP);
  return values;
}

/** quiet zone 제외한 바 모듈 비트열 ('1'=bar, '0'=space). 각 패턴은 bar 로 시작. */
export function code128Modules(text: string): string {
  const values = encodeCode128B(text);
  let bits = "";
  for (const v of values) {
    const widths = CODE128_PATTERNS[v];
    for (let e = 0; e < widths.length; e++) {
      const w = Number(widths[e]);
      bits += (e % 2 === 0 ? "1" : "0").repeat(w);
    }
  }
  return bits;
}

// ════════════════════════════════════════════════════════════════
// 캔버스 렌더 (브라우저 전용)
// ════════════════════════════════════════════════════════════════

const QR_SIZE = 512;
const BARCODE_QUIET = 10; // modules

/** 선택한 스타일을 canvas 에 그린다. (canvas 크기는 함수가 설정) */
export async function drawShareCode(
  canvas: HTMLCanvasElement,
  url: string,
  style: ShareCodeStyle,
): Promise<void> {
  if (style === "barcode") {
    drawBarcode(canvas, url);
    return;
  }
  await QRCode.toCanvas(canvas, url, {
    width: QR_SIZE,
    margin: 2,
    errorCorrectionLevel: style === "heart" ? "H" : "M",
    color: { dark: "#1A1A1A", light: "#FFFFFF" },
  });
  if (style === "heart") {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = canvas.width;
    const box = s * 0.26;
    const cx = s / 2;
    const cy = s / 2;
    ctx.fillStyle = "#FFFFFF";
    roundRect(ctx, cx - box / 2, cy - box / 2, box, box, box * 0.18);
    ctx.fill();
    drawHeart(ctx, cx, cy, box * 0.62, "#E0364B");
  }
}

/**
 * 오프스크린 캔버스에 그려 PNG dataURL 을 반환한다.
 * 청첩장 캔버스의 QR 슬롯(Konva)과 공유 카드가 같은 렌더 로직을 공유하게 한다.
 */
export async function shareCodeToDataUrl(
  url: string,
  style: ShareCodeStyle,
): Promise<string> {
  const canvas = document.createElement("canvas");
  await drawShareCode(canvas, url, style);
  return canvas.toDataURL("image/png");
}

function drawBarcode(canvas: HTMLCanvasElement, url: string) {
  const bits = code128Modules(url);
  const moduleW = 2;
  const totalModules = bits.length + BARCODE_QUIET * 2;
  const barH = 180;
  const padY = 16;
  const captionH = 30;

  canvas.width = totalModules * moduleW;
  canvas.height = barH + padY * 2 + captionH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#1A1A1A";
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === "1") {
      ctx.fillRect((BARCODE_QUIET + i) * moduleW, padY, moduleW, barH);
    }
  }

  ctx.fillStyle = "#666666";
  ctx.font = "18px monospace";
  ctx.textAlign = "center";
  const caption = url.length > 52 ? `${url.slice(0, 51)}…` : url;
  ctx.fillText(caption, canvas.width / 2, barH + padY + 22);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawHeart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
  color: string,
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  const topY = cy - s * 0.3;
  ctx.moveTo(cx, cy + s * 0.4);
  ctx.bezierCurveTo(cx + s * 0.6, cy - s * 0.1, cx + s * 0.3, topY - s * 0.4, cx, cy - s * 0.05);
  ctx.bezierCurveTo(cx - s * 0.3, topY - s * 0.4, cx - s * 0.6, cy - s * 0.1, cx, cy + s * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
