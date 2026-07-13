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

describe("pnpm", () => {
  beforeEach(() => {
    process.env["npm_config_user_agent"] = "pnpm/";
  });

  it("returns packages from pnpm ls output", async () => {
    vi.mocked(execFileSync).mockReturnValue(
      JSON.stringify([
        { name: "moniq", path: "/repo", private: true },
        { name: "@moniq/cli", path: "/repo/packages/cli", private: true },
        { name: "@moniq/core", path: "/repo/packages/core", private: true },
      ]),
    );

    const result = await discoverWorkspace("/repo");

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ path: "/repo" });
    expect(result[1]).toEqual({ path: "/repo/packages/cli" });
    expect(result[2]).toEqual({ path: "/repo/packages/core" });
  });

  it("calls pnpm ls with the root directory", async () => {
    vi.mocked(execFileSync).mockReturnValue("[]");

    await discoverWorkspace("/some/project");

    expect(execFileSync).toHaveBeenCalledWith(
      expect.any(String),
      ["ls", "-r", "--depth", "-1", "--json"],
      { cwd: "/some/project", encoding: "utf8" },
    );
  });
});

describe("yarn", () => {
  beforeEach(() => {
    process.env["npm_config_user_agent"] = "yarn/";
  });

  it("returns packages from yarn workspaces list output", async () => {
    vi.mocked(execFileSync).mockReturnValue(
      [
        JSON.stringify({ location: "packages/cli", name: "@moniq/cli" }),
        JSON.stringify({ location: "packages/core", name: "@moniq/core" }),
      ].join("\n"),
    );

    const result = await discoverWorkspace("/repo");

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ path: "/repo/packages/cli" });
    expect(result[1]).toEqual({ path: "/repo/packages/core" });
  });

  it("calls yarn workspaces list with the root directory", async () => {
    vi.mocked(execFileSync).mockReturnValue("");

    await discoverWorkspace("/some/project");

    expect(execFileSync).toHaveBeenCalledWith(
      expect.any(String),
      ["workspaces", "list", "--json"],
      { cwd: "/some/project", encoding: "utf8" },
    );
  });
});

describe("npm", () => {
  beforeEach(() => {
    process.env["npm_config_user_agent"] = "npm/";
  });

  it("returns packages from npm ls output", async () => {
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

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ path: "/repo/packages/cli" });
    expect(result[1]).toEqual({ path: "/repo/packages/core" });
  });

  it("calls npm ls with the root directory", async () => {
    vi.mocked(execFileSync).mockReturnValue("{}");

    await discoverWorkspace("/some/project");

    expect(execFileSync).toHaveBeenCalledWith(
      expect.any(String),
      ["ls", "--workspaces", "--all", "--json", "--depth", "0"],
      { cwd: "/some/project", encoding: "utf8" },
    );
  });
});

describe("discoverWorkspace", () => {
  beforeEach(() => {
    process.env["npm_config_user_agent"] = "pnpm/";
  });

  it("returns an empty array when no packages exist", async () => {
    vi.mocked(execFileSync).mockReturnValue("[]");

    const result = await discoverWorkspace("/empty");

    expect(result).toEqual([]);
  });

  it("returns only path for each package", async () => {
    vi.mocked(execFileSync).mockReturnValue(
      JSON.stringify([
        {
          dependencies: { foo: "1.0.0" },
          name: "@moniq/core",
          path: "/repo/packages/core",
          private: true,
          version: "0.0.0",
        },
      ]),
    );

    const result = await discoverWorkspace("/repo");

    expect(result).toEqual([{ path: "/repo/packages/core" }]);
  });
});
