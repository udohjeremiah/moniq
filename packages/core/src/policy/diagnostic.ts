import type { Severity } from "./policy.js";

/**
 * A single violation reported while resolving a policy domain.
 */
export interface Diagnostic {
  /** The policy domain that produced this violation. */
  domain: string;

  /**
   * Self-contained operation for fixing this violation.
   *
   * Moniq invokes the function during a fix run when the active policy has
   * `autofix` enabled. During a dry run, Moniq reports the fix as available
   * without invoking it.
   */
  fix?: () => Promise<void> | void;

  /** Human-readable description of the violation. */
  message: string;

  /**
   * Plugin-supplied data associated with the violation.
   *
   * Metadata is surfaced as-is by output formatters. Plugins can augment
   * `DiagnosticMetadata` to make their metadata fields type-safe.
   */
  metadata?: DiagnosticMetadata;

  /** Name of the workspace package this violation belongs to. */
  packageName: string;

  /** Absolute path of the workspace package this violation belongs to. */
  packagePath: string;

  /** Name of the plugin that produced the diagnostic. */
  plugin: string;

  /** Policy rule identifier, e.g. `"files/missing"`. */
  ruleId: string;

  /** Human-readable rule name reported alongside the `ruleId`. */
  ruleName: string;

  /** Severity assigned to the active policy. */
  severity: Severity;
}

/**
 * Plugin-supplied metadata carried on a diagnostic.
 *
 * Metadata is a permissive key/value bag for plugin-specific information.
 * Plugins can augment this interface to make their metadata fields type-safe.
 *
 * @example
 * ```ts
 * declare module "@udohjeremiah/moniq/plugins" {
 *   interface DiagnosticMetadata {
 *     expected?: string;
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
export interface DiagnosticMetadata {
  [key: string]: unknown;
}
