import type { TSchema as SchemaType, Static as StaticSchema } from "typebox";

import type { Diagnostic } from "../policy/diagnostic.js";
import type { Policy } from "../policy/policy.js";

export type { Diagnostic, DiagnosticMetadata } from "../policy/diagnostic.js";

/**
 * A Moniq plugin.
 */
export interface MoniqPlugin {
  /**
   * Logical plugin name.
   */
  name: string;

  /**
   * Policy definition contributed by this plugin.
   */
  policy: PluginPolicyDefinition;
}

/**
 * Extension point for third-party policy domains.
 *
 * Plugin packages augment this interface to add their own top-level policy
 * domains to Moniq's configuration types.
 *
 * @example
 * ```ts
 * declare module "@udohjeremiah/moniq/plugins" {
 *   interface MoniqPluginPolicies {
 *     packageMetadata: packageMetadataPolicy | packageMetadataPolicy[];
 *   }
 * }
 * ```
 *
 * Once augmented, the domain is available directly on `moniq.config.ts`:
 *
 * ```ts
 * export default defineConfig({
 *   packageMetadata: {
 *     // ...
 *   },
 * });
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface MoniqPluginPolicies {}

/** A workspace package as exposed to plugin definitions. */
export interface PluginPackage {
  /** Absolute path to the package directory. */
  path: string;
}

/**
 * Definition of a single plugin-provided policy domain.
 */
export interface PluginPolicyDefinition<
  TSchema extends PolicySchema = PolicySchema,
> {
  /**
   * TypeBox schema validating the plugin-specific policy shape.
   *
   * Common options (`presence`, `include`, `exclude`, `severity`, `description`)
   * are handled by Moniq and do not need to be declared here; they are combined
   * with this schema internally before validation.
   */
  schema: TSchema;

  /**
   * Maps the domain's config value to the targets to validate.
   *
   * When omitted, Moniq creates one default subject per workspace package.
   * When provided, the plugin controls the validation targets and may attach
   * plugin-specific data through `PolicySubject.value`.
   */
  subjects?(
    config: unknown,
    root: string,
    packages: PluginPackage[],
  ): PolicySubject[] | Promise<PolicySubject[]>;

  /**
   * Validator invoked with the selected policy for each matching subject.
   */
  validate(
    context: PolicyContext<Policy & StaticSchema<TSchema>>,
  ): Promise<void> | void;
}

/**
 * What a plugin may report to Moniq.
 */
export type PluginReportInput = Omit<
  Diagnostic,
  "domain" | "packageName" | "packagePath" | "plugin" | "severity"
>;

/**
 * Signature of a plugin policy validator.
 *
 * Referenced by {@link PluginPolicyDefinition}; assignable to a more generic
 * definition because the parameter is checked bivariantly.
 */
export type PluginValidator<TPolicy extends Policy = Policy> = (
  context: PolicyContext<TPolicy>,
) => Promise<void> | void;

/**
 * Context passed to a plugin policy validator.
 *
 * Moniq only provides package identity here. Plugins that need a package's
 * contents (e.g. its `package.json`) collect that data themselves through
 * their `subjects(...)` hook and expose it via the subject `value`.
 */
export interface PolicyContext<TPolicy extends Policy = Policy> {
  /** The workspace package currently being validated. */
  package: PluginPackage;

  /** The policy selected for the currently validated subject. */
  policy: TPolicy;

  /**
   * Report a violation for the active policy.
   *
   * Moniq associates the diagnostic with the active policy and its severity.
   */
  report: (input: PluginReportInput) => void;

  /**
   * Plugin-specific data associated with this validation target, produced by
   * `subjects()` and passed through as-is.
   *
   * `undefined` when using the default package subjects.
   */
  subject: unknown;

  /** Information about the workspace. */
  workspace: {
    root: string;
  };
}

/**
 * A TypeBox schema object that validates a plugin policy's shape.
 *
 * Exposed as part of the plugin API so authors can reference it structurally;
 * `Type.Static` is available for compile-time inference. Moniq validates plugin
 * policies against these schemas (combined with the shared base) internally,
 * so authors never call `Check`/`Errors` themselves.
 */
export type PolicySchema = SchemaType;

/**
 * A single validation target for a plugin policy domain.
 *
 * A domain's config value maps to zero or more subjects that the engine
 * validates. For value-shaped config (a single policy or array applied across
 * packages) the engine supplies a default set of subjects (one per package);
 * record-shaped domains such as the built-in `files` and `scripts` provide
 * their own `subjects()` to map config keys to targets.
 */
export interface PolicySubject {
  /**
   * The package this subject belongs to.
   */
  package: PluginPackage;

  /**
   * Policies governing this subject.
   *
   * When a plugin provides `subjects()`, the plugin is responsible for
   * supplying the applicable policies. When `subjects()` is omitted, Moniq
   * creates the default subject and supplies the policies from the domain's
   * config value.
   */
  policies: Policy[];

  /**
   * Workspace-relative path used for `include`/`exclude` matching.
   */
  relativePath: string;

  /**
   * Plugin-specific data associated with this validation target, passed through
   * to the validator context as `subject`.
   */
  value?: unknown;
}

/** Defines a Moniq plugin. */
export function definePlugin<TPlugin extends MoniqPlugin>(
  plugin: TPlugin,
): TPlugin {
  return plugin;
}

export { PolicyType } from "../policy/policy.js";

export { Type } from "typebox";
