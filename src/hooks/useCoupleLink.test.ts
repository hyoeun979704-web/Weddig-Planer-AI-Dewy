import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// useCoupleLink 가 useQueryClient 를 쓰므로 Provider 로 감싼다.
const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
};

// ── Supabase 모킹 ─────────────────────────────────────────────
// from(...) 체인은 어느 깊이에서 await 해도 {data:[],error:null} 로 resolve 되는
// thenable 빌더를 반환. rpc 는 테스트별로 결과를 주입한다.
const rpcMock = vi.fn();

const makeBuilder = () => {
  const builder: any = {
    select: () => builder,
    or: () => builder,
    in: () => builder,
    eq: () => builder,
    order: () => builder,
    update: () => builder,
    insert: () => builder,
    upsert: () => builder,
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    single: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: (v: { data: unknown[]; error: null }) => void) =>
      resolve({ data: [], error: null }),
  };
  return builder;
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => makeBuilder(),
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "me-123" } }),
}));

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (...a: unknown[]) => toastError(...a),
    success: (...a: unknown[]) => toastSuccess(...a),
  },
}));

import { useCoupleLink } from "./useCoupleLink";

describe("useCoupleLink.linkWithCode", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    toastError.mockReset();
    toastSuccess.mockReset();
  });

  it("redeem_couple_invite RPC 를 정규화된 코드로 호출한다", async () => {
    rpcMock.mockResolvedValue({ data: { ok: true, link_id: "l1" }, error: null });
    const { result } = renderHook(() => useCoupleLink(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let ok = false;
    await act(async () => {
      ok = await result.current.linkWithCode("  ab c2 34 ");
    });

    expect(ok).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith("redeem_couple_invite", {
      p_code: "ABC234",
    });
    expect(toastSuccess).toHaveBeenCalled();
  });

  it("not_found 에러를 사용자 메시지로 매핑하고 false 반환", async () => {
    rpcMock.mockResolvedValue({ data: { ok: false, error: "not_found" }, error: null });
    const { result } = renderHook(() => useCoupleLink(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let ok = true;
    await act(async () => {
      ok = await result.current.linkWithCode("ZZZZZZ");
    });

    expect(ok).toBe(false);
    expect(toastError).toHaveBeenCalledWith(
      expect.stringContaining("초대 코드를 찾을 수 없어요"),
    );
  });

  it("own_code 에러를 매핑한다", async () => {
    rpcMock.mockResolvedValue({ data: { ok: false, error: "own_code" }, error: null });
    const { result } = renderHook(() => useCoupleLink(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.linkWithCode("ABC234");
    });

    expect(toastError).toHaveBeenCalledWith(
      expect.stringContaining("본인의 초대 코드"),
    );
  });

  it("빈 코드는 RPC 호출 없이 막는다", async () => {
    const { result } = renderHook(() => useCoupleLink(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let ok = true;
    await act(async () => {
      ok = await result.current.linkWithCode("   ");
    });

    expect(ok).toBe(false);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
