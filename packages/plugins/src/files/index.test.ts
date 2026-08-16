import type { Package, UserConfig } from "@moniq/core";

import { createRegistry, registerPluginPack, resolveAll } from "@moniq/core";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { filesPlugin } from "./index.js";

registerPluginPack(filesPlugin);

async function createDirectory(root: string, relativePath: string) {
  const { mkdir } = await import("node:fs/promises");
  await mkdir(path.join(root, relativePath), { recursive: true });
}

async function createFile(root: string, relativePath: string, content = "") {
  const { mkdir, writeFile } = await import("node:fs/promises");
  const absolutePath = path.join(root, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content);
}

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

async function readFixtureFile(root: string, relativePath: string) {
  const { readFile } = await import("node:fs/promises");
  try {
    return await readFile(path.join(root, relativePath), "utf8");
  } catch {
    return;
  }
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

describe("files", () => {
  it("returns diagnostic for missing required path", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root" },
    });

    const config: UserConfig = {
      files: {
        "README.md": { presence: "required" },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results).toEqual([
      {
        domain: "files",
        message: 'Missing required path "README.md"',
        packageName: "root",
        packagePath: path.join(root, "."),
        plugin: "files",
        ruleId: "files/missing",
        ruleName: "Missing required path",
        severity: "error",
      },
    ]);
    await rm(root, { recursive: true });
  });

  it("returns no diagnostic when required file exists", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root" },
    });
    await createFile(root, "README.md", "# Moniq");

    const config: UserConfig = {
      files: {
        "README.md": { presence: "required" },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results).toEqual([]);
    await rm(root, { recursive: true });
  });

  it("returns diagnostic for forbidden file that exists", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root" },
    });
    await createFile(root, ".env", "SECRET=1");

    const config: UserConfig = {
      files: {
        ".env": { presence: "forbidden" },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results).toHaveLength(1);
    expect(report.results[0]).toMatchObject({
      domain: "files",
      message: 'Unexpected file ".env"',
      packageName: "root",
      packagePath: path.join(root, "."),
      plugin: "files",
      ruleId: "files/unexpected",
      ruleName: "Unexpected file",
      severity: "error",
    });
    expect(report.results[0]?.fix).toBeTypeOf("function");
    await rm(root, { recursive: true });
  });

  it("returns diagnostic for missing required directory", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root" },
    });

    const config: UserConfig = {
      files: {
        packages: { kind: "directory", presence: "required" },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results).toHaveLength(1);
    expect(report.results[0]).toMatchObject({
      domain: "files",
      message: 'Missing required directory "packages"',
      packageName: "root",
      packagePath: path.join(root, "."),
      plugin: "files",
      ruleId: "files/missing",
      ruleName: "Missing required directory",
      severity: "error",
    });
    expect(report.results[0]?.fix).toBeTypeOf("function");
    await rm(root, { recursive: true });
  });

  it("returns diagnostic when kind does not match", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root" },
    });
    await createFile(root, "README.md", "x");

    const config: UserConfig = {
      files: {
        "README.md": { kind: "directory" },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results).toEqual([
      {
        domain: "files",
        message: `Expected a directory but found a file at "README.md"`,
        packageName: "root",
        packagePath: path.join(root, "."),
        plugin: "files",
        ruleId: "files/kind",
        ruleName: "Unexpected kind",
        severity: "error",
      },
    ]);
    await rm(root, { recursive: true });
  });

  it("returns diagnostic for exact content mismatch", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root" },
    });
    await createFile(root, ".npmrc", "auto-install-peers=false");

    const config: UserConfig = {
      files: {
        ".npmrc": { content: "auto-install-peers=true" },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results).toHaveLength(1);
    expect(report.results[0]).toMatchObject({
      domain: "files",
      message: 'Unexpected contents for ".npmrc"',
      metadata: {
        actual: "auto-install-peers=false",
        expected: "auto-install-peers=true",
      },
      packageName: "root",
      packagePath: path.join(root, "."),
      plugin: "files",
      ruleId: "files/content-mismatch",
      ruleName: "Unexpected contents",
      severity: "error",
    });
    expect(report.results[0]?.fix).toBeTypeOf("function");
    await rm(root, { recursive: true });
  });

  it("returns no diagnostic when exact content matches", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root" },
    });
    await createFile(root, ".npmrc", "auto-install-peers=true");

    const config: UserConfig = {
      files: {
        ".npmrc": { content: "auto-install-peers=true" },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results).toEqual([]);
    await rm(root, { recursive: true });
  });

  it("returns no diagnostic when RegExp content matches", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root" },
    });
    await createFile(root, "README.md", "# Heading");

    const config: UserConfig = {
      files: {
        "README.md": { content: /^# / },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results).toEqual([]);
    await rm(root, { recursive: true });
  });

  it("returns diagnostic when RegExp content does not match", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root" },
    });
    await createFile(root, "README.md", "body");

    const config: UserConfig = {
      files: {
        "README.md": { content: /^# / },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results).toHaveLength(1);
    expect(report.results[0]?.ruleId).toBe("files/content-mismatch");
    await rm(root, { recursive: true });
  });

  it("picks first matching policy from array", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      "packages/legacy": { name: "legacy" },
      "packages/modern": { name: "modern" },
    });
    await createFile(root, "packages/legacy/README.md", "wrong");
    await createFile(root, "packages/modern/README.md", "x");

    const config: UserConfig = {
      files: {
        "README.md": [
          { content: "legacy", include: ["packages/legacy"] },
          { include: ["*"], presence: "optional" },
        ],
      },
    };

    const report = await resolve(
      config,
      root,
      rootPack(root, "packages/legacy", "packages/modern"),
    );
    expect(report.results).toHaveLength(1);
    expect(report.results[0]?.packageName).toBe("legacy");
    await rm(root, { recursive: true });
  });

  it("groups diagnostics under the owning package", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root" },
      "packages/a": { name: "a" },
      "packages/b": { name: "b" },
    });
    await createFile(root, "packages/a/README.md", "expected");

    const config: UserConfig = {
      files: {
        "README.md": [
          { content: "expected", include: ["packages/a"] },
          { include: ["packages/b"], presence: "required" },
        ],
      },
    };

    const report = await resolve(
      config,
      root,
      rootPack(root, ".", "packages/a", "packages/b"),
    );
    expect(report.results).toHaveLength(1);
    expect(report.results[0]?.packageName).toBe("b");
    expect(report.results[0]?.packagePath).toBe(path.join(root, "packages/b"));
    await rm(root, { recursive: true });
  });

  it("sets create fix for missing required file when autofix is true", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root" },
    });

    const config: UserConfig = {
      files: {
        "README.md": { autofix: true, kind: "file", presence: "required" },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results[0]?.fix).toBeTypeOf("function");
    await rm(root, { recursive: true });
  });

  it("does not set fix for missing required item when kind is omitted", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root" },
    });

    const config: UserConfig = {
      files: {
        "README.md": { autofix: true, presence: "required" },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results[0]?.fix).toBeUndefined();
    await rm(root, { recursive: true });
  });

  it("sets delete fix for forbidden file when autofix is true", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root" },
    });
    await createFile(root, ".env", "SECRET=1");

    const config: UserConfig = {
      files: {
        ".env": { autofix: true, presence: "forbidden" },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results[0]?.fix).toBeTypeOf("function");
    await rm(root, { recursive: true });
  });

  it("sets write fix for string content mismatch when autofix is true", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root" },
    });
    await createFile(root, ".npmrc", "wrong");

    const config: UserConfig = {
      files: {
        ".npmrc": { autofix: true, content: "auto-install-peers=true" },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results[0]?.fix).toBeTypeOf("function");
    await rm(root, { recursive: true });
  });

  it("does not set fix for RegExp content mismatch", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root" },
    });
    await createFile(root, "README.md", "body");

    const config: UserConfig = {
      files: {
        "README.md": { autofix: true, content: /^# / },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results[0]?.fix).toBeUndefined();
    await rm(root, { recursive: true });
  });

  it("sets mkdir fix for missing directory when autofix is true", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root" },
    });

    const config: UserConfig = {
      files: {
        packages: { autofix: true, kind: "directory", presence: "required" },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results[0]?.fix).toBeTypeOf("function");
    await rm(root, { recursive: true });
  });

  it("returns diagnostic for missing required symlink", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root" },
    });

    const config: UserConfig = {
      files: {
        "docs/assets": { kind: "symlink", presence: "required" },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results).toEqual([
      {
        domain: "files",
        message: 'Missing required symlink "docs/assets"',
        packageName: "root",
        packagePath: path.join(root, "."),
        plugin: "files",
        ruleId: "files/missing",
        ruleName: "Missing required symlink",
        severity: "error",
      },
    ]);
    await rm(root, { recursive: true });
  });

  it("returns no diagnostic when required symlink exists", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root" },
    });
    await createDirectory(root, "docs");
    const { symlink } = await import("node:fs/promises");
    await symlink("target", path.join(root, "docs/assets"));

    const config: UserConfig = {
      files: {
        "docs/assets": { kind: "symlink", presence: "required" },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results).toEqual([]);
    await rm(root, { recursive: true });
  });

  it("returns diagnostic when a symlink does not match kind file", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root" },
    });
    const { symlink } = await import("node:fs/promises");
    await symlink("target", path.join(root, "link"));

    const config: UserConfig = {
      files: {
        link: { kind: "file", presence: "required" },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results).toEqual([
      {
        domain: "files",
        message: `Expected a file but found a symbolic link at "link"`,
        packageName: "root",
        packagePath: path.join(root, "."),
        plugin: "files",
        ruleId: "files/kind",
        ruleName: "Unexpected kind",
        severity: "error",
      },
    ]);
    await rm(root, { recursive: true });
  });

  it("returns diagnostic for forbidden symlink", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root" },
    });
    const { symlink } = await import("node:fs/promises");
    await symlink("target", path.join(root, "link"));

    const config: UserConfig = {
      files: {
        link: { presence: "forbidden" },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results).toHaveLength(1);
    expect(report.results[0]).toMatchObject({
      domain: "files",
      message: 'Unexpected symbolic link "link"',
      packageName: "root",
      packagePath: path.join(root, "."),
      plugin: "files",
      ruleId: "files/unexpected",
      ruleName: "Unexpected symbolic link",
      severity: "error",
    });
    expect(report.results[0]?.fix).toBeTypeOf("function");
    await rm(root, { recursive: true });
  });

  it("does not set fix for missing required symlink", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root" },
    });

    const config: UserConfig = {
      files: {
        "docs/assets": { autofix: true, kind: "symlink", presence: "required" },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results[0]?.fix).toBeUndefined();
    await rm(root, { recursive: true });
  });

  it("sets delete fix for forbidden symlink when autofix is true", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root" },
    });
    const { symlink } = await import("node:fs/promises");
    await symlink("target", path.join(root, "link"));

    const config: UserConfig = {
      files: {
        link: { autofix: true, presence: "forbidden" },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results[0]?.fix).toBeTypeOf("function");
    await rm(root, { recursive: true });
  });

  it("respects severity: off (skips policy)", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root" },
    });

    const config: UserConfig = {
      files: {
        "README.md": { presence: "required", severity: "off" },
      },
    };

    const report = await resolve(config, root, rootPack(root, "."));
    expect(report.results).toEqual([]);
    await rm(root, { recursive: true });
  });

  it("returns diagnostic for missing required file in each package", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      "packages/a": { name: "a" },
      "packages/b": { name: "b" },
      "packages/c": { name: "c" },
    });
    await createFile(root, "packages/c/README.md", "x");

    const config: UserConfig = {
      files: {
        "README.md": { presence: "required" },
      },
    };

    const report = await resolve(
      config,
      root,
      rootPack(root, "packages/a", "packages/b", "packages/c"),
    );
    expect(report.results).toHaveLength(2);
    expect(report.results.map((d) => d.packageName)).toEqual(["a", "b"]);
    await rm(root, { recursive: true });
  });

  it("respects include glob", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      "packages/a": { name: "a" },
      "packages/b": { name: "b" },
    });
    await createFile(root, "packages/a/README.md", "x");

    const config: UserConfig = {
      files: {
        "README.md": { include: ["packages/a"], presence: "required" },
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
      "packages/a": { name: "a" },
      "packages/b": { name: "b" },
    });
    await createFile(root, "packages/b/README.md", "x");

    const config: UserConfig = {
      files: {
        "README.md": { exclude: ["packages/b"], presence: "required" },
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
      "packages/a": { name: "a" },
      "packages/b": { name: "b" },
    });

    const config: UserConfig = {
      files: {
        "README.md": { presence: "required" },
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
      ".": { name: "root" },
      "packages/a": { name: "a" },
    });

    const config: UserConfig = {
      files: {
        "README.md": { include: ["**"], presence: "required" },
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
      ".": { name: "root" },
      "packages/a": { name: "a" },
    });
    await createFile(root, "README.md", "x");
    await createFile(root, "packages/a/README.md", "x");

    const config: UserConfig = {
      files: {
        "README.md": { include: ["."], presence: "required" },
      },
    };

    const report = await resolve(
      config,
      root,
      rootPack(root, ".", "packages/a"),
    );
    expect(report.results).toEqual([]);
    await rm(root, { recursive: true });
  });

  it("returns diagnostic for forbidden file in each package", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      "packages/a": { name: "a" },
      "packages/b": { name: "b" },
    });
    await createFile(root, "packages/a/.env", "SECRET=1");

    const config: UserConfig = {
      files: {
        ".env": { presence: "forbidden" },
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

  it("throws for files path outside the workspace root", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root" },
    });

    const config: UserConfig = {
      files: {
        "../outside": { presence: "required" },
      },
    };

    await expect(resolve(config, root, rootPack(root, "."))).rejects.toThrow(
      "must be within the workspace root",
    );
    await rm(root, { recursive: true });
  });

  it("creates a missing file when the fix is applied", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root" },
    });

    const config: UserConfig = {
      files: {
        "README.md": {
          autofix: true,
          content: "hello",
          kind: "file",
          presence: "required",
        },
      },
    };

    const result = await run(config, root, rootPack(root, "."), {
      fix: true,
    });
    expect(result.fixSummary?.isDryRun).toBe(false);
    expect(result.fixSummary?.fixed).toBe(1);
    expect(result.fixSummary?.errors).toBe(0);
    expect(result.fixSummary?.fixedDiagnostics[0]?.ruleId).toBe(
      "files/missing",
    );
    expect(await readFixtureFile(root, "README.md")).toBe("hello");
    await rm(root, { recursive: true });
  });

  it("deletes a forbidden file when the fix is applied", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root" },
    });
    await createFile(root, ".env", "SECRET=1");

    const config: UserConfig = {
      files: {
        ".env": { autofix: true, presence: "forbidden" },
      },
    };

    const result = await run(config, root, rootPack(root, "."), {
      fix: true,
    });
    expect(result.fixSummary?.fixed).toBe(1);
    expect(result.fixSummary?.fixedDiagnostics[0]?.ruleId).toBe(
      "files/unexpected",
    );
    expect(await readFixtureFile(root, ".env")).toBeUndefined();
    await rm(root, { recursive: true });
  });

  it("counts the fix in dry-run without writing", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, {
      ".": { name: "root" },
    });

    const config: UserConfig = {
      files: {
        "README.md": { autofix: true, kind: "file", presence: "required" },
      },
    };

    const result = await run(config, root, rootPack(root, "."), {
      fix: true,
      isDryRun: true,
    });
    expect(result.fixSummary?.isDryRun).toBe(true);
    expect(result.fixSummary?.fixed).toBe(1);
    expect(result.fixSummary?.fixedDiagnostics).toEqual([]);
    expect(await readFixtureFile(root, "README.md")).toBeUndefined();
    await rm(root, { recursive: true });
  });
});
