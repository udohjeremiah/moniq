import path from "node:path";
import { Type } from "typebox";
import { Parse } from "typebox/value";

import {
  type FilePolicy,
  FilePolicyType,
  parseFilePolicyOrArray,
} from "./files.js";
import {
  parseScriptPolicyOrArray,
  type ScriptPolicy,
  ScriptPolicyType,
} from "./scripts.js";

/** Moniq configuration. */
export interface UserConfig {
  /**
   * Policies keyed by workspace-relative filesystem path.
   *
   * Maps paths to one or more policies (first match wins).
   */
  files?: Record<string, FilePolicy | FilePolicy[]>;

  /** Policies keyed by script name.
   *
   * Maps script names to one or more policies (first match wins).
   */
  scripts?: Record<string, ScriptPolicy | ScriptPolicy[]>;
}

export type { BasePolicy, Presence, Severity } from "./base.js";
export type { FileKind, FilePolicy } from "./files.js";
export type { ScriptPolicy } from "./scripts.js";

const FilePolicyOrArrayType = Type.Union([
  FilePolicyType,
  Type.Array(FilePolicyType),
]);

const ScriptPolicyOrArrayType = Type.Union([
  ScriptPolicyType,
  Type.Array(ScriptPolicyType),
]);

const filesRecordType = Type.Record(Type.String(), FilePolicyOrArrayType);

const scriptsRecordType = Type.Record(Type.String(), ScriptPolicyOrArrayType);

const ConfigType = Type.Object({
  files: Type.Optional(filesRecordType),
  scripts: Type.Optional(scriptsRecordType),
});

const CONFIG_FILENAMES = [
  "moniq.config.ts",
  "moniq.config.js",
  "moniq.config.mjs",
  "moniq.config.cjs",
  "moniq.config.mts",
  "moniq.config.cts",
];

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

/** Defines the configuration for moniq. */
export function defineConfig(config: UserConfig): UserConfig {
  return config;
}

export async function loadConfig(root: string) {
  const found: string[] = [];

  for (const name of CONFIG_FILENAMES) {
    if (await exists(path.join(root, name))) {
      found.push(name);
    }
  }

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

  const module_ = (await import(configPath)) as Record<string, unknown>;
  const raw = module_["default"] ?? module_;

  const parsed = Parse(ConfigType, raw) as Record<string, unknown>;

  validatePolicyRecord(parsed["files"], parseFilePolicyOrArray);
  validatePolicyRecord(parsed["scripts"], parseScriptPolicyOrArray);

  return parsed;
}

async function exists(filePath: string) {
  const { existsSync } = await import("node:fs");
  return existsSync(filePath);
}

function validatePolicyRecord(
  record: unknown,
  parse: (value: unknown) => unknown,
) {
  if (record === undefined || typeof record !== "object" || record === null) {
    return;
  }

  for (const policyOrArray of Object.values(record)) {
    parse(policyOrArray);
  }
}
