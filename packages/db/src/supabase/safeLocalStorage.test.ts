import { describe, it, expect } from "vitest";
import { createSafeStorage, type SimpleStorage } from "./safeLocalStorage";

const makeMemBacking = (): SimpleStorage => {
  const m = new Map<string, string>();
  return {
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
};

const makeThrowingBacking = (): SimpleStorage => ({
  getItem: () => { throw new Error("blocked"); },
  setItem: () => { throw new Error("blocked"); },
  removeItem: () => { throw new Error("blocked"); },
});

describe("createSafeStorage", () => {
  it("passes through to a working backing", () => {
    const s = createSafeStorage(makeMemBacking());
    s.setItem("a", "1");
    expect(s.getItem("a")).toBe("1");
    s.removeItem("a");
    expect(s.getItem("a")).toBeNull();
  });

  it("never throws when backing throws (iOS private mode) — falls back to memory", () => {
    const s = createSafeStorage(makeThrowingBacking());
    expect(() => s.setItem("token", "abc")).not.toThrow();
    expect(s.getItem("token")).toBe("abc"); // 메모리 폴백으로 읽힘
    expect(() => s.removeItem("token")).not.toThrow();
    expect(s.getItem("token")).toBeNull();
  });

  it("works with no backing (SSR/undefined)", () => {
    const s = createSafeStorage(null);
    s.setItem("x", "y");
    expect(s.getItem("x")).toBe("y");
    expect(s.getItem("missing")).toBeNull();
  });
});
