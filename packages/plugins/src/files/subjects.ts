import type { PluginPackage, PolicySubject } from "@moniq/core";

import path from "node:path";

import type { FilePolicy } from "./constants.js";

export interface FileTarget {
  absolutePath: string;
  relativePath: string;
}

export function filesSubjects(
  config: unknown,
  root: string,
  packages: PluginPackage[],
): PolicySubject[] {
  const configValue = config as
    Record<string, FilePolicy | FilePolicy[]> | undefined;

  const subjects_: PolicySubject[] = [];

  if (configValue === undefined) {
    return subjects_;
  }

  for (const [relativePath, policyOrArray] of Object.entries(configValue)) {
    resolveWithinRoot(root, relativePath);

    const policies = Array.isArray(policyOrArray)
      ? policyOrArray
      : [policyOrArray];

    for (const package_ of packages) {
      const packageRelativePath = path.relative(root, package_.path);

      subjects_.push({
        package: { path: package_.path },
        policies,
        relativePath: packageRelativePath,
        value: {
          absolutePath: path.join(package_.path, relativePath),
          relativePath: path
            .join(packageRelativePath, relativePath)
            .replaceAll(path.sep, "/"),
        } satisfies FileTarget,
      });
    }
  }

  return subjects_;
}

function resolveWithinRoot(root: string, relativePath: string) {
  const absolutePath = path.resolve(root, relativePath);
  const relative = path.relative(root, absolutePath);

  if (
    path.isAbsolute(relative) ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`)
  ) {
    throw new TypeError(
      `Invalid files path "${relativePath}": must be within the workspace root`,
    );
  }
}
