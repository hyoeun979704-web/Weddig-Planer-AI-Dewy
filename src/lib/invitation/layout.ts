import type {
  InvitationLayout,
  InvitationPageLayout,
  InvitationSlot,
} from "@/lib/invitation/types";

const LEGACY_PAGE_ID = "primary";
export const MOBILE_ROLL_WIDTH = 1080;
export const MOBILE_ROLL_FRAME_HEIGHT = 1920;
export const MOBILE_ROLL_MAX_FRAMES = 10;
export const MOBILE_ROLL_MAX_HEIGHT = MOBILE_ROLL_FRAME_HEIGHT * MOBILE_ROLL_MAX_FRAMES;

export interface MobileRollFrameInput {
  id?: string;
  label?: string;
  h?: number;
  backgroundUrl?: string;
}

/** Read V2 pages while keeping every legacy canvas + slots template valid. */
export function getInvitationPages(layout: InvitationLayout): InvitationPageLayout[] {
  if (Array.isArray(layout.pages) && layout.pages.length > 0) {
    return [...layout.pages].sort(
      (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER),
    );
  }
  return [
    {
      id: LEGACY_PAGE_ID,
      label: "1P",
      order: 1,
      canvas: layout.canvas,
      slots: layout.slots,
      print: layout.print,
    },
  ];
}

export function getInvitationSlots(layout: InvitationLayout): InvitationSlot[] {
  return getInvitationPages(layout).flatMap((page) => page.slots);
}

export function pageToLayout(page: InvitationPageLayout): InvitationLayout {
  return {
    canvas: page.canvas,
    slots: page.slots,
    print: page.print,
  };
}

export function isSeamlessRoll(layout: InvitationLayout) {
  return (
    layout.product_kind === "mobile_roll" ||
    layout.presentation === "seamless_roll"
  );
}

export function createMobileRollLayout(
  frames: number | MobileRollFrameInput[] = MOBILE_ROLL_MAX_FRAMES,
): InvitationLayout {
  const inputs =
    typeof frames === "number"
      ? Array.from(
          { length: Math.max(1, Math.min(MOBILE_ROLL_MAX_FRAMES, frames)) },
          () => ({}),
        )
      : frames.length > 0
        ? frames.slice(0, MOBILE_ROLL_MAX_FRAMES)
        : [{}];
  const pages = inputs.map((frame, index) => {
    const h = Math.max(
      1,
      Math.min(MOBILE_ROLL_FRAME_HEIGHT, frame.h ?? MOBILE_ROLL_FRAME_HEIGHT),
    );
    return {
      id: frame.id ?? `frame-${String(index + 1).padStart(2, "0")}`,
      label: frame.label ?? `${index + 1}번 프레임`,
      order: index + 1,
      canvas: {
        w: MOBILE_ROLL_WIDTH,
        h,
        bg: "#FFFFFF",
        ...(frame.backgroundUrl ? { background_url: frame.backgroundUrl } : {}),
      },
      slots: [],
    };
  });
  return {
    product_kind: "mobile_roll",
    presentation: "seamless_roll",
    canvas: {
      w: MOBILE_ROLL_WIDTH,
      h: pages.reduce((total, page) => total + page.canvas.h, 0),
      bg: "#FFFFFF",
      ...(pages[0]?.canvas.background_url
        ? { background_url: pages[0].canvas.background_url }
        : {}),
    },
    slots: [],
    pages,
  };
}

export function validateMobileRollLayout(layout: InvitationLayout): string | null {
  if (!isSeamlessRoll(layout)) return null;
  const pages = getInvitationPages(layout);
  const totalHeight = pages.reduce((total, page) => total + page.canvas.h, 0);
  if (pages.length < 1 || pages.length > MOBILE_ROLL_MAX_FRAMES) {
    return `모바일 롤페이지는 1~${MOBILE_ROLL_MAX_FRAMES}개 프레임만 등록할 수 있어요.`;
  }
  if (layout.canvas.w !== MOBILE_ROLL_WIDTH || layout.canvas.h !== totalHeight) {
    return `전체 캔버스는 ${MOBILE_ROLL_WIDTH}px 폭과 프레임 높이 합계를 사용해야 해요.`;
  }
  if (totalHeight > MOBILE_ROLL_MAX_HEIGHT) {
    return `모바일 롤페이지 높이는 최대 ${MOBILE_ROLL_MAX_HEIGHT}px까지 등록할 수 있어요.`;
  }
  const invalidFrame = pages.find(
    (page) =>
      page.canvas.w !== MOBILE_ROLL_WIDTH ||
      page.canvas.h < 1 ||
      page.canvas.h > MOBILE_ROLL_FRAME_HEIGHT,
  );
  if (invalidFrame) {
    return `각 프레임은 ${MOBILE_ROLL_WIDTH}px 폭, 최대 ${MOBILE_ROLL_FRAME_HEIGHT}px 높이여야 해요.`;
  }
  return null;
}
