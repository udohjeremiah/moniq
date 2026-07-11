import type { Diagnostic } from "@moniq/core";

import path from "node:path";

export async function applyScriptFixes(
  diagnostics: Diagnostic[],
): Promise<void> {
  const fixable = diagnostics.filter((d) => d.fix && d.severity !== "off");
  if (fixable.length === 0) return;

  const { readFile, writeFile } = await import("node:fs/promises");

  for (const d of fixable) {
    if (!d.fix) continue;

    try {
      const packageFilePath = path.join(d.packagePath, "package.json");
      const content = await readFile(packageFilePath, "utf8");
      const package_ = JSON.parse(content) as Record<string, unknown>;
      const scriptName = extractScriptName(d.message);

      const scriptsRecord = package_["scripts"] as
        Record<string, string> | undefined;

      if (scriptsRecord && scriptName) {
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
    } catch {
      console.error(`Failed to apply fix for ${d.packageName}`);
    }
  }
}

function extractScriptName(message: string): string | undefined {
  const regex = /"(.*?)"/;
  const match = regex.exec(message);
  return match?.[1];
}
