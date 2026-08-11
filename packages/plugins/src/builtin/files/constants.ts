import type { Policy } from "@moniq/config";

import { PolicyType, Type } from "@moniq/config/plugins";

import type { fileKind } from "./schema.js";

import { filePolicySchema } from "./schema.js";

export const filePolicyFullSchema = Type.Intersect([
  PolicyType,
  filePolicySchema,
]);

export interface FileDiagnosticFields {
  actual?: string;
  expected?: string;
  file?: string;
  fix?: string;
  fixAction?: FixAction;
}

export type FileKind = Type.Static<typeof fileKind>;

/**
 * Policy for validating a workspace-relative file, directory, or symlink.
 *
 * Used by the `files` policy domain in `UserConfig`.
 *
 * Inherits the policy options from {@link Policy}.
 */
export type FilePolicy = Type.Static<typeof filePolicyFullSchema>;

export type FixAction = "create" | "delete" | "mkdir" | "write";
