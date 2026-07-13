import { Type } from "typebox";
import { Check, Errors } from "typebox/value";

/**
 * A single script policy configuration.
 *
 * See the `scripts` field of `Config` for usage.
 */
export interface ScriptPolicy {
  /**
   * Package globs that may define their own command for this script (no-op unless `command` is set).
   * Special values: `"."` for root only, `"*"` for all packages. Defaults to `[]`.
   */
  allowCustomCommands?: string[];

  /**
   * Whether to autofix mismatched or missing scripts when running `moniq fix`.
   * Only applies when `command` is a plain string. Defaults to `false`.
   */
  autofix?: boolean;

  /**
   * The expected command — exact string, RegExp, or predicate like `bin("eslint")`.
   * When omitted, only existence is validated (subject to `required`).
   */
  command?: ((command: string) => boolean) | RegExp | string;

  /** Human-readable explanation displayed alongside diagnostics. */
  description?: string;

  /**
   * Package globs to exclude, evaluated after `include`.
   * Defaults to `[]`.
   */
  exclude?: string[];

  /**
   * Package globs this policy applies to.
   * Special values: `"."` for root only, `"*"` for all packages.
   * Defaults to `["*"]`.
   */
  include?: string[];

  /**
   * Whether the script must exist. If `false`, the script is optional.
   * Defaults to `true`.
   */
  required?: boolean;

  /**
   * Severity of violations: `"off"` (disabled), `"warn"`, or `"error"`.
   * Defaults to `"error"`.
   */
  severity?: "error" | "off" | "warn";
}

const stringArrayType = Type.Array(Type.String());

const severityType = Type.Union([
  Type.Literal("error"),
  Type.Literal("off"),
  Type.Literal("warn"),
]);

export const ScriptPolicyType = Type.Object({
  allowCustomCommands: Type.Optional(stringArrayType),
  autofix: Type.Optional(Type.Boolean()),
  command: Type.Optional(Type.Unknown()),
  description: Type.Optional(Type.String()),
  exclude: Type.Optional(stringArrayType),
  include: Type.Optional(stringArrayType),
  required: Type.Optional(Type.Boolean()),
  severity: Type.Optional(severityType),
});

export function parseScriptPolicy(data: unknown) {
  if (!Check(ScriptPolicyType, data)) {
    const errors = Errors(ScriptPolicyType, data);
    const first = errors[0];

    throw new TypeError(first?.message ?? "Invalid ScriptPolicy value");
  }

  const record = data as Record<string, unknown>;

  if (!isCommand(record["command"])) {
    throw new TypeError(
      "Invalid command: must be a function, RegExp, or string",
    );
  }

  return data as ScriptPolicy;
}

export function parseScriptPolicyOrArray(data: unknown) {
  return Array.isArray(data)
    ? data.map((policy) => parseScriptPolicy(policy))
    : parseScriptPolicy(data);
}

function isCommand(
  value: unknown,
): value is ((command: string) => boolean) | RegExp | string {
  return (
    value === undefined ||
    typeof value === "function" ||
    value instanceof RegExp ||
    typeof value === "string"
  );
}
