import type { Diagnostic } from "@moniq/core";

import path from "node:path";

export interface FixSummary {
  errors: number;
  fixed: number;
  isDryRun: boolean;
  packageCount: number;
}

export async function applyScriptFixes(
  diagnostics: Diagnostic[],
  options?: { isDryRun?: boolean },
): Promise<FixSummary> {
  const fixable = diagnostics.filter((d) => d.fix && d.severity !== "off");
  const isDryRun = options?.isDryRun ?? false;
  let fixed = 0;
  let errors = 0;
  const packages = new Set<string>();

  for (const d of fixable) {
    if (!d.fix) continue;

    if (isDryRun) {
      fixed++;
      packages.add(d.packagePath);
      continue;
    }

    try {
      const packageFilePath = path.join(d.packagePath, "package.json");
      const { readFile, writeFile } = await import("node:fs/promises");
      const content = await readFile(packageFilePath, "utf8");
      const package_ = JSON.parse(content) as Record<string, unknown>;

      const scriptName = d.scriptName;
      if (!scriptName) continue;

      const scriptsRecord = package_["scripts"] as
        Record<string, string> | undefined;

      if (scriptsRecord) {
        const entries = Object.entries(scriptsRecord);
        const hasScript = Object.hasOwn(scriptsRecord, scriptName);

        if (!hasScript) {
          entries.push([scriptName, d.fix]);
        }

        const updated = Object.fromEntries(
          entries.map(([name, command]) => {
            return name === scriptName
              ? [name, d.fix ?? command]
              : [name, command];
          }),
        );

        package_["scripts"] = updated;
      }

      await writeFile(
        packageFilePath,
        `${JSON.stringify(package_, undefined, 2)}\n`,
        "utf8",
      );

      fixed++;
      packages.add(d.packagePath);
    } catch {
      errors++;
    }
  }

  return { errors, fixed, isDryRun, packageCount: packages.size };
}
