import type { Diagnostic } from "@moniq/core";

import path from "node:path";

import { type FixOptions, runFixes } from "./fix.js";

export async function applyScriptFixes(
  diagnostics: Diagnostic[],
  options: FixOptions,
) {
  return runFixes(
    diagnostics,
    options,
    (d) => d.domain === "scripts" && !!d.fix && d.severity !== "off",
    (d) => applyScriptFix(d),
  );
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

  const scriptsRecord = package_["scripts"] as
    Record<string, string> | undefined;

  if (scriptsRecord) {
    const entries = Object.entries(scriptsRecord);
    const hasScript = Object.hasOwn(scriptsRecord, scriptName);

    if (!hasScript) {
      entries.push([scriptName, fix]);
    }

    const updated = Object.fromEntries(
      entries.map(([name, command]) => {
        return name === scriptName ? [name, fix] : [name, command];
      }),
    );

    package_["scripts"] = updated;
  }

  await writeFile(
    packageFilePath,
    `${JSON.stringify(package_, undefined, 2)}\n`,
    "utf8",
  );
}
