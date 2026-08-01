import type { Diagnostic } from "@moniq/core";

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { applyScriptFixes } from "./scripts.js";

function createTemporaryDirectory() {
  return mkdtemp(path.join(tmpdir(), "moniq-cli-scripts-test-"));
}

function diagnostic(partial: Partial<Diagnostic>): Diagnostic {
  return {
    domain: "scripts",
    message: "",
    packageName: "root",
    packagePath: "",
    ruleId: "scripts/missing",
    ruleName: "",
    severity: "error",
    ...partial,
  };
}

async function readScripts(root: string) {
  const { readFile } = await import("node:fs/promises");
  const packageJson = JSON.parse(
    await readFile(path.join(root, "package.json"), "utf8"),
  ) as { scripts?: Record<string, string> };
  return packageJson.scripts ?? {};
}

async function writePackageJson(root: string, scripts: Record<string, string>) {
  const { writeFile } = await import("node:fs/promises");
  await writeFile(
    path.join(root, "package.json"),
    `${JSON.stringify({ name: "root", scripts }, undefined, 2)}\n`,
  );
}

describe("applyScriptFixes", () => {
  it("adds a missing script", async () => {
    const root = await createTemporaryDirectory();
    await writePackageJson(root, {});

    const summary = await applyScriptFixes(
      [
        diagnostic({
          fix: "tsup",
          packagePath: root,
          scriptName: "build",
        }),
      ],
      { root },
    );

    expect(summary.fixed).toBe(1);
    expect(await readScripts(root)).toEqual({ build: "tsup" });
    await rm(root, { recursive: true });
  });

  it("updates an existing script and preserves others", async () => {
    const root = await createTemporaryDirectory();
    await writePackageJson(root, { build: "tsc", test: "vitest" });

    await applyScriptFixes(
      [
        diagnostic({
          fix: "tsup",
          packagePath: root,
          scriptName: "build",
        }),
      ],
      { root },
    );

    expect(await readScripts(root)).toEqual({ build: "tsup", test: "vitest" });
    await rm(root, { recursive: true });
  });

  it("does not modify package.json in dry run", async () => {
    const root = await createTemporaryDirectory();
    await writePackageJson(root, {});

    const summary = await applyScriptFixes(
      [
        diagnostic({
          fix: "tsup",
          packagePath: root,
          scriptName: "build",
        }),
      ],
      { isDryRun: true, root },
    );

    expect(summary.fixed).toBe(1);
    expect(summary.isDryRun).toBe(true);
    expect(await readScripts(root)).toEqual({});
    await rm(root, { recursive: true });
  });

  it("ignores diagnostics from other domains", async () => {
    const root = await createTemporaryDirectory();
    await writePackageJson(root, {});

    const summary = await applyScriptFixes(
      [
        diagnostic({
          domain: "files",
          fix: "tsup",
          packagePath: root,
          scriptName: "build",
        }),
      ],
      { root },
    );

    expect(summary.fixed).toBe(0);
    expect(await readScripts(root)).toEqual({});
    await rm(root, { recursive: true });
  });

  it("ignores diagnostics without a fix", async () => {
    const root = await createTemporaryDirectory();
    await writePackageJson(root, {});

    const summary = await applyScriptFixes(
      [
        diagnostic({
          packagePath: root,
          scriptName: "build",
        }),
      ],
      { root },
    );

    expect(summary.fixed).toBe(0);
    expect(await readScripts(root)).toEqual({});
    await rm(root, { recursive: true });
  });

  it("counts failed fixes as errors", async () => {
    const root = await createTemporaryDirectory();
    await writePackageJson(root, {});

    const summary = await applyScriptFixes(
      [
        diagnostic({
          fix: "tsup",
          packagePath: path.join(root, "missing"),
          scriptName: "build",
        }),
      ],
      { root },
    );

    expect(summary.errors).toBe(1);
    expect(summary.fixed).toBe(0);
    await rm(root, { recursive: true });
  });
});
