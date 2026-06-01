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

// ── 종이(다중 페이지) ──────────────────────────────
// 종이 청첩장은 seamless roll 이 아니라 일반 paged 레이아웃.
// 페이지마다 자기 캔버스(배경 PNG)를 가질 수 있다 (예: 앞/뒤, newspaper p1~p4).
export const PAPER_PAGE_WIDTH = 800;   // A4 비율 기본값 (관리자가 JSON 에서 조정 가능)
export const PAPER_PAGE_HEIGHT = 1200;
export const PAPER_MAX_PAGES = 8;

export interface PaperPageInput {
  id?: string;
  label?: string;
  w?: number;
  h?: number;
  backgroundUrl?: string;
}

/**
 * 종이 다중 페이지 레이아웃 생성. 숫자를 주면 빈 페이지 N개, 입력 배열을 주면
 * 각 페이지의 크기·배경 이미지를 그대로 반영. slots 는 빈 배열로 시작 (관리자가
 * JSON 에서 슬롯 정의). seamless roll 과 달리 페이지별 크기가 자유롭다.
 */
export function createPaperPagesLayout(
  pagesInput: number | PaperPageInput[] = 2,
): InvitationLayout {
  const inputs: PaperPageInput[] =
    typeof pagesInput === "number"
      ? Array.from(
          { length: Math.max(1, Math.min(PAPER_MAX_PAGES, pagesInput)) },
          () => ({}),
        )
      : pagesInput.length > 0
        ? pagesInput.slice(0, PAPER_MAX_PAGES)
        : [{}];
  const pages = inputs.map((page, index) => {
    const w = page.w && page.w > 0 ? page.w : PAPER_PAGE_WIDTH;
    const h = page.h && page.h > 0 ? page.h : PAPER_PAGE_HEIGHT;
    return {
      id: page.id ?? `page-${String(index + 1).padStart(2, "0")}`,
      label: page.label ?? `${index + 1}P`,
      order: index + 1,
      canvas: {
        w,
        h,
        bg: "#FFFFFF",
        ...(page.backgroundUrl ? { background_url: page.backgroundUrl } : {}),
      },
      slots: [],
    };
  });
  return {
    product_kind: "card",
    presentation: "paged",
    canvas: { ...pages[0].canvas },
    slots: [],
    pages,
  };
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

/**
 * 사용자가 채워야 할 사진 묶음(image_order 그룹). 같은 image_order 슬롯은 한 장을
 * 공유하므로 그룹 단위로 센다. map 슬롯은 약도(사진 아님)라 제외한다.
 * 미리보기에 표시하는 "필요 사진 수"와 실제 분배 로직이 같은 기준을 쓰도록 단일화.
 */
export function getPhotoOrderGroups(layout: InvitationLayout): number[] {
  const imageSlots = getInvitationSlots(layout).filter(
    (s) => s.type === "image",
  );
  return Array.from(
    new Set(imageSlots.map((s) => s.image_order ?? 999)),
  ).sort((a, b) => a - b);
}

/** 이 템플릿이 실제로 요구하는 사진 장수. */
export function requiredPhotoCount(layout: InvitationLayout): number {
  return getPhotoOrderGroups(layout).length;
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
  const inputs: MobileRollFrameInput[] =
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
