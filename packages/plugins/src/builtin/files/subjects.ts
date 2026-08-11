import type { PluginPackage, PolicySubject } from "@moniq/config/plugins";

import path from "node:path";

import type { FilePolicy } from "./constants.js";

export interface FileTarget {
  absolutePath: string;
  relativePath: string;
}

export function filesSubjects(
  config: unknown,
  root: string,
  packages_: PluginPackage[],
): PolicySubject[] {
  const configValue = config as
    Record<string, FilePolicy | FilePolicy[]> | undefined;

  const subjects_: PolicySubject[] = [];

  if (configValue === undefined) {
    return subjects_;
  }

  const resolvedPackages = packages_.map((package_) => ({
    package: package_,
    path: path.resolve(package_.path),
  }));

  for (const [relativePath, policyOrArray] of Object.entries(configValue)) {
    const absolutePath = resolveWithinRoot(root, relativePath);
    const subjectPackage = findContainingPackage(
      resolvedPackages,
      root,
      absolutePath,
    );

    subjects_.push({
      package: { path: subjectPackage },
      policies: Array.isArray(policyOrArray) ? policyOrArray : [policyOrArray],
      relativePath,
      value: { absolutePath, relativePath } satisfies FileTarget,
    });
  }

  return subjects_;
}

function findContainingPackage(
  resolvedPackages: { package: PluginPackage; path: string }[],
  root: string,
  absolutePath: string,
) {
  let best: PluginPackage | undefined;
  let bestLength = -1;

  for (const { package: package_, path: packagePath } of resolvedPackages) {
    const isContains =
      absolutePath === packagePath ||
      absolutePath.startsWith(`${packagePath}${path.sep}`);

    if (isContains && packagePath.length > bestLength) {
      best = package_;
      bestLength = packagePath.length;
    }
  }

  return best?.path ?? root;
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

  return absolutePath;
}
