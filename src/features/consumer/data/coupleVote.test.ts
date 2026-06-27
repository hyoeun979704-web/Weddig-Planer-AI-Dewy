import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  order: vi.fn(),
  maybeSingle: vi.fn(),
  insert: vi.fn(),
  eq: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => {
  // 체이닝 빌더: select/eq/or 는 자기 자신을 반환하고, 종단 연산(order/maybeSingle/insert)
  // 은 hoisted mock 으로 위임. update().eq() 처럼 .eq() 가 종단이 되는 경우 h.eq 로 위임.
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.or = () => builder;
  builder.update = () => builder;
  builder.eq = (...a: unknown[]) => {
    // update(...).eq(...) 는 결과를 resolve 해야 한다. 단 fetch 쪽 .eq().maybeSingle()
    // 체인을 위해 builder 도 반환 가능해야 하므로, builder 에 then 을 붙여 thenable 로 만든다.
    const r = h.eq(...a);
    return r === undefined ? builder : r;
  };
  builder.maybeSingle = (...a: unknown[]) => h.maybeSingle(...a);
  builder.order = (...a: unknown[]) => h.order(...a);
  builder.insert = (...a: unknown[]) => h.insert(...a);
  return {
    supabase: {
      from: () => builder,
      auth: { getSession: (...a: unknown[]) => h.getSession(...a) },
    },
  };
});

import {
  fetchCoupleVotes,
  fetchCoupleVote,
  fetchLinkedPartnerId,
  createCoupleVote,
  saveCoupleVotePick,
  saveCoupleVoteAISuggestion,
  decideCoupleVote,
  getSessionAccessToken,
} from "./coupleVote";

beforeEach(() => {
  Object.values(h).forEach((m) => m.mockReset());
  // 기본: .eq() 는 빌더로 흐르게(undefined) → fetch 체인이 maybeSingle 로 종단되게.
  h.eq.mockReturnValue(undefined);
});

describe("fetchCoupleVotes", () => {
  it("행 반환", async () => {
    h.order.mockResolvedValue({ data: [{ id: "1" }], error: null });
    expect(await fetchCoupleVotes("u1")).toEqual([{ id: "1" }]);
  });
  it("data null 이면 빈 배열", async () => {
    h.order.mockResolvedValue({ data: null, error: null });
    expect(await fetchCoupleVotes("u1")).toEqual([]);
  });
  it("에러 시 throw", async () => {
    h.order.mockResolvedValue({ data: null, error: new Error("e") });
    await expect(fetchCoupleVotes("u1")).rejects.toThrow("e");
  });
});

describe("fetchCoupleVote", () => {
  it("행 반환", async () => {
    h.maybeSingle.mockResolvedValue({ data: { id: "1" }, error: null });
    expect(await fetchCoupleVote("1")).toEqual({ id: "1" });
  });
  it("없으면 null", async () => {
    h.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await fetchCoupleVote("1")).toBeNull();
  });
  it("에러 시 throw", async () => {
    h.maybeSingle.mockResolvedValue({ data: null, error: new Error("e") });
    await expect(fetchCoupleVote("1")).rejects.toThrow("e");
  });
});

describe("fetchLinkedPartnerId", () => {
  it("내가 user_id 면 partner_user_id 반환", async () => {
    h.maybeSingle.mockResolvedValue({
      data: { user_id: "u1", partner_user_id: "p1" },
      error: null,
    });
    expect(await fetchLinkedPartnerId("u1")).toBe("p1");
  });
  it("내가 partner_user_id 면 user_id 반환", async () => {
    h.maybeSingle.mockResolvedValue({
      data: { user_id: "u1", partner_user_id: "p1" },
      error: null,
    });
    expect(await fetchLinkedPartnerId("p1")).toBe("u1");
  });
  it("링크 없으면 null", async () => {
    h.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await fetchLinkedPartnerId("u1")).toBeNull();
  });
  it("에러 시 throw", async () => {
    h.maybeSingle.mockResolvedValue({ data: null, error: new Error("e") });
    await expect(fetchLinkedPartnerId("u1")).rejects.toThrow("e");
  });
});

describe("createCoupleVote", () => {
  const input = {
    userId: "u1",
    partnerUserId: "p1",
    topic: "t",
    optionA: "a",
    optionB: "b",
  };
  it("성공 시 resolve", async () => {
    h.insert.mockResolvedValue({ error: null });
    await expect(createCoupleVote(input)).resolves.toBeUndefined();
  });
  it("에러 시 throw", async () => {
    h.insert.mockResolvedValue({ error: new Error("e") });
    await expect(createCoupleVote(input)).rejects.toThrow("e");
  });
});

describe("saveCoupleVotePick", () => {
  it("성공 시 resolve", async () => {
    h.eq.mockResolvedValue({ error: null });
    await expect(saveCoupleVotePick("1", { my_pick: "a" })).resolves.toBeUndefined();
  });
  it("에러 시 throw", async () => {
    h.eq.mockResolvedValue({ error: new Error("e") });
    await expect(saveCoupleVotePick("1", { my_pick: "a" })).rejects.toThrow("e");
  });
});

describe("saveCoupleVoteAISuggestion", () => {
  it("성공 시 resolve", async () => {
    h.eq.mockResolvedValue({ error: null });
    await expect(saveCoupleVoteAISuggestion("1", "s")).resolves.toBeUndefined();
  });
  it("에러 시 throw", async () => {
    h.eq.mockResolvedValue({ error: new Error("e") });
    await expect(saveCoupleVoteAISuggestion("1", "s")).rejects.toThrow("e");
  });
});

describe("decideCoupleVote", () => {
  it("성공 시 resolve", async () => {
    h.eq.mockResolvedValue({ error: null });
    await expect(decideCoupleVote("1")).resolves.toBeUndefined();
  });
  it("에러 시 throw", async () => {
    h.eq.mockResolvedValue({ error: new Error("e") });
    await expect(decideCoupleVote("1")).rejects.toThrow("e");
  });
});

describe("getSessionAccessToken", () => {
  it("토큰 반환", async () => {
    h.getSession.mockResolvedValue({ data: { session: { access_token: "tok" } } });
    expect(await getSessionAccessToken()).toBe("tok");
  });
  it("세션 없으면 null", async () => {
    h.getSession.mockResolvedValue({ data: { session: null } });
    expect(await getSessionAccessToken()).toBeNull();
  });
});
