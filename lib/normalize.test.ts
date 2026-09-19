import { describe, expect, it } from "vitest";
import { normalizeAnswer } from "./normalize";

describe("normalizeAnswer", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeAnswer("  棒  ")).toBe("棒");
  });

  it("removes internal whitespace", () => {
    expect(normalizeAnswer("記 録")).toBe("記録");
  });

  it("lowercases ascii letters", () => {
    expect(normalizeAnswer("NOT FOUND")).toBe(normalizeAnswer("not found"));
  });

  it("normalizes full-width characters to half-width (NFKC)", () => {
    expect(normalizeAnswer("ＡＢＣ")).toBe("abc");
  });

  it("converts full-width katakana to hiragana", () => {
    expect(normalizeAnswer("ゴロゴロ")).toBe("ごろごろ");
  });

  it("treats katakana and hiragana input as equivalent", () => {
    expect(normalizeAnswer("エッフェルとう")).toBe(normalizeAnswer("エッフェルトウ"));
  });

  it("returns an empty string for blank input", () => {
    expect(normalizeAnswer("   ")).toBe("");
  });
});
