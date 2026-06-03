// 시트(여러 스티커가 한 장에 모인 이미지)에서 배경 제거(누끼) + 개별 스티커 분리.
// 전부 브라우저 캔버스로 처리 — 모델 불필요(단색/연한 배경 시트에 최적).

export interface StickerPiece {
  /** 잘라낸 개별 스티커 (투명 PNG) data URL */
  dataUrl: string;
  width: number;
  height: number;
}

export interface SheetSplitOptions {
  /** 배경색과의 거리 허용치(0~80). 클수록 더 많이 지움. */
  bgTolerance?: number;
  /** 이 비율(전체 픽셀 대비) 미만 조각은 잡티로 버림. */
  minAreaFrac?: number;
  /** 스티커 조각을 합치기 위한 마스크 팽창 반복수(0~8). */
  dilate?: number;
}

function dilateMask(m: Uint8Array, W: number, H: number): Uint8Array {
  const o = new Uint8Array(m.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let v = 0;
      for (let dy = -1; dy <= 1 && !v; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < W && ny >= 0 && ny < H && m[ny * W + nx]) {
            v = 1;
            break;
          }
        }
      }
      o[y * W + x] = v;
    }
  }
  return o;
}

/**
 * 시트 이미지를 누끼 + 분리해 개별 스티커 PNG 배열로 반환.
 * 배경색은 네 모서리 평균으로 추정하고, 그 색·근백색을 투명 처리한다.
 */
export function extractStickers(
  img: HTMLImageElement | HTMLCanvasElement,
  opts: SheetSplitOptions = {},
): StickerPiece[] {
  const { bgTolerance = 28, minAreaFrac = 0.0006, dilate = 4 } = opts;
  const W = (img as HTMLImageElement).naturalWidth || img.width;
  const H = (img as HTMLImageElement).naturalHeight || img.height;
  if (!W || !H) return [];

  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;
  ctx.drawImage(img as CanvasImageSource, 0, 0, W, H);
  const id = ctx.getImageData(0, 0, W, H);
  const d = id.data;
  const N = W * H;

  // 배경색 = 네 모서리 평균(불투명 픽셀만)
  const corners: [number, number][] = [
    [2, 2],
    [W - 3, 2],
    [2, H - 3],
    [W - 3, H - 3],
  ];
  let br = 0,
    bg = 0,
    bb = 0,
    cn = 0;
  for (const [x, y] of corners) {
    const i = (y * W + x) * 4;
    if (d[i + 3] > 10) {
      br += d[i];
      bg += d[i + 1];
      bb += d[i + 2];
      cn++;
    }
  }
  const bc = cn ? [br / cn, bg / cn, bb / cn] : [255, 255, 255];

  // 누끼: 배경색 근접 OR 근백색 → 투명
  const mask = new Uint8Array(N);
  const tol3 = bgTolerance * 3;
  for (let p = 0, i = 0; p < N; p++, i += 4) {
    const a = d[i + 3];
    if (a < 10) {
      mask[p] = 0;
      continue;
    }
    const r = d[i],
      g = d[i + 1],
      b = d[i + 2];
    const dist = Math.abs(r - bc[0]) + Math.abs(g - bc[1]) + Math.abs(b - bc[2]);
    if (dist < tol3 || (r > 240 && g > 240 && b > 240)) {
      d[i + 3] = 0;
      mask[p] = 0;
    } else {
      mask[p] = 1;
    }
  }
  ctx.putImageData(id, 0, 0); // 누끼 적용된 캔버스

  // 조각 병합용 팽창
  let m: Uint8Array = mask;
  for (let k = 0; k < dilate; k++) m = dilateMask(m, W, H);

  // 연결성분(4-conn) → 바운딩 박스
  const lab = new Int32Array(N);
  let nl = 0;
  const boxes: { minx: number; miny: number; maxx: number; maxy: number }[] = [];
  const stack: number[] = [];
  for (let s = 0; s < N; s++) {
    if (m[s] && !lab[s]) {
      nl++;
      let minx = W,
        miny = H,
        maxx = 0,
        maxy = 0,
        cnt = 0;
      stack.push(s);
      lab[s] = nl;
      while (stack.length) {
        const q = stack.pop()!;
        const qx = q % W;
        const qy = (q / W) | 0;
        cnt++;
        if (qx < minx) minx = qx;
        if (qx > maxx) maxx = qx;
        if (qy < miny) miny = qy;
        if (qy > maxy) maxy = qy;
        // 좌우는 같은 행일 때만(줄바꿈 wrap 방지)
        if (qx > 0 && m[q - 1] && !lab[q - 1]) {
          lab[q - 1] = nl;
          stack.push(q - 1);
        }
        if (qx < W - 1 && m[q + 1] && !lab[q + 1]) {
          lab[q + 1] = nl;
          stack.push(q + 1);
        }
        if (qy > 0 && m[q - W] && !lab[q - W]) {
          lab[q - W] = nl;
          stack.push(q - W);
        }
        if (qy < H - 1 && m[q + W] && !lab[q + W]) {
          lab[q + W] = nl;
          stack.push(q + W);
        }
      }
      if (cnt > N * minAreaFrac) boxes.push({ minx, miny, maxx, maxy });
    }
  }
  // 위→아래, 좌→우 정렬
  boxes.sort((a, b2) => a.miny - b2.miny || a.minx - b2.minx);

  // 각 박스를 누끼 캔버스에서 크롭
  const pieces: StickerPiece[] = [];
  for (const bx of boxes) {
    const pad = 4;
    const x0 = Math.max(0, bx.minx - pad);
    const y0 = Math.max(0, bx.miny - pad);
    const w = Math.min(W, bx.maxx + pad) - x0;
    const h = Math.min(H, bx.maxy + pad) - y0;
    if (w < 4 || h < 4) continue;
    const c2 = document.createElement("canvas");
    c2.width = w;
    c2.height = h;
    c2.getContext("2d")!.drawImage(cv, x0, y0, w, h, 0, 0, w, h);
    pieces.push({ dataUrl: c2.toDataURL("image/png"), width: w, height: h });
  }
  return pieces;
}

/** data URL → Blob (스토리지 업로드용) */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(head)?.[1] ?? "image/png";
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: mime });
}
