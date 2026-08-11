import type { Severity } from "./policy.js";

/**
 * A single violation reported while resolving a policy domain.
 *
 * The base shape contains only fields required by the engine. Plugins can add
 * typed diagnostic fields through module augmentation, while `metadata`
 * provides a permissive escape hatch for plugin-specific data.
 *
 * @example
 * ```ts
 * declare module "@udohjeremiah/moniq/plugins" {
 *   interface Diagnostic {
 *     packageJsonField?: string;
 *   }
 * }
 * ```
 */
export interface Diagnostic {
  /** The policy domain that produced this violation. */
  domain: string;

  /** Human-readable description of the violation. */
  message: string;

  /**
   * Arbitrary extra information, surfaced (e.g. to SARIF) as-is. The permissive
   * fallback for plugin data that doesn't warrant a typed first-class field.
   */
  metadata?: Record<string, unknown>;

  /** Name of the workspace package this violation belongs to. */
  packageName: string;

  /** Absolute path of the workspace package this violation belongs to. */
  packagePath: string;

  /** Name of the plugin that produced the diagnostic. */
  plugin: string;

  /** The policy rule identifier, e.g. `"files/missing"`. */
  ruleId: string;

  /** Human-readable rule name reported alongside the `ruleId`. */
  ruleName: string;

  /** Severity of the violation. */
  severity: Severity;
}
