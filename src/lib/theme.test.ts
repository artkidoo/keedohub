import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_THEME, parseTheme } from "./theme";

describe("parseTheme", () => {
  it("accepts the two real theme values", () => {
    assert.equal(parseTheme("dark"), "dark");
    assert.equal(parseTheme("light"), "light");
  });

  it("rejects anything else, including an injected or truncated value", () => {
    // Storage is user-writable, so an unexpected string must not become a
    // theme: the caller falls back to the default instead.
    for (const value of [
      "",
      "DARK",
      "system",
      "dark\" onload=\"x",
      null,
      undefined,
      42,
      {},
    ]) {
      assert.equal(parseTheme(value), null);
    }
  });
});

describe("DEFAULT_THEME", () => {
  it("is dark, per the brand direction", () => {
    assert.equal(DEFAULT_THEME, "dark");
  });
});
