import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PartnerLinkCard from "./PartnerLinkCard";

// Mocks must be declared with vi.mock *before* the import below resolves.
// The hooks pull from AuthContext and the supabase client, so we mock the
// surface our component touches: useCoupleLink + useAuth.
const mockGenerateInviteCode = vi.fn();
const mockRegenerateInviteCode = vi.fn();
const mockLinkWithCode = vi.fn();
const mockUnlinkCouple = vi.fn();

type MockCoupleLinkState = {
  coupleLink: null | {
    id: string;
    user_id: string;
    partner_user_id: string | null;
    invite_code: string;
    status: "pending" | "linked" | "unlinked";
    linked_at: string | null;
  };
  partnerProfile: null | { display_name: string | null; email: string | null };
  isLinked: boolean;
  isLoading: boolean;
};

let mockState: MockCoupleLinkState = {
  coupleLink: null,
  partnerProfile: null,
  isLinked: false,
  isLoading: false,
};

vi.mock("@/hooks/useCoupleLink", () => ({
  useCoupleLink: () => ({
    coupleLink: mockState.coupleLink,
    partnerProfile: mockState.partnerProfile,
    isLinked: mockState.isLinked,
    isLoading: mockState.isLoading,
    generateInviteCode: mockGenerateInviteCode,
    regenerateInviteCode: mockRegenerateInviteCode,
    linkWithCode: mockLinkWithCode,
    unlinkCouple: mockUnlinkCouple,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-a", email: "test@dewy.app" },
    session: null,
    isLoading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    signInWithGoogle: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const renderCard = (variant: "mypage" | "budget" | "schedule" = "mypage") =>
  render(
    <MemoryRouter>
      <PartnerLinkCard variant={variant} />
    </MemoryRouter>
  );

beforeEach(() => {
  mockGenerateInviteCode.mockReset();
  mockRegenerateInviteCode.mockReset();
  mockLinkWithCode.mockReset();
  mockUnlinkCouple.mockReset();
  mockState = {
    coupleLink: null,
    partnerProfile: null,
    isLinked: false,
    isLoading: false,
  };
});

describe("PartnerLinkCard — loading state", () => {
  it("renders a spinner while the hook is loading", () => {
    mockState.isLoading = true;
    renderCard();
    expect(screen.getByTestId("partner-link-card")).toHaveAttribute("data-state", "loading");
  });
});

describe("PartnerLinkCard — unlinked state", () => {
  it("shows variant-specific copy and the primary CTA", () => {
    renderCard("budget");
    const card = screen.getByTestId("partner-link-card");
    expect(card).toHaveAttribute("data-state", "unlinked");
    expect(screen.getByText("예산을 함께 관리해요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /초대 코드 생성/ })).toBeInTheDocument();
  });

  it("calls generateInviteCode when the primary CTA is clicked", async () => {
    mockGenerateInviteCode.mockResolvedValue("ABCD23");
    renderCard("mypage");
    fireEvent.click(screen.getByRole("button", { name: /초대 코드 생성/ }));
    await waitFor(() => expect(mockGenerateInviteCode).toHaveBeenCalledTimes(1));
  });

  it("reveals the code input on demand and calls linkWithCode with the entered code", async () => {
    mockLinkWithCode.mockResolvedValue(true);
    renderCard("schedule");

    // Input field is hidden initially — clicking the toggle reveals it.
    fireEvent.click(screen.getByText(/파트너가 먼저 코드를 만들었나요/));

    const input = screen.getByLabelText("파트너의 초대 코드") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "abcd23" } });
    // Normalize: lowercase → uppercase and whitespace stripped.
    expect(input.value).toBe("ABCD23");

    fireEvent.click(screen.getByRole("button", { name: "연결" }));
    await waitFor(() =>
      expect(mockLinkWithCode).toHaveBeenCalledWith("ABCD23")
    );
  });
});

describe("PartnerLinkCard — pending state", () => {
  beforeEach(() => {
    mockState = {
      coupleLink: {
        id: "link-1",
        user_id: "user-a",
        partner_user_id: null,
        invite_code: "ABCD23",
        status: "pending",
        linked_at: null,
      },
      partnerProfile: null,
      isLinked: false,
      isLoading: false,
    };
  });

  it("renders the invite code prominently", () => {
    renderCard("mypage");
    const card = screen.getByTestId("partner-link-card");
    expect(card).toHaveAttribute("data-state", "pending");
    expect(screen.getByText("ABCD23")).toBeInTheDocument();
  });

  it("copies the bare code to clipboard via the icon button", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    renderCard("mypage");
    fireEvent.click(screen.getByLabelText("초대 코드 복사"));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("ABCD23"));
  });

  it("shares an invite message via Web Share when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { share });

    renderCard("budget");
    fireEvent.click(screen.getByRole("button", { name: /파트너에게 초대 코드 공유/ }));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const arg = share.mock.calls[0][0] as { title: string; text: string };
    expect(arg.text).toContain("ABCD23");
  });

  it("requires a confirmation step before regenerating the invite code", async () => {
    mockRegenerateInviteCode.mockResolvedValue("WXYZ89");
    renderCard("mypage");

    // First click reveals the confirm row — does not regenerate yet.
    fireEvent.click(screen.getByLabelText("초대 코드 재발급"));
    expect(mockRegenerateInviteCode).not.toHaveBeenCalled();

    // Second click on the explicit confirm button performs the action.
    fireEvent.click(screen.getByRole("button", { name: "새 코드 발급" }));
    await waitFor(() => expect(mockRegenerateInviteCode).toHaveBeenCalledTimes(1));
  });
});

describe("PartnerLinkCard — linked state", () => {
  beforeEach(() => {
    mockState = {
      coupleLink: {
        id: "link-1",
        user_id: "user-a",
        partner_user_id: "user-b",
        invite_code: "ABCD23",
        status: "linked",
        linked_at: "2026-05-15T10:00:00Z",
      },
      partnerProfile: { display_name: "지윤", email: "jiyoon@dewy.app" },
      isLinked: true,
      isLoading: false,
    };
  });

  it("shows the partner's name and the linked-state subtitle", () => {
    renderCard("mypage");
    const card = screen.getByTestId("partner-link-card");
    expect(card).toHaveAttribute("data-state", "linked");
    expect(screen.getByText("지윤")).toBeInTheDocument();
    expect(screen.getByText("둘이서 함께 준비 중")).toBeInTheDocument();
  });

  it("offers a variant-specific deep-link CTA", () => {
    renderCard("budget");
    expect(screen.getByText("분담 시뮬레이션")).toBeInTheDocument();
  });

  it("requires a confirmation step before unlinking", async () => {
    mockUnlinkCouple.mockResolvedValue(true);
    renderCard("schedule");

    // First click toggles the confirm row — does not unlink yet.
    fireEvent.click(screen.getByText("연결 해제"));
    expect(mockUnlinkCouple).not.toHaveBeenCalled();

    // Second click on the explicit destructive button performs the action.
    fireEvent.click(screen.getByRole("button", { name: "연결 해제" }));
    await waitFor(() => expect(mockUnlinkCouple).toHaveBeenCalledTimes(1));
  });
});
