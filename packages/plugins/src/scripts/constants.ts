import type { Policy, Type } from "@moniq/core";

import type { scriptPolicySchema } from "./schema.js";

export type ScriptPolicy = Policy & Type.Static<typeof scriptPolicySchema>;

declare module "@udohjeremiah/moniq" {
  interface UserConfig {
    /**
     * Policy for validating the `scripts` field in a package's `package.json` file.
     *
     * Used by the `scripts` policy domain in `UserConfig`.
     *
     * Inherits the policy options from {@link Policy}.
     */
    scripts?: Record<string, ScriptPolicy | ScriptPolicy[]>;
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
    scripts?: Record<string, ScriptPolicy | ScriptPolicy[]>;
  }
}
