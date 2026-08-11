import type { Diagnostic } from "@moniq/config/plugins";

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { applyFixes } from "./index.js";

function createTemporaryDirectory() {
  return mkdtemp(path.join(tmpdir(), "moniq-fix-test-"));
}

function diagnostic(partial: Partial<Diagnostic>): Diagnostic {
  return {
    domain: "files",
    message: "",
    packageName: "root",
    packagePath: "",
    plugin: "files",
    ruleId: "files/missing",
    ruleName: "",
    severity: "error",
    ...partial,
  };
}

async function readScripts(root: string) {
  const fs = await import("node:fs/promises");
  const packageJson = JSON.parse(
    await fs.readFile(path.join(root, "package.json"), "utf8"),
  ) as { scripts?: Record<string, string> };
  return packageJson.scripts ?? {};
}

describe("applyFixes", () => {
  it("creates a missing file", async () => {
    const root = await createTemporaryDirectory();
    const summary = await applyFixes(
      [
        diagnostic({
          file: "README.md",
          fix: "",
          fixAction: "create",
          packagePath: root,
        }),
      ],
      { root },
    );

    const { readFile } = await import("node:fs/promises");
    expect(summary.fixed).toBe(1);
    expect(summary.fixedDiagnostics).toHaveLength(1);
    expect(await readFile(path.join(root, "README.md"), "utf8")).toBe("");
    await rm(root, { recursive: true });
  });

  it("creates a missing file with content and parent directories", async () => {
    const root = await createTemporaryDirectory();
    await applyFixes(
      [
        diagnostic({
          file: "docs/README.md",
          fix: "# Docs",
          fixAction: "create",
          packagePath: root,
        }),
      ],
      { root },
    );

    const { readFile } = await import("node:fs/promises");
    expect(await readFile(path.join(root, "docs/README.md"), "utf8")).toBe(
      "# Docs",
    );
    await rm(root, { recursive: true });
  });

  it("overwrites a mismatched file", async () => {
    const root = await createTemporaryDirectory();
    const { writeFile } = await import("node:fs/promises");
    await writeFile(path.join(root, ".npmrc"), "wrong");
    await applyFixes(
      [
        diagnostic({
          file: ".npmrc",
          fix: "auto-install-peers=true",
          fixAction: "write",
          packagePath: root,
        }),
      ],
      { root },
    );

    const { readFile } = await import("node:fs/promises");
    expect(await readFile(path.join(root, ".npmrc"), "utf8")).toBe(
      "auto-install-peers=true",
    );
    await rm(root, { recursive: true });
  });

  it("removes a forbidden file", async () => {
    const root = await createTemporaryDirectory();
    const { writeFile } = await import("node:fs/promises");
    const filePath = path.join(root, ".env");
    await writeFile(filePath, "SECRET=1");
    await applyFixes(
      [diagnostic({ file: ".env", fixAction: "delete", packagePath: root })],
      { root },
    );

    const { access } = await import("node:fs/promises");
    await expect(access(filePath)).rejects.toThrow();
    await rm(root, { recursive: true });
  });

  it("creates a missing directory", async () => {
    const root = await createTemporaryDirectory();
    const summary = await applyFixes(
      [diagnostic({ file: "packages", fixAction: "mkdir", packagePath: root })],
      { root },
    );

    const { access } = await import("node:fs/promises");
    expect(summary.fixed).toBe(1);
    await expect(access(path.join(root, "packages"))).resolves.toBeUndefined();
    await rm(root, { recursive: true });
  });

  it("does not modify files in dry run", async () => {
    const root = await createTemporaryDirectory();
    const summary = await applyFixes(
      [
        diagnostic({
          file: "README.md",
          fix: "# Docs",
          fixAction: "create",
          packagePath: root,
        }),
      ],
      { isDryRun: true, root },
    );

    const { access } = await import("node:fs/promises");
    await expect(access(path.join(root, "README.md"))).rejects.toThrow();
    expect(summary.fixed).toBe(1);
    expect(summary.fixedDiagnostics).toEqual([]);
    expect(summary.isDryRun).toBe(true);
    await rm(root, { recursive: true });
  });

  it("adds a missing script", async () => {
    const root = await createTemporaryDirectory();
    const writeJson = await import("node:fs/promises");
    await writeJson.writeFile(
      path.join(root, "package.json"),
      `${JSON.stringify({ name: "root", scripts: {} }, undefined, 2)}\n`,
    );

    const summary = await applyFixes(
      [diagnostic({ fix: "tsup", packagePath: root, scriptName: "build" })],
      { root },
    );

    expect(summary.fixed).toBe(1);
    expect(await readScripts(root)).toEqual({ build: "tsup" });
    await rm(root, { recursive: true });
  });

  it("adds a missing script when package.json has no scripts field", async () => {
    const root = await createTemporaryDirectory();
    const writeJsonFile = await import("node:fs/promises");
    await writeJsonFile.writeFile(
      path.join(root, "package.json"),
      `${JSON.stringify({ name: "root" }, undefined, 2)}\n`,
    );

    const summary = await applyFixes(
      [diagnostic({ fix: "tsup", packagePath: root, scriptName: "build" })],
      { root },
    );

    expect(summary.fixed).toBe(1);
    expect(summary.fixedDiagnostics).toHaveLength(1);
    expect(await readScripts(root)).toEqual({ build: "tsup" });
    await rm(root, { recursive: true });
  });

  it("updates an existing script and preserves others", async () => {
    const root = await createTemporaryDirectory();
    const writeJsonFile = await import("node:fs/promises");
    await writeJsonFile.writeFile(
      path.join(root, "package.json"),
      `${JSON.stringify({ name: "root", scripts: { build: "tsc", test: "vitest" } }, undefined, 2)}\n`,
    );

    await applyFixes(
      [diagnostic({ fix: "tsup", packagePath: root, scriptName: "build" })],
      { root },
    );

    expect(await readScripts(root)).toEqual({ build: "tsup", test: "vitest" });
    await rm(root, { recursive: true });
  });

  it("counts failed fixes as errors", async () => {
    const root = await createTemporaryDirectory();
    const summary = await applyFixes(
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
    expect(summary.fixedDiagnostics).toEqual([]);
    await rm(root, { recursive: true });
  });
});
