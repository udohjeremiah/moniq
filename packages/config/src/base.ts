import { Type } from "typebox";

/**
 * Options shared by every policy domain.
 *
 * Every built-in policy extends `BasePolicy`, making these options available
 * consistently across all policy domains.
 *
 * Moniq also uses this shared shape internally for policy matching,
 * normalization, and validation.
 *
 * Plugin authors should extend `BasePolicy` when defining custom policies so
 * they automatically inherit the standard workspace matching and diagnostic
 * options.
 */
export interface BasePolicy {
  /**
   * Human-readable explanation displayed alongside diagnostics.
   */
  description?: string;

  /**
   * Workspace package paths or glob patterns excluded from this policy.
   *
   * Exclusions are evaluated after `include` matching.
   *
   * @default []
   */
  exclude?: string[];

  /**
   * Workspace package paths or glob patterns this policy applies to.
   *
   * Package paths are relative to the workspace root.
   *
   * Special values:
   * - `"."` - workspace root only
   * - `"*"` - every package, including the root
   * - `"**"` - every package, excluding the root
   *
   * @default ["*"]
   */
  include?: string[];

  /**
   * Whether the item a policy targets must exist.
   *
   * - `"required"` - must exist
   * - `"optional"` - may exist
   * - `"forbidden"` - must not exist
   *
   * @default "required"
   */
  presence?: Presence;

  /**
   * Severity used when this policy reports a violation.
   *
   * @default "error"
   */
  severity?: Severity;
}

/**
 * Whether the item a policy targets must exist.
 *
 * - `"required"` — the item must exist.
 * - `"optional"` — the item may exist.
 * - `"forbidden"` — the item must not exist.
 */
export type Presence = "forbidden" | "optional" | "required";

/**
 * Severity used when a policy reports a violation.
 *
 * - `"error"` — fail the check and exit with a non-zero status code.
 * - `"warn"` — report the violation without failing the check.
 * - `"off"` — disable the policy entirely.
 */
export type Severity = "error" | "off" | "warn";

const stringArrayType = Type.Array(Type.String());

const presenceType = Type.Union([
  Type.Literal("forbidden"),
  Type.Literal("optional"),
  Type.Literal("required"),
]);

const severityType = Type.Union([
  Type.Literal("error"),
  Type.Literal("off"),
  Type.Literal("warn"),
]);

export const BasePolicyType = Type.Object({
  description: Type.Optional(Type.String()),
  exclude: Type.Optional(stringArrayType),
  include: Type.Optional(stringArrayType),
  presence: Type.Optional(presenceType),
  severity: Type.Optional(severityType),
});
