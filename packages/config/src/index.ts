import { type ScriptPolicy, ScriptPolicySchema } from "@moniq/policies/scripts";
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
