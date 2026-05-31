import { describe, it, expect } from "vitest";
import { encodeCode128B, code128Modules, CODE128_PATTERNS } from "./shareCode";

describe("Code128B 인코더", () => {
  it("'A' → start/checksum/stop", () => {
    // Start B=104, 'A'(65)→33, checksum=(104+33*1)%103=137%103=34, stop=106
    expect(encodeCode128B("A")).toEqual([104, 33, 34, 106]);
  });

  it("'AB' 체크섬 (가중치 적용)", () => {
    // A=33,B=34; sum=104+33*1+34*2=205; 205%103=102
    expect(encodeCode128B("AB")).toEqual([104, 33, 34, 102, 106]);
  });

  it("ASCII 경계 매핑", () => {
    expect(encodeCode128B(" ")[1]).toBe(0); // space → 0
    expect(encodeCode128B("~")[1]).toBe(94); // ~ → 94
  });

  it("범위 밖 문자는 '?' 로 대체", () => {
    expect(encodeCode128B("\n")[1]).toBe("?".charCodeAt(0) - 32);
  });

  it("모듈 비트열은 bar 로 시작, 길이 정확", () => {
    const bits = code128Modules("A");
    expect(bits[0]).toBe("1");
    // [104,33,34] 각 11 모듈 + stop(106) 13 = 33+13 = 46
    expect(bits.length).toBe(46);
    // 모든 모듈은 0/1 만
    expect(/^[01]+$/.test(bits)).toBe(true);
  });
});

describe("Code128 패턴 테이블 정합성", () => {
  it("107개 + 표준 앵커", () => {
    expect(CODE128_PATTERNS.length).toBe(107);
    expect(CODE128_PATTERNS[103]).toBe("211412"); // Start A
    expect(CODE128_PATTERNS[104]).toBe("211214"); // Start B
    expect(CODE128_PATTERNS[105]).toBe("211232"); // Start C
    expect(CODE128_PATTERNS[106]).toBe("2331112"); // Stop
  });

  it("0..105 width 합=11, stop=13 (전사 오류 방지)", () => {
    const sum = (p: string) =>
      p.split("").reduce((a, d) => a + Number(d), 0);
    for (let i = 0; i <= 105; i++) {
      expect(sum(CODE128_PATTERNS[i])).toBe(11);
    }
    expect(sum(CODE128_PATTERNS[106])).toBe(13);
  });
});
