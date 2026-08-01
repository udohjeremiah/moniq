import type { Diagnostic } from "@moniq/core";

import path from "node:path";

import { type FixOptions, runFixes } from "./fix.js";

export async function applyFileFixes(
  diagnostics: Diagnostic[],
  options: FixOptions,
) {
  const root = options.root;

  return runFixes(
    diagnostics,
    options,
    (d) =>
      d.domain === "files" && d.fixAction !== undefined && d.severity !== "off",
    (d) => applyFileFix(d, root),
  );
}

async function applyFileFix(d: Diagnostic, root: string) {
  const action = d.fixAction;
  const relativePath = d.file;

  if (action === undefined || relativePath === undefined) {
    return;
  }

  const absolutePath = path.join(root, relativePath);

  if (action === "delete") {
    const { rm } = await import("node:fs/promises");
    await rm(absolutePath);
    return;
  }

  if (action === "mkdir") {
    const { mkdir } = await import("node:fs/promises");
    await mkdir(absolutePath, { recursive: true });
    return;
  }

  const { mkdir, writeFile } = await import("node:fs/promises");
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, d.fix ?? "", "utf8");
}
