import { describe, it, expect } from "vitest";
import { mapAuthError } from "./authErrors";

describe("mapAuthError", () => {
  it("maps iOS Safari 'Load failed' to a network message", () => {
    const r = mapAuthError("Load failed");
    expect(r.known).toBe(true);
    expect(r.message).toContain("네트워크");
  });
  it("maps Chrome 'Failed to fetch' to network too", () => {
    expect(mapAuthError("TypeError: Failed to fetch").known).toBe(true);
  });
  it("maps already-registered", () => {
    expect(mapAuthError("User already registered").message).toContain("이미 가입");
  });
  it("maps rate limit / security throttle", () => {
    expect(mapAuthError("Email rate limit exceeded").known).toBe(true);
    expect(mapAuthError("For security purposes, you can only request this after 51 seconds").known).toBe(true);
  });
  it("maps invalid login and unconfirmed email", () => {
    expect(mapAuthError("Invalid login credentials").message).toContain("올바르지");
    expect(mapAuthError("Email not confirmed").message).toContain("인증");
  });
  it("maps weak password and invalid email", () => {
    expect(mapAuthError("Password should be at least 6 characters").message).toContain("비밀번호");
    expect(mapAuthError("Unable to validate email address: invalid format").message).toContain("이메일");
  });
  it("returns known=false generic for unmapped/empty", () => {
    expect(mapAuthError("some brand new error").known).toBe(false);
    expect(mapAuthError("").known).toBe(false);
    expect(mapAuthError(null).known).toBe(false);
  });
});
