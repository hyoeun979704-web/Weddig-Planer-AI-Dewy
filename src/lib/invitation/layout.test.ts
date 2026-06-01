import { describe, expect, it } from "vitest";
import { pixelRatioForPrint } from "@/lib/invitation/exportPdf";
import {
  createMobileRollLayout,
  createPaperPagesLayout,
  getInvitationPages,
  getInvitationSlots,
  getPhotoSlotGroups,
  isSeamlessRoll,
  requiredPhotoCount,
  MOBILE_ROLL_FRAME_HEIGHT,
  MOBILE_ROLL_MAX_FRAMES,
  MOBILE_ROLL_MAX_HEIGHT,
  MOBILE_ROLL_WIDTH,
  PAPER_MAX_PAGES,
  PAPER_PAGE_HEIGHT,
  PAPER_PAGE_WIDTH,
  pageToLayout,
  validateMobileRollLayout,
} from "@/lib/invitation/layout";
import type { InvitationLayout } from "@/lib/invitation/types";

describe("invitation layout pages", () => {
  it("treats a legacy layout as one page", () => {
    const layout: InvitationLayout = {
      canvas: { w: 800, h: 1200 },
      slots: [{ id: "names", type: "text", x: 0, y: 0, w: 100, h: 20 }],
    };

    const pages = getInvitationPages(layout);

    expect(pages).toHaveLength(1);
    expect(pages[0].canvas).toEqual(layout.canvas);
    expect(getInvitationSlots(layout)).toEqual(layout.slots);
  });

  it("sorts multi-page layouts and flattens all page slots", () => {
    const layout: InvitationLayout = {
      canvas: { w: 1055, h: 1490 },
      slots: [],
      pages: [
        {
          id: "p2",
          order: 2,
          canvas: { w: 1055, h: 1490 },
          slots: [{ id: "photo-2", type: "image", x: 0, y: 0, w: 100, h: 100 }],
        },
        {
          id: "p1",
          order: 1,
          canvas: { w: 1055, h: 1490 },
          slots: [{ id: "photo-1", type: "image", x: 0, y: 0, w: 100, h: 100 }],
        },
      ],
    };

    const pages = getInvitationPages(layout);

    expect(pages.map((page) => page.id)).toEqual(["p1", "p2"]);
    expect(getInvitationSlots(layout).map((slot) => slot.id)).toEqual([
      "photo-1",
      "photo-2",
    ]);
    expect(pageToLayout(pages[0]).canvas).toEqual(pages[0].canvas);
  });

  it("uses enough pixels for an A4 300dpi export", () => {
    const ratio = pixelRatioForPrint(360, 210);

    expect(Math.round(360 * ratio)).toBe(2480);
    expect(pixelRatioForPrint(360)).toBe(3);
  });

  it("creates a seamless ten-frame mobile roll up to 19200px", () => {
    const layout = createMobileRollLayout(MOBILE_ROLL_MAX_FRAMES);

    expect(layout.canvas).toMatchObject({
      w: MOBILE_ROLL_WIDTH,
      h: MOBILE_ROLL_MAX_HEIGHT,
    });
    expect(layout.pages).toHaveLength(MOBILE_ROLL_MAX_FRAMES);
    expect(layout.pages?.every((page) => page.canvas.h === MOBILE_ROLL_FRAME_HEIGHT)).toBe(true);
    expect(isSeamlessRoll(layout)).toBe(true);
    expect(validateMobileRollLayout(layout)).toBeNull();
  });

  it("keeps a partial last mobile frame and prevents an empty roll", () => {
    const partial = createMobileRollLayout([
      { h: MOBILE_ROLL_FRAME_HEIGHT, backgroundUrl: "/frame-01.png" },
      { h: 480, backgroundUrl: "/frame-02.png" },
    ]);
    const empty = createMobileRollLayout([]);

    expect(partial.canvas).toMatchObject({
      w: MOBILE_ROLL_WIDTH,
      h: MOBILE_ROLL_FRAME_HEIGHT + 480,
      background_url: "/frame-01.png",
    });
    expect(partial.pages).toHaveLength(2);
    expect(empty.pages).toHaveLength(1);
    expect(empty.canvas.h).toBe(MOBILE_ROLL_FRAME_HEIGHT);
  });

  it("rejects a mobile roll with more than ten frames", () => {
    const layout = createMobileRollLayout(MOBILE_ROLL_MAX_FRAMES);
    layout.pages = [
      ...(layout.pages ?? []),
      {
        id: "frame-11",
        canvas: { w: MOBILE_ROLL_WIDTH, h: MOBILE_ROLL_FRAME_HEIGHT },
        slots: [],
      },
    ];
    layout.canvas.h += MOBILE_ROLL_FRAME_HEIGHT;

    expect(validateMobileRollLayout(layout)).toContain("1~10");
  });

  it("creates paged paper layout with default size and is not a seamless roll", () => {
    const layout = createPaperPagesLayout(3);

    expect(layout.pages).toHaveLength(3);
    expect(getInvitationPages(layout)).toHaveLength(3);
    expect(layout.canvas).toMatchObject({
      w: PAPER_PAGE_WIDTH,
      h: PAPER_PAGE_HEIGHT,
    });
    expect(isSeamlessRoll(layout)).toBe(false); // paged, never seamless
    expect(validateMobileRollLayout(layout)).toBeNull();
    expect(layout.pages?.map((page) => page.id)).toEqual([
      "page-01",
      "page-02",
      "page-03",
    ]);
  });

  it("applies per-image size and background when registering paper pages", () => {
    const layout = createPaperPagesLayout([
      { w: 1240, h: 1754, backgroundUrl: "/front.png" },
      { w: 1240, h: 1754, backgroundUrl: "/back.png" },
    ]);

    expect(layout.pages).toHaveLength(2);
    expect(layout.canvas).toMatchObject({ w: 1240, h: 1754 });
    expect(layout.pages?.[0].canvas).toMatchObject({
      w: 1240,
      h: 1754,
      background_url: "/front.png",
    });
    expect(layout.pages?.[1].canvas.background_url).toBe("/back.png");
    expect(getInvitationSlots(layout)).toEqual([]);
  });

  it("shares one photo per image_order group but excludes map slots", () => {
    const layout: InvitationLayout = {
      canvas: { w: 1500, h: 1058 },
      slots: [
        // 원본 + 누끼 슬롯이 같은 image_order=1 → 사진 1장 공유
        { id: "photo", type: "image", x: 0, y: 0, w: 10, h: 10, image_order: 1 },
        { id: "photo_cut", type: "image", x: 0, y: 0, w: 10, h: 10, image_order: 1 },
        // 다른 그룹 → 사진 1장 추가
        { id: "photo2", type: "image", x: 0, y: 0, w: 10, h: 10, image_order: 2 },
        // map 슬롯은 약도 → 사진 수에 포함 안 됨
        { id: "map", type: "map", x: 0, y: 0, w: 10, h: 10 },
        { id: "names", type: "text", x: 0, y: 0, w: 10, h: 10 },
      ],
    };

    expect(getPhotoSlotGroups(layout)).toEqual(["order:1", "order:2"]);
    expect(requiredPhotoCount(layout)).toBe(2);
  });

  it("counts each image slot WITHOUT image_order as its own photo", () => {
    // 폴라로이드 콜라주처럼 image_order 없는 슬롯들은 각자 다른 사진이 필요.
    const layout: InvitationLayout = {
      canvas: { w: 1080, h: 1920 },
      slots: [
        { id: "p1", type: "image", x: 0, y: 0, w: 10, h: 10 },
        { id: "p2", type: "image", x: 0, y: 0, w: 10, h: 10 },
        { id: "p3", type: "image", x: 0, y: 0, w: 10, h: 10 },
        { id: "map", type: "map", x: 0, y: 0, w: 10, h: 10 },
      ],
    };

    expect(getPhotoSlotGroups(layout)).toEqual(["slot:p1", "slot:p2", "slot:p3"]);
    expect(requiredPhotoCount(layout)).toBe(3);
  });

  it("returns zero required photos for a text/map-only layout", () => {
    const layout: InvitationLayout = {
      canvas: { w: 800, h: 1200 },
      slots: [
        { id: "map", type: "map", x: 0, y: 0, w: 10, h: 10 },
        { id: "greeting", type: "text", x: 0, y: 0, w: 10, h: 10 },
      ],
    };
    expect(requiredPhotoCount(layout)).toBe(0);
  });

  it("clamps paper pages to the maximum and never produces an empty layout", () => {
    expect(createPaperPagesLayout(PAPER_MAX_PAGES + 5).pages).toHaveLength(
      PAPER_MAX_PAGES,
    );
    expect(createPaperPagesLayout([]).pages).toHaveLength(1);
  });
});
