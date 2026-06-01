import type {
  InvitationLayout,
  InvitationPageLayout,
  InvitationSlot,
} from "@/lib/invitation/types";

const LEGACY_PAGE_ID = "primary";

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
