export type { UserConfig } from "./config/index.js";
export {
  ConfigNotFoundError,
  defineConfig,
  loadConfig,
} from "./config/index.js";

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
} from "./plugins/plugins.js";
export { definePlugin, PolicyType, Type } from "./plugins/plugins.js";

export type { RegisteredPluginDomain } from "./plugins/registry.js";
export {
  createRegistry,
  PluginRegistry,
  registerPluginPack,
} from "./plugins/registry.js";

export type { FixOptions, FixSummary } from "./policy/fix.js";
export { applyFixes } from "./policy/fix.js";

export { isMatchAny, pickPolicy } from "./policy/matching.js";

export type { Policy, Presence, Severity } from "./policy/policy.js";

export type { Report } from "./policy/resolve.js";
export { resolveAll } from "./policy/resolve.js";

export type { PackageJson } from "./workspace/package-json.js";
export { readPackageJson, writePackageJson } from "./workspace/package-json.js";

export { getScript, setScript } from "./workspace/scripts.js";

export type { Package, PackageManager } from "./workspace/workspace.js";
export {
  detectPackageManager,
  discoverWorkspace,
  findWorkspaceRoot,
  hasWorkspaceConfig,
} from "./workspace/workspace.js";
