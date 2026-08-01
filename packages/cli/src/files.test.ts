import type { Diagnostic } from "@moniq/core";

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { applyFileFixes } from "./files.js";

function createTemporaryDirectory() {
  return mkdtemp(path.join(tmpdir(), "moniq-cli-files-test-"));
}

function diagnostic(partial: Partial<Diagnostic>): Diagnostic {
  return {
    domain: "files",
    message: "",
    packageName: "root",
    packagePath: "",
    ruleId: "files/missing",
    ruleName: "",
    severity: "error",
    ...partial,
  };
}

describe("applyFileFixes", () => {
  it("creates a missing file", async () => {
    const root = await createTemporaryDirectory();
    const summary = await applyFileFixes(
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
    expect(await readFile(path.join(root, "README.md"), "utf8")).toBe("");
    await rm(root, { recursive: true });
  });

  it("creates a missing file with content and parent directories", async () => {
    const root = await createTemporaryDirectory();
    await applyFileFixes(
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
    await applyFileFixes(
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
    await applyFileFixes(
      [
        diagnostic({
          file: ".env",
          fixAction: "delete",
          packagePath: root,
        }),
      ],
      { root },
    );

    const { access } = await import("node:fs/promises");
    await expect(access(filePath)).rejects.toThrow();
    await rm(root, { recursive: true });
  });

  it("creates a missing directory", async () => {
    const root = await createTemporaryDirectory();
    const summary = await applyFileFixes(
      [
        diagnostic({
          file: "packages",
          fixAction: "mkdir",
          packagePath: root,
        }),
      ],
      { root },
    );

    const { access } = await import("node:fs/promises");
    expect(summary.fixed).toBe(1);
    await expect(access(path.join(root, "packages"))).resolves.toBeUndefined();
    await rm(root, { recursive: true });
  });

  it("removes a forbidden symlink", async () => {
    const root = await createTemporaryDirectory();
    const { symlink, writeFile } = await import("node:fs/promises");
    const targetPath = path.join(root, "target");
    const linkPath = path.join(root, "link");
    await writeFile(targetPath, "data");
    await symlink("target", linkPath);

    await applyFileFixes(
      [
        diagnostic({
          file: "link",
          fixAction: "delete",
          packagePath: root,
        }),
      ],
      { root },
    );

    const { access } = await import("node:fs/promises");
    await expect(access(linkPath)).rejects.toThrow();
    await expect(access(targetPath)).resolves.toBeUndefined();
    await rm(root, { recursive: true });
  });

  it("does not modify files in dry run", async () => {
    const root = await createTemporaryDirectory();
    const summary = await applyFileFixes(
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
    expect(summary.isDryRun).toBe(true);
    await rm(root, { recursive: true });
  });
});
