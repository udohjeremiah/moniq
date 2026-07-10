import { Type } from "typebox";
import { Check, Errors } from "typebox/value";

/**
 * A single script policy configuration.
 */
export interface ScriptPolicy {
  /**
   * Package globs that may define their own command
   * for this script instead of the configured one.
   *
   * Matching packages must still define the script,
   * but its command will not be validated or
   * automatically fixed.
   *
   * Supports glob patterns.
   *
   * Special values:
   * - "." targets only the workspace root package.json.
   * - "*" targets every workspace package, including the root.
   *
   * Defaults to `[]`.
   *
   * This option has no effect unless `command` is specified.
   */
  allowCustomCommands?: string[];

  /**
   * Whether Moniq may automatically replace
   * incorrect or missing commands with the configured
   * command when running `moniq --fix`.
   *
   * Only takes effect when `command` is a plain
   * `string`. A `RegExp` or predicate (including `bin()`)
   * has no single correct replacement, so autofix is
   * ignored in those cases.
   *
   * Defaults to `false`.
   */
  autofix?: boolean;

  /**
   * The expected command for this script.
   *
   * If omitted, Moniq only validates that the script
   * exists (subject to `required`).
   *
   * Supported values:
   *
   * - `string`
   *   Requires an exact match against the entire script.
   *
   * - `RegExp`
   *   Matches the entire script using a regular expression.
   *
   *   Prefer anchoring your pattern (e.g. `/^eslint\b/`)
   *   to avoid accidentally matching unrelated commands.
   *
   * - `(command: string) => boolean`
   *   Custom validation for cases that cannot be
   *   expressed as a string or regular expression.
   *
   *   The exported `bin(name)` helper covers the most
   *   common case: validating the executable being run,
   *   regardless of environment variable prefixes or
   *   package manager wrappers.
   *
   *   For example, `bin("eslint")` matches all of:
   *
   *   - `eslint .`
   *   - `NODE_ENV=test eslint .`
   *   - `pnpm exec eslint .`
   *   - `pnpm dlx eslint .`
   *   - `npx eslint .`
   *   - `yarn eslint .`
   *   - `yarn dlx eslint .`
   *   - `bunx eslint .`
   *
   *   Unlike a regular expression, `bin()` parses the
   *   command and validates the actual executable rather
   *   than searching for text anywhere in the string.
   *
   *   `bin()` does not inspect nested shell commands
   *   (e.g. `concurrently "eslint ." "tsc --noEmit"`),
   *   pipes, or custom task runners. Use `allowCustomCommands`
   *   when those cases vary across packages.
   */
  command?: ((command: string) => boolean) | RegExp | string;

  /**
   * Human-readable explanation displayed alongside
   * diagnostics.
   *
   * Useful for documenting why this policy exists.
   */
  description?: string;

  /**
   * Workspace package globs to exclude from this policy.
   *
   * Exclusions are evaluated after `include`.
   *
   * Supports the same special values as `include`.
   *
   * Defaults to `[]`.
   */
  exclude?: string[];

  /**
   * Workspace package globs this policy applies to.
   *
   * Supports glob patterns.
   *
   * Special values:
   * - "." targets only the workspace root package.json.
   * - "*" targets every workspace package, including the root.
   *
   * Defaults to `["*"]`.
   */
  include?: string[];

  /**
   * Whether this script must exist.
   *
   * If `false`, the script is optional.
   *
   * If a `command` is configured, it is only validated
   * when the script exists.
   *
   * Defaults to `true`.
   */
  required?: boolean;

  /**
   * Severity of violations.
   *
   * off   -> Rule disabled.
   * warn  -> Report warning.
   * error -> Report error and fail CI.
   *
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

/**
 * TypeBox schema for ScriptPolicy — validates JSON-compatible fields
 * (strings, booleans, arrays, enums). The `command` field is validated
 * at runtime by `parseScriptPolicy`.
 */
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

/**
 * Parses and validates an unknown value as a ScriptPolicy.
 * Handles the `command` field (function/RegExp/string) which
 * cannot be expressed in plain JSON Schema.
 */
export function parseScriptPolicy(data: unknown): ScriptPolicy {
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

/**
 * Parses a single policy or array of policies.
 */
export function parseScriptPolicyOrArray(
  data: unknown,
): ScriptPolicy | ScriptPolicy[] {
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
