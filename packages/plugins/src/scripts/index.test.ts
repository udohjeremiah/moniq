import type { Package, UserConfig } from "@moniq/core";

import { createRegistry, registerPluginPack, resolveAll } from "@moniq/core";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { scriptsPlugin } from "./index.js";

registerPluginPack(scriptsPlugin);

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

async function readFixturePackageJson(root: string, relativePath: string) {
  const { readFile } = await import("node:fs/promises");
  return JSON.parse(
    await readFile(path.join(root, relativePath), "utf8"),
  ) as Record<string, Record<string, unknown>>;
}

async function resolve(config: UserConfig, root: string, packages: Package[]) {
  const registry = createRegistry(config);
  const result = await resolveAll(registry.domains, config, root, packages);
  return result.report;
}

function rootPack(root: string, ...relativePaths: string[]) {
  return relativePaths.map((relative) => ({
    path: path.join(root, relative),
  }));
}

async function run(
  config: UserConfig,
  root: string,
  packages: Package[],
  options?: Parameters<typeof resolveAll>[4],
) {
  const registry = createRegistry(config);
  return resolveAll(registry.domains, config, root, packages, options);
}

describe("scripts", () => {
  it("returns report with no results when all required scripts exist", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root", scripts: { build: "tsup" } },
      "packages/a": { name: "a", scripts: { build: "tsup" } },
    });

    const config: UserConfig = {
      scripts: {
        build: { presence: "required" },
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
        build: { presence: "required" },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results).toEqual([
      {
        domain: "scripts",
        message: 'Missing required script "build"',
        packageName: "root",
        packagePath: path.join(root, "."),
        plugin: "scripts",
        ruleId: "scripts/missing",
        ruleName: "Missing required script",
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
    expect(report.results).toHaveLength(1);
    expect(report.results[0]).toMatchObject({
      domain: "scripts",
      message: 'Unexpected command for script "build"',
      metadata: {
        actual: "tsc",
        expected: "tsup",
      },
      packageName: "root",
      packagePath: path.join(root, "."),
      plugin: "scripts",
      ruleId: "scripts/command-mismatch",
      ruleName: "Unexpected command",
      severity: "error",
    });
    expect(report.results[0]?.fix).toBeTypeOf("function");
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
        build: { include: ["packages/a"], presence: "required" },
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
        build: { exclude: ["packages/b"], presence: "required" },
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
        build: { presence: "required" },
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

  it("supports '**' include (packages only, excluding root)", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root", scripts: {} },
      "packages/a": { name: "a", scripts: {} },
    });

    const config: UserConfig = {
      scripts: {
        build: { include: ["**"], presence: "required" },
      },
    };

    const report = await resolve(
      config,
      root,
      rootPack(root, ".", "packages/a"),
    );
    expect(report.results).toHaveLength(1);
    expect(report.results[0]?.packageName).toBe("a");
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
        build: { include: ["."], presence: "required" },
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
        build: { autofix: true, command: "tsup", presence: "required" },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results[0]?.fix).toBeTypeOf("function");
    await rm(root, { recursive: true });
  });

  it("does not set fix for missing script when command is a RegExp", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root", scripts: {} },
    });

    const config: UserConfig = {
      scripts: {
        build: { autofix: true, command: /^tsup/, presence: "required" },
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
        build: { presence: "required", severity: "off" },
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

  it("adds a missing script when the fix is applied", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root", scripts: {} },
    });

    const config: UserConfig = {
      scripts: {
        build: { autofix: true, command: "tsup", presence: "required" },
      },
    };

    const result = await run(config, root, rootPack(root, "."), { fix: true });
    expect(result.fixSummary?.isDryRun).toBe(false);
    expect(result.fixSummary?.fixed).toBe(1);
    expect(result.fixSummary?.errors).toBe(0);
    expect(result.fixSummary?.fixedDiagnostics[0]?.ruleId).toBe(
      "scripts/missing",
    );

    const packageJson = await readFixturePackageJson(root, "package.json");
    expect(packageJson["scripts"]?.["build"]).toBe("tsup");
    await rm(root, { recursive: true });
  });

  it("counts the fix in dry-run without writing", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root", scripts: {} },
    });

    const config: UserConfig = {
      scripts: {
        build: { autofix: true, command: "tsup", presence: "required" },
      },
    };

    const result = await run(config, root, rootPack(root, "."), {
      fix: true,
      isDryRun: true,
    });
    expect(result.fixSummary?.isDryRun).toBe(true);
    expect(result.fixSummary?.fixed).toBe(1);
    expect(result.fixSummary?.fixedDiagnostics).toEqual([]);

    const packageJson = await readFixturePackageJson(root, "package.json");
    expect(packageJson["scripts"]?.["build"]).toBeUndefined();
    await rm(root, { recursive: true });
  });

  it("updates a mismatched command when the fix is applied", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root", scripts: { build: "tsc" } },
    });

    const config: UserConfig = {
      scripts: {
        build: { autofix: true, command: "tsup" },
      },
    };

    const result = await run(config, root, rootPack(root, "."), { fix: true });
    expect(result.fixSummary?.fixed).toBe(1);
    expect(result.fixSummary?.fixedDiagnostics[0]?.ruleId).toBe(
      "scripts/command-mismatch",
    );

    const packageJson = await readFixturePackageJson(root, "package.json");
    expect(packageJson["scripts"]?.["build"]).toBe("tsup");
    await rm(root, { recursive: true });
  });
});
