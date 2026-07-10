import { type Config } from "@moniq/config";
import { type Package } from "@moniq/workspace";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { resolve } from "./index.js";

async function createFixture(
  root: string,
  packages: Record<string, Record<string, unknown>>,
): Promise<void> {
  for (const [relativePath, json] of Object.entries(packages)) {
    const directory = path.join(root, relativePath);
    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir(directory, { recursive: true });
    await writeFile(
      path.join(directory, "package.json"),
      `${JSON.stringify(json, undefined, 2)}\n`,
    );
  }
}

async function createTemporaryDirectory(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), "moniq-core-test-"));
}

function rootPack(root: string, ...relativePaths: string[]): Package[] {
  return relativePaths.map((relative) => ({
    path: path.join(root, relative),
  }));
}

describe("resolve", () => {
  it("returns no diagnostics when all required scripts exist", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root", scripts: { build: "tsup" } },
      "packages/a": { name: "a", scripts: { build: "tsup" } },
    });

    const config: Config = {
      scripts: {
        build: { required: true },
      },
    };

    const diagnostics = await resolve(
      config,
      root,
      rootPack(root, ".", "packages/a"),
    );
    expect(diagnostics).toEqual([]);
    await rm(root, { recursive: true });
  });

  it("returns diagnostic for missing required script", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root", scripts: {} },
    });

    const config: Config = {
      scripts: {
        build: { required: true },
      },
    };

    const diagnostics = await resolve(config, root, rootPack(root, "."));
    expect(diagnostics).toEqual([
      {
        message: 'Missing required script "build"',
        packageName: "root",
        packagePath: path.join(root, "."),
        severity: "error",
      },
    ]);
    await rm(root, { recursive: true });
  });

  it("returns diagnostic for command mismatch (string)", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root", scripts: { build: "tsc" } },
    });

    const config: Config = {
      scripts: {
        build: { command: "tsup" },
      },
    };

    const diagnostics = await resolve(config, root, rootPack(root, "."));
    expect(diagnostics).toEqual([
      {
        actual: "tsc",
        expected: "tsup",
        message: 'Unexpected command for script "build"',
        packageName: "root",
        packagePath: path.join(root, "."),
        severity: "error",
      },
    ]);
    await rm(root, { recursive: true });
  });

  it("no diagnostic when command matches", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root", scripts: { build: "tsup" } },
    });

    const config: Config = {
      scripts: {
        build: { command: "tsup" },
      },
    };

    const diagnostics = await resolve(config, root, rootPack(root, "."));
    expect(diagnostics).toEqual([]);
    await rm(root, { recursive: true });
  });

  it("matches command with RegExp", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root", scripts: { lint: "eslint . --fix" } },
    });

    const config: Config = {
      scripts: {
        lint: { command: /^eslint\b/ },
      },
    };

    const diagnostics = await resolve(config, root, rootPack(root, "."));
    expect(diagnostics).toEqual([]);
    await rm(root, { recursive: true });
  });

  it("matches command with predicate", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root", scripts: { build: "tsup --clean" } },
    });

    const config: Config = {
      scripts: {
        build: { command: (command) => command.startsWith("tsup") },
      },
    };

    const diagnostics = await resolve(config, root, rootPack(root, "."));
    expect(diagnostics).toEqual([]);
    await rm(root, { recursive: true });
  });

  it("respects include glob", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      "packages/a": { name: "a", scripts: { build: "tsup" } },
      "packages/b": { name: "b", scripts: {} },
    });

    const config: Config = {
      scripts: {
        build: { include: ["packages/a"], required: true },
      },
    };

    const diagnostics = await resolve(
      config,
      root,
      rootPack(root, "packages/a", "packages/b"),
    );
    expect(diagnostics).toEqual([]);
    await rm(root, { recursive: true });
  });

  it("respects exclude glob", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      "packages/a": { name: "a", scripts: {} },
      "packages/b": { name: "b", scripts: { build: "tsup" } },
    });

    const config: Config = {
      scripts: {
        build: { exclude: ["packages/b"], required: true },
      },
    };

    const diagnostics = await resolve(
      config,
      root,
      rootPack(root, "packages/a", "packages/b"),
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.packageName).toBe("a");
    await rm(root, { recursive: true });
  });

  it("supports '*' include (all packages)", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      "packages/a": { name: "a", scripts: {} },
      "packages/b": { name: "b", scripts: {} },
    });

    const config: Config = {
      scripts: {
        build: { required: true },
      },
    };

    const diagnostics = await resolve(
      config,
      root,
      rootPack(root, "packages/a", "packages/b"),
    );
    expect(diagnostics).toHaveLength(2);
    await rm(root, { recursive: true });
  });

  it("supports '.' include (root only)", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root", scripts: {} },
      "packages/a": { name: "a", scripts: { build: "tsup" } },
    });

    const config: Config = {
      scripts: {
        build: { include: ["."], required: true },
      },
    };

    const diagnostics = await resolve(
      config,
      root,
      rootPack(root, ".", "packages/a"),
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.packageName).toBe("root");
    await rm(root, { recursive: true });
  });

  it("picks first matching policy from array", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      "packages/a": { name: "a", scripts: { build: "rollup" } },
    });

    const config: Config = {
      scripts: {
        build: [
          { command: "rollup", include: ["packages/a"] },
          { command: "tsup", include: ["packages/a"] },
        ],
      },
    };

    const diagnostics = await resolve(
      config,
      root,
      rootPack(root, "packages/a"),
    );
    expect(diagnostics).toEqual([]);
    await rm(root, { recursive: true });
  });

  it("stops at first matching policy in array (second would fail)", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      "packages/a": { name: "a", scripts: { build: "rollup" } },
    });

    const config: Config = {
      scripts: {
        build: [
          { command: "rollup", include: ["packages/a"] },
          { command: "tsup", include: ["*"] },
        ],
      },
    };

    const diagnostics = await resolve(
      config,
      root,
      rootPack(root, "packages/a"),
    );
    expect(diagnostics).toEqual([]);
    await rm(root, { recursive: true });
  });

  it("respects allowCustomCommands exemption", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      "packages/a": { name: "a", scripts: { build: "custom-builder" } },
    });

    const config: Config = {
      scripts: {
        build: {
          allowCustomCommands: ["packages/a"],
          command: "tsup",
        },
      },
    };

    const diagnostics = await resolve(
      config,
      root,
      rootPack(root, "packages/a"),
    );
    expect(diagnostics).toEqual([]);
    await rm(root, { recursive: true });
  });

  it("sets fix field when autofix is true and command is a string", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root", scripts: {} },
    });

    const config: Config = {
      scripts: {
        build: { autofix: true, command: "tsup", required: true },
      },
    };

    const diagnostics = await resolve(config, root, rootPack(root, "."));
    expect(diagnostics[0]?.fix).toBe("tsup");
    await rm(root, { recursive: true });
  });

  it("does not set fix for missing script when command is a RegExp", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root", scripts: {} },
    });

    const config: Config = {
      scripts: {
        build: { autofix: true, command: /^tsup/, required: true },
      },
    };

    const diagnostics = await resolve(config, root, rootPack(root, "."));
    expect(diagnostics[0]?.fix).toBeUndefined();
    await rm(root, { recursive: true });
  });

  it("respects severity: off (skips policy)", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root", scripts: {} },
    });

    const config: Config = {
      scripts: {
        build: { required: true, severity: "off" },
      },
    };

    const diagnostics = await resolve(config, root, rootPack(root, "."));
    expect(diagnostics).toEqual([]);
    await rm(root, { recursive: true });
  });

  it("returns no diagnostics when no policies are configured", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root", scripts: {} },
    });

    const config: Config = {};

    const diagnostics = await resolve(config, root, rootPack(root, "."));
    expect(diagnostics).toEqual([]);
    await rm(root, { recursive: true });
  });
});
