import { describe, expect, it } from "vitest";

import type { Policy } from "./policy.js";

import { isMatchAny, pickPolicy } from "./matching.js";

describe("isMatchAny", () => {
  it("matches the root pattern '.'", () => {
    expect(isMatchAny(["."], "")).toBe(true);
    expect(isMatchAny(["."], ".")).toBe(true);
    expect(isMatchAny(["."], "packages/a")).toBe(false);
  });

  it("matches everything with '*'", () => {
    expect(isMatchAny(["*"], "")).toBe(true);
    expect(isMatchAny(["*"], "packages/a")).toBe(true);
  });

  it("matches nested paths with '**' but not the root", () => {
    expect(isMatchAny(["**"], "packages/a/src")).toBe(true);
    expect(isMatchAny(["**"], "")).toBe(false);
    expect(isMatchAny(["**"], ".")).toBe(false);
  });

  it("matches single-segment globs without crossing separators", () => {
    expect(isMatchAny(["packages/*"], "packages/core")).toBe(true);
    expect(isMatchAny(["packages/*"], "packages/core/src")).toBe(false);
  });

  it("matches deep globs", () => {
    expect(isMatchAny(["packages/**"], "packages/core/src")).toBe(true);
  });

  it("matches literal paths", () => {
    expect(isMatchAny(["packages/a"], "packages/a")).toBe(true);
    expect(isMatchAny(["packages/a"], "packages/b")).toBe(false);
  });

  it("returns false when no pattern matches", () => {
    expect(isMatchAny(["tools/*"], "packages/a")).toBe(false);
    expect(isMatchAny([], "packages/a")).toBe(false);
  });
});

describe("pickPolicy", () => {
  it("picks the first policy whose include matches", () => {
    const policies: Policy[] = [
      { include: ["packages/*"] },
      { include: ["*"] },
    ];

    expect(pickPolicy(policies, "packages/a")).toBe(policies[0]);
    expect(pickPolicy(policies, "tools/a")).toBe(policies[1]);
  });

  it("defaults include to '*'", () => {
    const policies: Policy[] = [{ severity: "warn" }];

    expect(pickPolicy(policies, "packages/a")).toBe(policies[0]);
  });

  it("skips policies matched by exclude", () => {
    const policies: Policy[] = [
      { exclude: ["packages/a"], include: ["*"] },
      { include: ["*"] },
    ];

    expect(pickPolicy(policies, "packages/a")).toBe(policies[1]);
    expect(pickPolicy(policies, "packages/b")).toBe(policies[0]);
  });

  it("exclude takes precedence over include", () => {
    const policies: Policy[] = [
      { exclude: ["packages/*"], include: ["packages/*"] },
      { include: ["*"] },
    ];

    expect(pickPolicy(policies, "packages/a")).toBe(policies[1]);
  });

  it("returns undefined when no policy matches", () => {
    const policies: Policy[] = [{ include: ["tools/*"] }];

    expect(pickPolicy(policies, "packages/a")).toBeUndefined();
  });
});
