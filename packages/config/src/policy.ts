import { Type } from "typebox";

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

export const PolicyType = Type.Object({
  /** Human-readable explanation displayed alongside diagnostics. */
  description: Type.Optional(Type.String()),

  /** Workspace package paths or glob patterns excluded from this policy. */
  exclude: Type.Optional(stringArrayType),

  /** Workspace package paths or glob patterns this policy applies to. */
  include: Type.Optional(stringArrayType),

  /** Whether the item a policy targets must exist. */
  presence: Type.Optional(presenceType),

  /** Severity used when this policy reports a violation. */
  severity: Type.Optional(severityType),
});

/**
 * Options shared by every policy domain.
 *
 * Plugin authors should extend `Policy` when defining custom policies so they
 * automatically inherit the standard workspace matching and diagnostic
 * options.
 */
export type Policy = Type.Static<typeof PolicyType>;

/**
 * Whether the item a policy targets must exist.
 *
 * - `"required"` — the item must exist.
 * - `"optional"` — the item may exist.
 * - `"forbidden"` — the item must not exist.
 */
export type Presence = Type.Static<typeof presenceType>;

/**
 * Severity used when a policy reports a violation.
 *
 * - `"error"` — fail the check and exit with a non-zero status code.
 * - `"warn"` — report the violation without failing the check.
 * - `"off"` — disable the policy entirely.
 */
export type Severity = Type.Static<typeof severityType>;
