import { describe, it, expect, vi, beforeEach } from "vitest";

// 멀티스텝 빌더는 thenable — 마지막 메서드 호출이 아니라 await 시점에 결과를 돌려준다.
// in/order 로 끝나는 체인과 maybeSingle 로 끝나는 체인을 모두 커버하려고 빌더 자체를
// thenable 로 만들고, 필요 시 maybeSingle 을 별도 mock 으로 가로챈다.
const h = vi.hoisted(() => ({
  result: { data: null as unknown, error: null as unknown },
  maybeSingle: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.in = () => builder;
  builder.order = () => builder;
  builder.update = () => builder;
  builder.maybeSingle = (...a: unknown[]) => h.maybeSingle(...a);
  // await builder → result (in/order 로 끝나는 조회 + update)
  builder.then = (resolve: (v: unknown) => unknown) => resolve(h.result);
  return {
    supabase: {
      from: () => builder,
      rpc: (...a: unknown[]) => h.rpc(...a),
    },
  };
});

import {
  fetchMyInvitations,
  fetchPublishedInvitation,
  fetchRsvpMeta,
  fetchBackTemplateLayout,
  fetchInvitationOwnerMeta,
  fetchMobileInvitation,
  setRsvpClosed,
  setRsvpDeadline,
  submitRsvp,
  updateRsvp,
} from "./invitationView";

const payload = {
  name: "홍길동",
  is_attending: true,
  side: "groom",
  meal_preference: "yes",
  companion_count: 1,
  child_count: 0,
  message: null,
};

beforeEach(() => {
  h.result = { data: null, error: null };
  h.maybeSingle.mockReset();
  h.rpc.mockReset();
});

describe("fetchMyInvitations", () => {
  it("행 반환", async () => {
    h.result = { data: [{ id: "1", user_id: "u1" }], error: null };
    expect(await fetchMyInvitations(["u1"])).toEqual([{ id: "1", user_id: "u1" }]);
  });
  it("에러 시 빈 배열", async () => {
    h.result = { data: null, error: new Error("e") };
    expect(await fetchMyInvitations(["u1"])).toEqual([]);
  });
});

describe("fetchPublishedInvitation", () => {
  it("행 반환", async () => {
    h.maybeSingle.mockResolvedValue({ data: { id: "1" }, error: null });
    expect(await fetchPublishedInvitation("s")).toEqual({ id: "1" });
  });
  it("없으면 null", async () => {
    h.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await fetchPublishedInvitation("s")).toBeNull();
  });
  it("에러면 null", async () => {
    h.maybeSingle.mockResolvedValue({ data: null, error: new Error("e") });
    expect(await fetchPublishedInvitation("s")).toBeNull();
  });
});

describe("fetchRsvpMeta", () => {
  it("메타 반환", async () => {
    h.maybeSingle.mockResolvedValue({ data: { rsvp_closed: true, rsvp_deadline: null } });
    expect(await fetchRsvpMeta("1")).toEqual({ rsvp_closed: true, rsvp_deadline: null });
  });
  it("없으면 null", async () => {
    h.maybeSingle.mockResolvedValue({ data: null });
    expect(await fetchRsvpMeta("1")).toBeNull();
  });
});

describe("fetchBackTemplateLayout", () => {
  it("layout 반환", async () => {
    h.maybeSingle.mockResolvedValue({ data: { layout: { a: 1 } } });
    expect(await fetchBackTemplateLayout("t")).toEqual({ a: 1 });
  });
  it("없으면 null", async () => {
    h.maybeSingle.mockResolvedValue({ data: null });
    expect(await fetchBackTemplateLayout("t")).toBeNull();
  });
});

describe("fetchInvitationOwnerMeta", () => {
  it("메타 반환", async () => {
    h.maybeSingle.mockResolvedValue({ data: { user_id: "u1", user_data: null } });
    expect(await fetchInvitationOwnerMeta("1")).toEqual({ user_id: "u1", user_data: null });
  });
  it("없으면 null", async () => {
    h.maybeSingle.mockResolvedValue({ data: null });
    expect(await fetchInvitationOwnerMeta("1")).toBeNull();
  });
});

describe("fetchMobileInvitation", () => {
  it("행 반환", async () => {
    h.maybeSingle.mockResolvedValue({ data: { user_data: {}, layout: {} }, error: null });
    expect(await fetchMobileInvitation("s")).toEqual({ user_data: {}, layout: {} });
  });
  it("에러면 null", async () => {
    h.maybeSingle.mockResolvedValue({ data: null, error: new Error("e") });
    expect(await fetchMobileInvitation("s")).toBeNull();
  });
});

describe("setRsvpClosed", () => {
  it("성공 시 resolve", async () => {
    h.result = { data: null, error: null };
    await expect(setRsvpClosed("1", true)).resolves.toBeUndefined();
  });
  it("에러 시 throw", async () => {
    h.result = { data: null, error: new Error("e") };
    await expect(setRsvpClosed("1", true)).rejects.toThrow("e");
  });
});

describe("setRsvpDeadline", () => {
  it("성공 시 resolve", async () => {
    h.result = { data: null, error: null };
    await expect(setRsvpDeadline("1", "2026-07-01")).resolves.toBeUndefined();
  });
  it("에러 시 throw", async () => {
    h.result = { data: null, error: new Error("e") };
    await expect(setRsvpDeadline("1", "")).rejects.toThrow("e");
  });
});

describe("submitRsvp", () => {
  it("created 반환", async () => {
    h.rpc.mockResolvedValue({ data: { id: "r1", edit_token: "t1" }, error: null });
    expect(await submitRsvp("inv1", payload)).toEqual({ id: "r1", edit_token: "t1" });
  });
  it("배열 응답이면 첫 항목", async () => {
    h.rpc.mockResolvedValue({ data: [{ id: "r2", edit_token: "t2" }], error: null });
    expect(await submitRsvp("inv1", payload)).toEqual({ id: "r2", edit_token: "t2" });
  });
  it("에러 시 throw", async () => {
    h.rpc.mockResolvedValue({ data: null, error: new Error("rsvp_closed") });
    await expect(submitRsvp("inv1", payload)).rejects.toThrow("rsvp_closed");
  });
});

describe("updateRsvp", () => {
  it("성공 시 resolve", async () => {
    h.rpc.mockResolvedValue({ data: null, error: null });
    await expect(updateRsvp("r1", "t1", payload)).resolves.toBeUndefined();
  });
  it("에러 시 throw", async () => {
    h.rpc.mockResolvedValue({ data: null, error: new Error("rsvp_not_found_or_bad_token") });
    await expect(updateRsvp("r1", "t1", payload)).rejects.toThrow("rsvp_not_found_or_bad_token");
  });
});
