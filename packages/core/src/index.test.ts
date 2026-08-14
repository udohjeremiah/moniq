import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { discoverWorkspace } from "./index.js";

vi.mock("node:child_process", () => ({
  execFileSync: vi.fn(),
}));

import { execFileSync } from "node:child_process";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  delete process.env["npm_config_user_agent"];
});

describe("discoverWorkspace", () => {
  it("discovers pnpm workspaces and includes the root first", async () => {
    process.env["npm_config_user_agent"] = "pnpm/";
    vi.mocked(execFileSync).mockReturnValue(
      JSON.stringify([
        { name: "moniq", path: "/repo", private: true },
        { name: "@moniq/cli", path: "/repo/packages/cli", private: true },
        { name: "@moniq/core", path: "/repo/packages/core", private: true },
      ]),
    );

    const result = await discoverWorkspace("/repo");

    expect(result).toEqual([
      { path: "/repo" },
      { path: "/repo/packages/cli" },
      { path: "/repo/packages/core" },
    ]);
  });

  it("discovers npm workspaces and includes the root first", async () => {
    process.env["npm_config_user_agent"] = "npm/";
    vi.mocked(execFileSync).mockReturnValue(
      JSON.stringify({
        dependencies: {
          "@moniq/cli": { path: "/repo/packages/cli" },
          "@moniq/core": { path: "/repo/packages/core" },
        },
        name: "root",
      }),
    );

    const result = await discoverWorkspace("/repo");

    expect(result).toEqual([
      { path: "/repo" },
      { path: "/repo/packages/cli" },
      { path: "/repo/packages/core" },
    ]);
  });

  it("returns the root when no workspace members exist", async () => {
    process.env["npm_config_user_agent"] = "pnpm/";
    vi.mocked(execFileSync).mockReturnValue("[]");

    const result = await discoverWorkspace("/empty");

    expect(result).toEqual([{ path: "/empty" }]);
  });
});
