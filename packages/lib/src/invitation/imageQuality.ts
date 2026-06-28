// 업로드 사진의 인쇄 해상도 점검.
//
// 종이(paper) 청첩장은 인쇄소에 300dpi 로 출력되므로, 사진이 너무 작으면
// 인쇄 시 흐려진다. 업로드 시 가로/세로를 측정해 권장 해상도 미만이면 경고한다
// (차단하지 않음 — 사용자가 가진 사진으로 진행할 수 있게).
//
// 기준: 일반적인 카드 사진 영역(약 100~130mm)을 300dpi 로 채우려면 ~1200px 이상이
// 필요. 모바일(화면 전용) 청첩장은 인쇄하지 않으므로 검사하지 않는다.

/** 권장 최소 변(짧은 쪽) 픽셀. 종이 인쇄용. */
export const PRINT_MIN_PX = 1200;

/** File 의 픽셀 크기를 읽는다. 실패 시 null. */
export async function readImageSize(
  file: File,
): Promise<{ width: number; height: number } | null> {
  // createImageBitmap 이 가장 빠르고 DOM 불필요
  try {
    if (typeof createImageBitmap === "function") {
      const bmp = await createImageBitmap(file);
      const size = { width: bmp.width, height: bmp.height };
      bmp.close?.();
      if (size.width && size.height) return size;
    }
  } catch {
    /* HTMLImageElement 폴백으로 */
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/**
 * 인쇄(종이) 기준 저해상도 경고 문구. 충분하거나 종이가 아니면 null.
 * format !== 'paper' (모바일/화면) 은 검사 생략.
 */
export function lowResPrintWarning(
  size: { width: number; height: number } | null,
  format?: string,
): string | null {
  if (!size || format !== "paper") return null;
  const minSide = Math.min(size.width, size.height);
  if (minSide < PRINT_MIN_PX) {
    return `사진 해상도가 낮아요 (${size.width}×${size.height}). 인쇄 시 흐릴 수 있어요 — 짧은 변 ${PRINT_MIN_PX}px 이상을 권장해요.`;
  }
  return null;
}
