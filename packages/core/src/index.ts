import { type UserConfig } from "@moniq/config";
import { type Package } from "@moniq/workspace";

import { resolveScriptPolicies } from "./scripts.js";

export interface Diagnostic {
  actual?: string;
  column?: number;
  domain: string;
  expected?: string;
  file?: string;
  fix?: string;
  line?: number;
  message: string;
  metadata?: Record<string, unknown>;
  packageName: string;
  packagePath: string;
  plugin?: string;
  ruleId: string;
  ruleName: string;
  scriptName?: string;
  severity: "error" | "off" | "warn";
}

export interface Report {
  results: Diagnostic[];
  summary: {
    errors: number;
    passed: boolean;
    total: number;
    warnings: number;
  };
  tool: {
    name: string;
    version?: string;
  };
}

export async function resolve(
  config: UserConfig,
  root: string,
  packages_: Package[],
): Promise<Report> {
  const diagnostics: Diagnostic[] = [];

  const scriptDiags = await resolveScriptPolicies(
    config.scripts,
    root,
    packages_,
  );
  diagnostics.push(...scriptDiags);

  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warn").length;

  return {
    results: diagnostics,
    summary: {
      errors,
      passed: errors === 0,
      total: diagnostics.length,
      warnings,
    },
    tool: { name: "moniq" },
  };
}
