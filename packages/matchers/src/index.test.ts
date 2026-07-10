import { describe, expect, it } from "vitest";

import { bin } from "./index.js";

describe("bin", () => {
  it("matches a simple command", () => {
    const match = bin("eslint");
    expect(match("eslint .")).toBe(true);
  });

  it("matches with environment variable prefix", () => {
    const match = bin("eslint");
    expect(match("NODE_ENV=test eslint .")).toBe(true);
  });

  it("matches with multiple environment variable prefixes", () => {
    const match = bin("eslint");
    expect(match("A=1 B=2 eslint .")).toBe(true);
  });

  it("matches with npx wrapper", () => {
    const match = bin("eslint");
    expect(match("npx eslint .")).toBe(true);
  });

  it("matches with pnpm exec wrapper", () => {
    const match = bin("eslint");
    expect(match("pnpm exec eslint .")).toBe(true);
  });

  it("matches with pnpm dlx wrapper", () => {
    const match = bin("eslint");
    expect(match("pnpm dlx eslint .")).toBe(true);
  });

  it("matches with yarn wrapper", () => {
    const match = bin("eslint");
    expect(match("yarn eslint .")).toBe(true);
  });

  it("matches with yarn dlx wrapper", () => {
    const match = bin("eslint");
    expect(match("yarn dlx eslint .")).toBe(true);
  });

  it("matches with bunx wrapper", () => {
    const match = bin("eslint");
    expect(match("bunx eslint .")).toBe(true);
  });

  it("matches with node wrapper and a path", () => {
    const match = bin("eslint");
    expect(match("node ./node_modules/.bin/eslint .")).toBe(true);
  });

  it("does not match when node flags obscure the binary", () => {
    const match = bin("tsup");
    expect(
      match(
        "node --experimental-loader ./loader ./node_modules/.bin/tsup build",
      ),
    ).toBe(false);
  });

  it("matches a binary at a full path", () => {
    const match = bin("eslint");
    expect(match("/usr/local/bin/eslint .")).toBe(true);
  });

  it("matches a binary with a version suffix", () => {
    const match = bin("eslint");
    expect(match("eslint@9.0.0 .")).toBe(true);
  });

  it("matches a scoped package binary", () => {
    const match = bin("@biomejs/biome");
    expect(match("@biomejs/biome check .")).toBe(true);
  });

  it("matches a scoped package binary with version", () => {
    const match = bin("@biomejs/biome");
    expect(match("@biomejs/biome@1.9.0 check .")).toBe(true);
  });

  it("rejects a random command that happens to contain the name", () => {
    const match = bin("eslint");
    expect(match("nonsense eslint whatever")).toBe(false);
  });

  it("rejects an empty command", () => {
    const match = bin("eslint");
    expect(match("")).toBe(false);
  });

  it("rejects when only env vars are present", () => {
    const match = bin("eslint");
    expect(match("NODE_ENV=test PATH=/usr/bin")).toBe(false);
  });

  it("rejects a different binary", () => {
    const match = bin("eslint");
    expect(match("prettier --write .")).toBe(false);
  });

  it("strips nested wrappers", () => {
    const match = bin("eslint");
    expect(match("npx yarn eslint .")).toBe(true);
  });

  it("works with an exact string match (no args)", () => {
    const match = bin("tsup");
    expect(match("tsup")).toBe(true);
  });

  it("matches with npx -y boolean flag", () => {
    const match = bin("eslint");
    expect(match("npx -y eslint .")).toBe(true);
  });

  it("does not match with yarn --cwd flag (binary after flag value)", () => {
    const match = bin("eslint");
    expect(match("yarn --cwd packages/ui eslint .")).toBe(false);
  });

  it("matches with bunx -y boolean flag", () => {
    const match = bin("tsup");
    expect(match("bunx -y tsup build")).toBe(true);
  });
});
