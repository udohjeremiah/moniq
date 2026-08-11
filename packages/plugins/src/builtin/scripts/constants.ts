import type { Policy } from "@moniq/config";
import type { Type } from "@moniq/config/plugins";

import type { scriptPolicySchema } from "./schema.js";

export interface ScriptDiagnosticFields {
  actual?: string;
  expected?: string;
  fix?: string;
  scriptName?: string;
}

/**
 * Policy for validating the `scripts` field in a package's `package.json` file.
 *
 * Used by the `scripts` policy domain in `UserConfig`.
 *
 * Inherits the policy options from {@link Policy}.
 */
export type ScriptPolicy = Policy & Type.Static<typeof scriptPolicySchema>;
