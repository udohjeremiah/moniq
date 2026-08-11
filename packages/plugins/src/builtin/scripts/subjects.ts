import type { PluginPackage, PolicySubject } from "@moniq/config/plugins";

import { readPackageJson } from "@moniq/workspace";
import path from "node:path";

import type { ScriptPolicy } from "./constants.js";

export interface ScriptTarget {
  packageJson: Record<string, unknown>;
  relativePath: string;
  scriptName: string;
}

export async function scriptsSubjects(
  config: unknown,
  root: string,
  packages: PluginPackage[],
): Promise<PolicySubject[]> {
  const scriptsConfig = config as
    Record<string, ScriptPolicy | ScriptPolicy[]> | undefined;

  const subjects_: PolicySubject[] = [];

  if (scriptsConfig === undefined) {
    return subjects_;
  }

  const packageJsonByPath = new Map<string, Record<string, unknown>>();

  await Promise.all(
    packages.map(async (package_) => {
      const packageJson = await readPackageJson(
        path.join(package_.path, "package.json"),
      );
      packageJsonByPath.set(package_.path, packageJson);
    }),
  );

  for (const [scriptName, policyOrArray] of Object.entries(scriptsConfig)) {
    const policies = Array.isArray(policyOrArray)
      ? policyOrArray
      : [policyOrArray];

    for (const package_ of packages) {
      const relativePath = path.relative(root, package_.path);
      const packageJson = packageJsonByPath.get(package_.path) ?? {};

      subjects_.push({
        package: { path: package_.path },
        policies,
        relativePath,
        value: {
          packageJson,
          relativePath,
          scriptName,
        } satisfies ScriptTarget,
      });
    }
  }

  return subjects_;
}
