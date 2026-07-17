import { describe, expect, it } from "vitest";

import { renderBanner } from "./banner.js";

describe("banner", () => {
  it("renders without errors", () => {
    const banner = renderBanner();
    expect(banner).toBeTruthy();
    expect(banner).toContain(",---.");
  });

  it("includes the description", () => {
    const banner = renderBanner();
    expect(banner).toContain("Policy-driven workspace linter");
  });

  it("has 9 lines of MONIQ art plus extra lines", () => {
    const banner = renderBanner();
    const lines = banner.split("\n");
    // 9 art lines, 1 blank, 1 description
    expect(lines.length).toBeGreaterThanOrEqual(12);
  });
});
