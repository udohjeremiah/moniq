import { type UserConfig } from "@moniq/config";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { resolve } from "./index.js";

async function createFixture(
  root: string,
  packages: Record<string, Record<string, unknown>>,
) {
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

async function createTemporaryDirectory() {
  return mkdtemp(path.join(tmpdir(), "moniq-core-test-"));
}

function rootPack(root: string, ...relativePaths: string[]) {
  return relativePaths.map((relative) => ({
    path: path.join(root, relative),
  }));
}

describe("resolve", () => {
  it("returns report with no results when all required scripts exist", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root", scripts: { build: "tsup" } },
      "packages/a": { name: "a", scripts: { build: "tsup" } },
    });

    const config: UserConfig = {
      scripts: {
        build: { required: true },
      },
    };

    const report = await resolve(
      config,
      root,
      rootPack(root, ".", "packages/a"),
    );
    expect(report.results).toEqual([]);
    expect(report.summary.passed).toBe(true);
    expect(report.summary.total).toBe(0);
    expect(report.tool.name).toBe("moniq");
    await rm(root, { recursive: true });
  });

  it("returns diagnostic for missing required script", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root", scripts: {} },
    });

    const config: UserConfig = {
      scripts: {
        build: { required: true },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results).toEqual([
      {
        domain: "scripts",
        message: 'Missing required script "build"',
        packageName: "root",
        packagePath: path.join(root, "."),
        ruleId: "scripts/missing",
        ruleName: "Missing required script",
        scriptName: "build",
        severity: "error",
      },
    ]);
    expect(report.summary.passed).toBe(false);
    expect(report.summary.errors).toBe(1);
    await rm(root, { recursive: true });
  });

  it("returns diagnostic for command mismatch (string)", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root", scripts: { build: "tsc" } },
    });

    const config: UserConfig = {
      scripts: {
        build: { command: "tsup" },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results).toEqual([
      {
        actual: "tsc",
        domain: "scripts",
        expected: "tsup",
        message: 'Unexpected command for script "build"',
        packageName: "root",
        packagePath: path.join(root, "."),
        ruleId: "scripts/command-mismatch",
        ruleName: "Unexpected command",
        scriptName: "build",
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

    const config: UserConfig = {
      scripts: {
        build: { command: "tsup" },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results).toEqual([]);
    await rm(root, { recursive: true });
  });

  it("matches command with RegExp", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root", scripts: { lint: "eslint . --fix" } },
    });

    const config: UserConfig = {
      scripts: {
        lint: { command: /^eslint\b/ },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results).toEqual([]);
    await rm(root, { recursive: true });
  });

  it("matches command with predicate", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root", scripts: { build: "tsup --clean" } },
    });

    const config: UserConfig = {
      scripts: {
        build: { command: (command) => command.startsWith("tsup") },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results).toEqual([]);
    await rm(root, { recursive: true });
  });

  it("respects include glob", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      "packages/a": { name: "a", scripts: { build: "tsup" } },
      "packages/b": { name: "b", scripts: {} },
    });

    const config: UserConfig = {
      scripts: {
        build: { include: ["packages/a"], required: true },
      },
    };

    const report = await resolve(
      config,
      root,
      rootPack(root, "packages/a", "packages/b"),
    );
    expect(report.results).toEqual([]);
    await rm(root, { recursive: true });
  });

  it("respects exclude glob", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      "packages/a": { name: "a", scripts: {} },
      "packages/b": { name: "b", scripts: { build: "tsup" } },
    });

    const config: UserConfig = {
      scripts: {
        build: { exclude: ["packages/b"], required: true },
      },
    };

    const report = await resolve(
      config,
      root,
      rootPack(root, "packages/a", "packages/b"),
    );
    expect(report.results).toHaveLength(1);
    expect(report.results[0]?.packageName).toBe("a");
    await rm(root, { recursive: true });
  });

  it("supports '*' include (all packages)", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      "packages/a": { name: "a", scripts: {} },
      "packages/b": { name: "b", scripts: {} },
    });

    const config: UserConfig = {
      scripts: {
        build: { required: true },
      },
    };

    const report = await resolve(
      config,
      root,
      rootPack(root, "packages/a", "packages/b"),
    );
    expect(report.results).toHaveLength(2);
    await rm(root, { recursive: true });
  });

  it("supports '.' include (root only)", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root", scripts: {} },
      "packages/a": { name: "a", scripts: { build: "tsup" } },
    });

    const config: UserConfig = {
      scripts: {
        build: { include: ["."], required: true },
      },
    };

    const report = await resolve(
      config,
      root,
      rootPack(root, ".", "packages/a"),
    );
    expect(report.results).toHaveLength(1);
    expect(report.results[0]?.packageName).toBe("root");
    await rm(root, { recursive: true });
  });

  it("picks first matching policy from array", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      "packages/a": { name: "a", scripts: { build: "rollup" } },
    });

    const config: UserConfig = {
      scripts: {
        build: [
          { command: "rollup", include: ["packages/a"] },
          { command: "tsup", include: ["packages/a"] },
        ],
      },
    };

    const report = await resolve(config, root, rootPack(root, "packages/a"));
    expect(report.results).toEqual([]);
    await rm(root, { recursive: true });
  });

  it("stops at first matching policy in array (second would fail)", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      "packages/a": { name: "a", scripts: { build: "rollup" } },
    });

    const config: UserConfig = {
      scripts: {
        build: [
          { command: "rollup", include: ["packages/a"] },
          { command: "tsup", include: ["*"] },
        ],
      },
    };

    const report = await resolve(config, root, rootPack(root, "packages/a"));
    expect(report.results).toEqual([]);
    await rm(root, { recursive: true });
  });

  it("respects allowCustomCommands exemption", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      "packages/a": { name: "a", scripts: { build: "custom-builder" } },
    });

    const config: UserConfig = {
      scripts: {
        build: {
          allowCustomCommands: ["packages/a"],
          command: "tsup",
        },
      },
    };

    const report = await resolve(config, root, rootPack(root, "packages/a"));
    expect(report.results).toEqual([]);
    await rm(root, { recursive: true });
  });

  it("sets fix field when autofix is true and command is a string", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root", scripts: {} },
    });

    const config: UserConfig = {
      scripts: {
        build: { autofix: true, command: "tsup", required: true },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results[0]?.fix).toBe("tsup");
    await rm(root, { recursive: true });
  });

  it("does not set fix for missing script when command is a RegExp", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root", scripts: {} },
    });

    const config: UserConfig = {
      scripts: {
        build: { autofix: true, command: /^tsup/, required: true },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results[0]?.fix).toBeUndefined();
    await rm(root, { recursive: true });
  });

  it("respects severity: off (skips policy)", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root", scripts: {} },
    });

    const config: UserConfig = {
      scripts: {
        build: { required: true, severity: "off" },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results).toEqual([]);
    await rm(root, { recursive: true });
  });

  it("returns no diagnostics when no policies are configured", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root", scripts: {} },
    });

    const config: UserConfig = {};

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results).toEqual([]);
    await rm(root, { recursive: true });
  });
});
