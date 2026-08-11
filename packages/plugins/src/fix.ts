import type { Diagnostic } from "@moniq/config/plugins";

import path from "node:path";

export interface FixOptions {
  isDryRun?: boolean;
  root: string;
}

export interface FixSummary {
  errors: number;
  fixed: number;
  fixedDiagnostics: Diagnostic[];
  isDryRun: boolean;
  packageCount: number;
}

export async function applyFixes(
  diagnostics: Diagnostic[],
  options: FixOptions,
) {
  const isDryRun = options.isDryRun ?? false;
  let fixed = 0;
  let errors = 0;
  const packages = new Set<string>();
  const fixedDiagnostics: Diagnostic[] = [];

  for (const d of diagnostics) {
    if (d.severity === "off" || !isFixable(d)) {
      continue;
    }

    if (isDryRun) {
      fixed++;
      packages.add(d.packagePath);
      continue;
    }

    try {
      await applyFix(d, options.root);
      fixed++;
      packages.add(d.packagePath);
      fixedDiagnostics.push(d);
    } catch {
      errors++;
    }
  }

  return {
    errors,
    fixed,
    fixedDiagnostics,
    isDryRun,
    packageCount: packages.size,
  };
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

async function applyFix(d: Diagnostic, root: string) {
  if (isScriptFix(d) && !isFileFix(d)) {
    await applyScriptFix(d);
    return;
  }
  await applyFileFix(d, root);
}

async function applyScriptFix(d: Diagnostic) {
  const fix = d.fix;
  const scriptName = d.scriptName;

  if (fix === undefined || scriptName === undefined) {
    return;
  }

  const packageFilePath = path.join(d.packagePath, "package.json");
  const { readFile, writeFile } = await import("node:fs/promises");
  const content = await readFile(packageFilePath, "utf8");
  const package_ = JSON.parse(content) as Record<string, unknown>;

  const scripts = package_["scripts"];
  const entries =
    typeof scripts === "object" && scripts !== null
      ? Object.entries(scripts as Record<string, unknown>)
      : [];

  if (entries.every(([name]) => name !== scriptName)) {
    entries.push([scriptName, fix]);
  }

  package_["scripts"] = Object.fromEntries(
    entries.map(([name, command]) => {
      return name === scriptName ? [name, fix] : [name, command];
    }),
  );

  await writeFile(
    packageFilePath,
    `${JSON.stringify(package_, undefined, 2)}\n`,
    "utf8",
  );
}

function isFileFix(d: Diagnostic) {
  return d.fixAction !== undefined;
}

function isFixable(d: Diagnostic) {
  return isFileFix(d) || isScriptFix(d);
}

function isScriptFix(d: Diagnostic) {
  return d.fix !== undefined && d.scriptName !== undefined;
}
