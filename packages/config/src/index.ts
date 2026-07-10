import { createJiti } from "jiti";
import path from "node:path";
import { z } from "zod";

/**
 * Moniq configuration.
 */
export interface Config {
  /**
   * Policies keyed by script name.
   *
   * A single script name may map to multiple policies
   * to express different rules for different zones of
   * the workspace (e.g. `apps/*` vs `packages/*`).
   *
   * When multiple policies are provided for a script,
   * they are evaluated in array order for each package.
   * The first policy whose `include`/`exclude` matches
   * the package wins.
   *
   * Overlapping policies are a configuration error and
   * should be rewritten so that only one policy matches
   * a package.
   */
  scripts?: Record<string, ScriptPolicy | ScriptPolicy[]>;
}

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

const CommandSchema = z.union([
  z.custom<(command: string) => boolean>(
    (value) => typeof value === "function",
  ),
  z.instanceof(RegExp),
  z.string(),
]);

const ScriptPolicySchema: z.ZodType<ScriptPolicy> = z.object({
  allowCustomCommands: z.array(z.string()).optional(),
  autofix: z.boolean().optional(),
  command: CommandSchema.optional(),
  description: z.string().optional(),
  exclude: z.array(z.string()).optional(),
  include: z.array(z.string()).optional(),
  required: z.boolean().optional(),
  severity: z
    .union([z.literal("error"), z.literal("off"), z.literal("warn")])
    .optional(),
});

const ScriptPolicyOrArraySchema = z.union([
  ScriptPolicySchema,
  z.array(ScriptPolicySchema),
]);

const ConfigSchema: z.ZodType<Config> = z.object({
  scripts: z.record(z.string(), ScriptPolicyOrArraySchema).optional(),
});

/**
 * Identity helper for type inference.
 *
 * @param config - The configuration object.
 * @returns The same configuration object, typed as {@link Config}.
 */
export function defineConfig(config: Config): Config {
  return config;
}

/**
 * Loads a Moniq configuration from the nearest `moniq.config.ts` file.
 *
 * Searches from `cwd` upward through parent directories until a
 * `moniq.config.ts` file is found. The file is loaded at runtime via
 * `jiti` and validated against a Zod schema.
 *
 * @param cwd - The directory to start searching from.
 * @returns The validated configuration.
 * @throws If no configuration file is found or the configuration is invalid.
 */
export async function loadConfig(cwd: string): Promise<Config> {
  const configPath = await findConfig(cwd);

  if (configPath === undefined) {
    throw new Error(
      `No moniq.config.ts found in or above ${cwd}. Create one or run \`moniq init\` to generate a starter config.`,
    );
  }

  const jiti = createJiti(import.meta.url, {});
  const module_ = await jiti.import(configPath);
  const raw = (module_ as Record<string, unknown>)["default"] ?? module_;

  return ConfigSchema.parse(raw);
}

async function exists(filePath: string): Promise<boolean> {
  const { existsSync } = await import("node:fs");
  return existsSync(filePath);
}

async function findConfig(startDirectory: string): Promise<string | undefined> {
  let directory = path.resolve(startDirectory);
  let isRootReached = false;

  while (!isRootReached) {
    const configPath = path.join(directory, "moniq.config.ts");

    if (await exists(configPath)) {
      return configPath;
    }

    const parent = path.dirname(directory);
    isRootReached = parent === directory;
    directory = parent;
  }

  return undefined;
}
