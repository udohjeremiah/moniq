import type { Policy, Type } from "@moniq/core";

import type { fileKind, filePolicySchema } from "./schema.js";

export type FileKind = Type.Static<typeof fileKind>;

export type FilePolicy = Policy & Type.Static<typeof filePolicySchema>;

export type FixAction = "create" | "delete" | "mkdir" | "write";

declare module "@udohjeremiah/moniq" {
  interface UserConfig {
    /**
     * Policy for validating a workspace-relative file, directory, or symlink.
     *
     * Used by the `files` policy domain in `UserConfig`.
     *
     * Inherits the policy options from {@link Policy}.
     */
    files?: Record<string, FilePolicy | FilePolicy[]>;
  }
}

declare module "@moniq/core" {
  interface Diagnostic {
    actual?: string;
    expected?: string;
    file?: string;
    fix?: string;
    fixAction?: FixAction;
  }

  interface MoniqPluginPolicies {
    files?: Record<string, FilePolicy | FilePolicy[]>;
  }
}
