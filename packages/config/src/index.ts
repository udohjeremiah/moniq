import path from "node:path";
import { Type } from "typebox";
import { Parse } from "typebox/value";

import {
  parseScriptPolicyOrArray,
  type ScriptPolicy,
  ScriptPolicyType,
} from "./scripts.js";

/** Moniq configuration. */
export interface UserConfig {
  /** Policies keyed by script name. Maps script names to one or more policies (first match wins). */
  scripts?: Record<string, ScriptPolicy | ScriptPolicy[]>;
}

export type { ScriptPolicy } from "./scripts.js";

const ScriptPolicyOrArrayType = Type.Union([
  ScriptPolicyType,
  Type.Array(ScriptPolicyType),
]);

const scriptsRecordType = Type.Record(Type.String(), ScriptPolicyOrArrayType);

const ConfigType = Type.Object({
  scripts: Type.Optional(scriptsRecordType),
});

/** Defines the configuration for moniq. */
export function defineConfig(config: UserConfig): UserConfig {
  return config;
}

const CONFIG_FILENAMES = [
  "moniq.config.ts",
  "moniq.config.js",
  "moniq.config.mjs",
  "moniq.config.cjs",
  "moniq.config.mts",
  "moniq.config.cts",
];

export async function loadConfig(cwd: string): Promise<UserConfig> {
  const configPath = await findConfig(cwd);

  if (configPath === undefined) {
    throw new Error(
      `No moniq.config file found in or above ${cwd}. Create one or run \`moniq init\` to generate a starter config.`,
    );
  }

  const module_ = (await import(configPath)) as Record<string, unknown>;
  const raw = module_["default"] ?? module_;

  const parsed = Parse(ConfigType, raw) as Record<string, unknown>;

  const scripts = parsed["scripts"];

  if (
    scripts !== undefined &&
    typeof scripts === "object" &&
    scripts !== null
  ) {
    for (const policyOrArray of Object.values(scripts)) {
      parseScriptPolicyOrArray(policyOrArray);
    }
  }

  return parsed;
}

async function exists(filePath: string) {
  const { existsSync } = await import("node:fs");
  return existsSync(filePath);
}

async function findConfig(startDirectory: string) {
  let directory = path.resolve(startDirectory);
  let isRootReached = false;

  while (!isRootReached) {
    const found: string[] = [];

    for (const name of CONFIG_FILENAMES) {
      if (await exists(path.join(directory, name))) {
        found.push(name);
      }
    }

    if (found.length > 1) {
      throw new Error(
        `Multiple moniq.config files found in ${directory}: ${found.join(", ")}. Remove all but one.`,
      );
    }

    if (found.length === 1) {
      const name = found[0];
      if (name === undefined) continue;
      return path.join(directory, name);
    }

    const parent = path.dirname(directory);
    isRootReached = parent === directory;
    directory = parent;
  }

  // eslint-disable-next-line unicorn/no-useless-undefined
  return undefined;
}
