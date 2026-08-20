import path from "node:path";
import { pathToFileURL } from "node:url";
import { Type } from "typebox";
import { Parse } from "typebox/value";

import type { MoniqPlugin, MoniqPluginPolicies } from "../plugins/plugins.js";

/** Moniq configuration. */
export interface UserConfig extends MoniqPluginPolicies {
  /**
   * Plugins registered for runtime policy validation.
   */
  plugins?: MoniqPlugin[];
}

const pluginsType = Type.Optional(Type.Array(Type.Unknown()));

const ConfigType = Type.Object(
  { plugins: pluginsType },
  { additionalProperties: true },
);

export class ConfigNotFoundError extends Error {
  override name = "ConfigNotFoundError";

  constructor(filenames: string) {
    super(
      [
        "No Moniq configuration found.",
        "",
        "Expected one of:",
        filenames,
        "",
        "Create one by running:",
        "",
        "  moniq init",
      ].join("\n"),
    );
  }
}

/** Defines the configuration for Moniq. */
export function defineConfig(config: UserConfig): UserConfig {
  return config;
}

export async function loadConfig(root: string) {
  const CONFIG_FILENAMES = [
    "moniq.config.js",
    "moniq.config.cjs",
    "moniq.config.mjs",
    "moniq.config.ts",
    "moniq.config.cts",
    "moniq.config.mts",
  ];

  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(root);
  const found = CONFIG_FILENAMES.filter((name) => entries.includes(name));

  if (found.length > 1) {
    throw new Error(
      `Multiple moniq.config.* files found in ${root}: ${found.join(", ")}. Remove all but one.`,
    );
  }

  if (found.length === 0) {
    throw new ConfigNotFoundError(
      CONFIG_FILENAMES.map((name) => `- ${name}`).join("\n"),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const configPath = path.join(root, found[0]!);

  const module_ = (await import(pathToFileURL(configPath).href)) as Record<
    string,
    unknown
  >;
  const raw = module_["default"] ?? module_;

  return Parse(ConfigType, raw) as UserConfig;
}
