import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  detectPackageManager,
  discoverWorkspace,
  hasWorkspaceConfig,
} from "./workspace.js";

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

describe("detectPackageManager", () => {
  afterEach(() => {
    delete process.env["npm_config_user_agent"];
  });

  it("detects pnpm from packageManager field", async () => {
    const result = await detectPackageManager("/Users/udohjeremiah/dev/moniq");

    expect(result).toBe("pnpm");
  });

  it("falls back to npm_config_user_agent when no project signals exist", async () => {
    process.env["npm_config_user_agent"] = "npm/";

    const result = await detectPackageManager("/nonexistent");

    expect(result).toBe("npm");
  });

  it("throws when nothing is detected", async () => {
    await expect(detectPackageManager("/nonexistent")).rejects.toThrow(
      "Could not detect package manager",
    );
  });
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

function createFixture() {
  return mkdtemp(path.join(tmpdir(), "moniq-workspace-test-"));
}

async function writeConfig(directory: string, name: string, content: string) {
  const { writeFile } = await import("node:fs/promises");
  await writeFile(path.join(directory, name), content);
}

describe("hasWorkspaceConfig", () => {
  it("returns true for a package.json workspaces array", async () => {
    const directory = await createFixture();
    await writeConfig(
      directory,
      "package.json",
      JSON.stringify({ name: "test", workspaces: ["packages/*"] }),
    );

    await expect(hasWorkspaceConfig(directory)).resolves.toBe(true);

    await rm(directory, { recursive: true });
  });

  it("returns true for a package.json workspaces object", async () => {
    const directory = await createFixture();
    await writeConfig(
      directory,
      "package.json",
      JSON.stringify({
        name: "test",
        workspaces: { packages: ["packages/*"] },
      }),
    );

    await expect(hasWorkspaceConfig(directory)).resolves.toBe(true);

    await rm(directory, { recursive: true });
  });

  it("returns true for an empty workspaces array", async () => {
    const directory = await createFixture();
    await writeConfig(
      directory,
      "package.json",
      JSON.stringify({ name: "test", workspaces: [] }),
    );

    await expect(hasWorkspaceConfig(directory)).resolves.toBe(true);

    await rm(directory, { recursive: true });
  });

  it("returns false when package.json has no workspaces", async () => {
    const directory = await createFixture();
    await writeConfig(
      directory,
      "package.json",
      JSON.stringify({ name: "test" }),
    );

    await expect(hasWorkspaceConfig(directory)).resolves.toBe(false);

    await rm(directory, { recursive: true });
  });

  it("returns true when pnpm-workspace.yaml declares packages", async () => {
    const directory = await createFixture();
    await writeConfig(directory, "pnpm-workspace.yaml", "packages:");

    await expect(hasWorkspaceConfig(directory)).resolves.toBe(true);

    await rm(directory, { recursive: true });
  });

  it("returns true when pnpm-workspace.yaml declares a packages list", async () => {
    const directory = await createFixture();
    await writeConfig(
      directory,
      "pnpm-workspace.yaml",
      'packages:\n  - "packages/*"',
    );

    await expect(hasWorkspaceConfig(directory)).resolves.toBe(true);

    await rm(directory, { recursive: true });
  });

  it("returns true when pnpm-workspace.yaml declares an empty packages list", async () => {
    const directory = await createFixture();
    await writeConfig(directory, "pnpm-workspace.yaml", "packages: []");

    await expect(hasWorkspaceConfig(directory)).resolves.toBe(true);

    await rm(directory, { recursive: true });
  });

  it("returns false when pnpm-workspace.yaml has no packages field", async () => {
    const directory = await createFixture();
    await writeConfig(
      directory,
      "pnpm-workspace.yaml",
      "allowBuilds:\n  lefthook: true",
    );

    await expect(hasWorkspaceConfig(directory)).resolves.toBe(false);

    await rm(directory, { recursive: true });
  });

  it("returns true when deno.json declares a workspace", async () => {
    const directory = await createFixture();
    await writeConfig(
      directory,
      "deno.json",
      JSON.stringify({ workspace: ["packages/*"] }),
    );

    await expect(hasWorkspaceConfig(directory)).resolves.toBe(true);

    await rm(directory, { recursive: true });
  });

  it("returns true when deno.json declares workspace members", async () => {
    const directory = await createFixture();
    await writeConfig(
      directory,
      "deno.json",
      JSON.stringify({ workspace: { members: ["packages/*"] } }),
    );

    await expect(hasWorkspaceConfig(directory)).resolves.toBe(true);

    await rm(directory, { recursive: true });
  });

  it("returns false when deno.json has no workspace", async () => {
    const directory = await createFixture();
    await writeConfig(directory, "deno.json", JSON.stringify({}));

    await expect(hasWorkspaceConfig(directory)).resolves.toBe(false);

    await rm(directory, { recursive: true });
  });

  it("returns false for an empty directory", async () => {
    const directory = await createFixture();

    await expect(hasWorkspaceConfig(directory)).resolves.toBe(false);

    await rm(directory, { recursive: true });
  });
});
