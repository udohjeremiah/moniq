import { type Config } from "@moniq/config";
import { type Package } from "@moniq/workspace";

import { resolveScriptPolicies } from "./scripts.js";

export interface Diagnostic {
  actual?: string;
  expected?: string;
  fix?: string;
  message: string;
  packageName: string;
  packagePath: string;
  scriptName?: string;
  severity: "error" | "off" | "warn";
}

export async function resolve(
  config: Config,
  root: string,
  packages_: Package[],
): Promise<Diagnostic[]> {
  const diagnostics: Diagnostic[] = [];

  const scriptDiags = await resolveScriptPolicies(
    config.scripts,
    root,
    packages_,
  );
  diagnostics.push(...scriptDiags);

  return diagnostics;
}
