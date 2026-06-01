import { describe, expect, it } from "vitest";
import { pixelRatioForPrint } from "@/lib/invitation/exportPdf";
import {
  getInvitationPages,
  getInvitationSlots,
  pageToLayout,
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
});
