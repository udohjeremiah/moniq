import { Type } from "typebox";
import { Check, Errors } from "typebox/value";

import { type BasePolicy, BasePolicyType } from "./base.js";

/**
 * Policy for validating the `scripts` field in a package's `package.json` file.
 *
 * Used by the `scripts` policy domain in `UserConfig`.
 *
 * Inherits the policy options from {@link BasePolicy}.
 */
export interface ScriptPolicy extends BasePolicy {
  /**
   * Workspace package paths or glob patterns that are allowed to use a
   * different command for this script.
   *
   * Only applies when `command` is specified.
   *
   * Special values:
   * - "."  - workspace root only
   * - "*"  - every package, including the root
   * - "**" - every package, excluding the root
   *
   * @default []
   */
  allowCustomCommands?: string[];

  /**
   * Whether Moniq may automatically fix missing or mismatched scripts when
   * running `moniq fix`.
   *
   * Only applies when `command` is an exact string.
   *
   * @default false
   */
  autofix?: boolean;

  /**
   * Expected command for the script.
   *
   * Can be:
   * - an exact string
   * - a `RegExp`
   * - a predicate such as `bin("eslint")`
   *
   * When omitted, only the script's presence is validated.
   */
  command?: ((command: string) => boolean) | RegExp | string;
}

const stringArrayType = Type.Array(Type.String());

export const ScriptPolicyType = Type.Object({
  ...BasePolicyType.properties,
  allowCustomCommands: Type.Optional(stringArrayType),
  autofix: Type.Optional(Type.Boolean()),
  command: Type.Optional(Type.Unknown()),
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

function isCommand(value: unknown) {
  return (
    value === undefined ||
    typeof value === "function" ||
    value instanceof RegExp ||
    typeof value === "string"
  );
}
