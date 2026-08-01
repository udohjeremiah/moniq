import type { UserConfig } from "@moniq/config";
import type { Package } from "@moniq/workspace";

import type { Diagnostic } from "./index.js";

import { resolveFilePolicies } from "./files.js";
import { resolveScriptPolicies } from "./scripts.js";

export interface PolicyDomainResolver {
  domain: string;
  resolve(
    config: UserConfig,
    root: string,
    packages: Package[],
  ): Promise<Diagnostic[]>;
}

export const policyDomains: PolicyDomainResolver[] = [
  {
    domain: "files",
    resolve: (config, root, packages) =>
      resolveFilePolicies(config.files, root, packages),
  },
  {
    domain: "scripts",
    resolve: (config, root, packages) =>
      resolveScriptPolicies(config.scripts, root, packages),
  },
];
