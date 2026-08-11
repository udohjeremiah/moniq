import type { UserConfig } from "@moniq/config";
import type { Package } from "@moniq/workspace";

import type {
  FileDiagnosticFields,
  FilePolicy,
} from "./builtin/files/constants.js";
import type {
  ScriptDiagnosticFields,
  ScriptPolicy,
} from "./builtin/scripts/constants.js";

import { createRegistry } from "./registry.js";
import { resolveAll } from "./resolve.js";

export {
  type FileDiagnosticFields,
  type FilePolicy,
  type FixAction,
} from "./builtin/files/constants.js";
export type {
  ScriptDiagnosticFields,
  ScriptPolicy,
} from "./builtin/scripts/constants.js";

export { applyFixes, type FixOptions, type FixSummary } from "./fix.js";
export { isMatchAny, pickPolicy } from "./matching.js";
export {
  createRegistry,
  PluginRegistry,
  type RegisteredPluginDomain,
} from "./registry.js";
export { type Report } from "./resolve.js";

export type { Policy, Presence, Severity } from "@moniq/config";
export { definePlugin } from "@moniq/config/plugins";
export type {
  Diagnostic,
  MoniqPlugin,
  MoniqPluginPolicies,
  PluginPackage,
  PluginPolicyDefinition,
  PluginReportInput,
  PluginValidator,
  PolicyContext,
  PolicySchema,
  PolicySubject,
} from "@moniq/config/plugins";

export async function resolve(
  config: UserConfig,
  root: string,
  packages: Package[],
) {
  const registry = createRegistry(config);
  return resolveAll(registry.domains, config, root, packages);
}

declare module "@moniq/config/plugins" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Diagnostic extends FileDiagnosticFields {}

  interface MoniqPluginPolicies {
    files?: Record<string, FilePolicy | FilePolicy[]>;
  }
}

declare module "@moniq/config/plugins" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Diagnostic extends ScriptDiagnosticFields {}

  interface MoniqPluginPolicies {
    scripts?: Record<string, ScriptPolicy | ScriptPolicy[]>;
  }
}
