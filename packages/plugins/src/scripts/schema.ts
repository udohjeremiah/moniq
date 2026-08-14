import { Type } from "@moniq/core";

const customCommandSchema = Type.Array(Type.String());

const commandType = Type.Unsafe<
  ((command: string) => boolean) | RegExp | string
>(Type.Unknown());

export const scriptPolicySchema = Type.Object({
  /**
   * Package globs that may define their own command for this script (no-op unless `command` is set).
   *
   * Special values:
   * - `"."` for root only
   * - `"*"` for all packages (including root),
   * - `"**"` for all packages except the root.
   *
   * @default []
   */
  allowCustomCommands: Type.Optional(customCommandSchema),

  /**
   * Whether to autofix mismatched or missing scripts when running `moniq fix`.
   * Only applies when `command` is a plain string.
   *
   * @default false
   */
  autofix: Type.Optional(Type.Boolean()),

  /**
   * The expected command — exact string, RegExp, or predicate like `bin("eslint")`.
   * When omitted, only existence is validated (subject to `presence`).
   */
  command: Type.Optional(commandType),
});
