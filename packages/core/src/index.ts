import { type Config } from "@moniq/config";
import { type Package } from "@moniq/workspace";

import { resolveScriptPolicies } from "./scripts.js";

/**
 * A single diagnostic emitted during policy resolution.
 *
 * Each diagnostic represents one violation of one policy for one package.
 * Domain-specific context (e.g. which script, which file) is encoded in the
 * `message` field so the type stays generic across all policy domains.
 */
export interface Diagnostic {
  /** The value that was found (e.g. the actual script command). */
  actual?: string;
  /** The value that was expected (e.g. the configured command). */
  expected?: string;
  /** The value to write when autofix is available (safe string replacements only). */
  fix?: string;
  /** Human-readable explanation of the violation. */
  message: string;
  /** Package name (from `package.json#name`). */
  packageName: string;
  /** Absolute path to the package directory. */
  packagePath: string;
  /** Inherited from the matching policy. */
  severity: "error" | "off" | "warn";
}

/**
 * Resolves all policies across all domains against every package in the
 * workspace.
 *
 * Currently supported domains:
 * - `scripts` — validates `package.json#scripts` entries against script policies.
 *
 * As new policy domains are added (files, dependencies, etc.), their resolvers
 * are called from this function and their diagnostics appended to the result.
 *
 * @param config - Resolved Moniq configuration.
 * @param root - Absolute path to the workspace root.
 * @param packages - Discovered workspace packages.
 * @returns Array of diagnostics (one per violation).
 */
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
