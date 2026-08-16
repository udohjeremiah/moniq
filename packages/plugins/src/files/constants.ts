import type { Policy, Type } from "@moniq/core";

import type { filePolicySchema } from "./schema.js";

export type FilePolicy = Policy & Type.Static<typeof filePolicySchema>;

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
  interface DiagnosticMetadata {
    /** Actual value observed for mismatch-style violations. */
    actual?: string;

    /** Expected value for mismatch-style violations. */
    expected?: string;
  }

  interface MoniqPluginPolicies {
    files?: Record<string, FilePolicy | FilePolicy[]>;
  }
}
