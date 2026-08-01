import type { Diagnostic } from "@moniq/core";

export interface Fixer {
  apply(diagnostics: Diagnostic[], options: FixOptions): Promise<FixSummary>;
  domain: string;
}

export interface FixOptions {
  isDryRun?: boolean;
  root: string;
}

export interface FixSummary {
  errors: number;
  fixed: number;
  isDryRun: boolean;
  packageCount: number;
}

export async function applyFixes(
  fixers: Fixer[],
  diagnostics: Diagnostic[],
  options: FixOptions,
) {
  const isDryRun = options.isDryRun ?? false;
  let errors = 0;
  let fixed = 0;
  let packageCount = 0;

  for (const fixer of fixers) {
    const summary = await fixer.apply(diagnostics, {
      isDryRun,
      root: options.root,
    });
    errors += summary.errors;
    fixed += summary.fixed;
    packageCount += summary.packageCount;
  }

  return { errors, fixed, isDryRun, packageCount };
}

export async function runFixes(
  diagnostics: Diagnostic[],
  options: FixOptions,
  shouldFix: (diagnostic: Diagnostic) => boolean,
  apply: (diagnostic: Diagnostic) => Promise<void>,
): Promise<FixSummary> {
  const isDryRun = options.isDryRun ?? false;
  let fixed = 0;
  let errors = 0;
  const packages = new Set<string>();

  for (const d of diagnostics) {
    if (!shouldFix(d)) continue;

    if (isDryRun) {
      fixed++;
      packages.add(d.packagePath);
      continue;
    }

    try {
      await apply(d);
      fixed++;
      packages.add(d.packagePath);
    } catch {
      errors++;
    }
  }

  return { errors, fixed, isDryRun, packageCount: packages.size };
}
