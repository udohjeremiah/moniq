import type { FileKind, FilePolicy } from "@moniq/config";

import { type Package, readPackageJson } from "@moniq/workspace";
import path from "node:path";

import type { Diagnostic } from "./index.js";

import { pickPolicy } from "./matching.js";

interface FixTarget {
  fix: string | undefined;
  fixAction: "create" | "delete" | "mkdir" | "write" | undefined;
}

interface PackageContext {
  packageName: string;
  packagePath: string;
}

interface PathState {
  exists: boolean;
  isDirectory: boolean;
  isFile: boolean;
  isSymbolicLink: boolean;
}

export async function resolveFilePolicies(
  filesConfig: Record<string, FilePolicy | FilePolicy[]> | undefined,
  root: string,
  packages_: Package[],
) {
  const diagnostics: Diagnostic[] = [];
  const entries = Object.entries(filesConfig ?? {});

  for (const [relativePath, policyOrArray] of entries) {
    const policies = Array.isArray(policyOrArray)
      ? policyOrArray
      : [policyOrArray];

    const policy = pickPolicy(policies, relativePath);

    if (policy === undefined || policy.severity === "off") {
      continue;
    }

    const absolutePath = resolveWithinRoot(root, relativePath);
    const context = await getPackageContext(packages_, root, absolutePath);

    await resolvePolicy(
      policy,
      relativePath,
      absolutePath,
      context,
      diagnostics,
    );
  }

  return diagnostics;
}

async function contentDiagnostic(
  policy: FilePolicy,
  relativePath: string,
  absolutePath: string,
  context: PackageContext,
  severity: Diagnostic["severity"],
) {
  const content = policy.content;

  if (content === undefined) {
    return;
  }

  const { readFile } = await import("node:fs/promises");
  const actual = await readFile(absolutePath, "utf8");
  const isExactContent = typeof content === "string";
  const isExpectedContent = isExactContent
    ? actual === content
    : content.test(actual);

  if (isExpectedContent) {
    return;
  }

  const fixTarget = isExactContent ? writeFix(policy, content) : NO_FIX;

  return {
    actual,
    domain: "files",
    expected: isExactContent ? content : undefined,
    file: relativePath,
    fix: fixTarget.fix,
    fixAction: fixTarget.fixAction,
    message: `Unexpected contents for "${relativePath}"`,
    packageName: context.packageName,
    packagePath: context.packagePath,
    ruleId: "files/content-mismatch",
    ruleName: "Unexpected contents",
    severity,
  };
}

const NO_FIX: FixTarget = { fix: undefined, fixAction: undefined };

function createFix(
  policy: FilePolicy,
  expectedKind: FileKind | undefined,
): FixTarget {
  const canAutofix =
    policy.autofix &&
    expectedKind !== undefined &&
    expectedKind !== "symlink" &&
    (policy.content === undefined || typeof policy.content === "string");

  if (!canAutofix) {
    return NO_FIX;
  }

  if (expectedKind === "directory") {
    return { fix: undefined, fixAction: "mkdir" };
  }

  return {
    fix: typeof policy.content === "string" ? policy.content : "",
    fixAction: "create",
  };
}

function describeExpectedKind(expectedKind: FileKind | undefined) {
  if (expectedKind === "directory") {
    return "directory";
  }
  if (expectedKind === "symlink") {
    return "symlink";
  }
  if (expectedKind === "file") {
    return "file";
  }
  return "path";
}

function describeExpectedKindPhrase(expectedKind: string) {
  if (expectedKind === "directory") {
    return "a directory";
  }
  if (expectedKind === "symlink") {
    return "a symbolic link";
  }
  return "a file";
}

function describeKind(state: PathState) {
  if (state.isDirectory) {
    return "a directory";
  }
  if (state.isFile) {
    return "a file";
  }
  return "a symbolic link";
}

async function getPackageContext(
  packages_: Package[],
  root: string,
  absolutePath: string,
) {
  let best: Package | undefined;
  let bestLength = -1;

  for (const package_ of packages_) {
    const packagePath = path.resolve(package_.path);
    const isContains =
      absolutePath === packagePath ||
      absolutePath.startsWith(`${packagePath}${path.sep}`);

    if (isContains && packagePath.length > bestLength) {
      best = package_;
      bestLength = packagePath.length;
    }
  }

  const packagePath = best?.path ?? root;

  return {
    packageName: await getPackageName(packagePath),
    packagePath,
  };
}

async function getPackageName(packagePath: string) {
  try {
    const packageJson = await readPackageJson(
      path.join(packagePath, "package.json"),
    );
    const name = packageJson["name"];
    return typeof name === "string" ? name : path.basename(packagePath);
  } catch {
    return path.basename(packagePath);
  }
}

async function inspectPath(absolutePath: string): Promise<PathState> {
  try {
    const { lstat } = await import("node:fs/promises");
    const stats = await lstat(absolutePath);
    return {
      exists: true,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      isSymbolicLink: stats.isSymbolicLink(),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        exists: false,
        isDirectory: false,
        isFile: false,
        isSymbolicLink: false,
      };
    }
    throw error;
  }
}

function isKindMatch(expectedKind: string, state: PathState) {
  if (expectedKind === "directory") {
    return state.isDirectory;
  }
  if (expectedKind === "symlink") {
    return state.isSymbolicLink;
  }
  return state.isFile;
}

function kindDiagnostic(
  expectedKind: string,
  state: PathState,
  relativePath: string,
  context: PackageContext,
  severity: Diagnostic["severity"],
) {
  return {
    domain: "files",
    file: relativePath,
    message: `Expected ${describeExpectedKindPhrase(expectedKind)} but found ${describeKind(state)} at "${relativePath}"`,
    packageName: context.packageName,
    packagePath: context.packagePath,
    ruleId: "files/kind",
    ruleName: "Unexpected kind",
    severity,
  };
}

function missingDiagnostic(
  policy: FilePolicy,
  expectedKind: FileKind | undefined,
  relativePath: string,
  context: PackageContext,
  severity: Diagnostic["severity"],
) {
  const fixTarget = createFix(policy, expectedKind);
  const expected = describeExpectedKind(expectedKind);
  const message = `Missing required ${expected} "${relativePath}"`;

  return {
    domain: "files",
    file: relativePath,
    fix: fixTarget.fix,
    fixAction: fixTarget.fixAction,
    message,
    packageName: context.packageName,
    packagePath: context.packagePath,
    ruleId: "files/missing",
    ruleName: `Missing required ${expected}`,
    severity,
  };
}

async function resolvePolicy(
  policy: FilePolicy,
  relativePath: string,
  absolutePath: string,
  context: PackageContext,
  diagnostics: Diagnostic[],
) {
  const presence = policy.presence ?? "required";
  const severity = policy.severity ?? "error";
  const expectedKind = policy.kind;

  const state = await inspectPath(absolutePath);

  if (presence === "required" && !state.exists) {
    diagnostics.push(
      missingDiagnostic(policy, expectedKind, relativePath, context, severity),
    );
    return;
  }

  if (presence === "forbidden" && state.exists) {
    diagnostics.push(
      unexpectedDiagnostic(policy, state, relativePath, context, severity),
    );
    return;
  }

  if (
    state.exists &&
    policy.kind !== undefined &&
    !isKindMatch(policy.kind, state)
  ) {
    diagnostics.push(
      kindDiagnostic(policy.kind, state, relativePath, context, severity),
    );
    return;
  }

  if (policy.content === undefined || !state.exists || !state.isFile) {
    return;
  }

  const diagnostic = await contentDiagnostic(
    policy,
    relativePath,
    absolutePath,
    context,
    severity,
  );

  if (diagnostic !== undefined) {
    diagnostics.push(diagnostic);
  }
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

function unexpectedDiagnostic(
  policy: FilePolicy,
  state: PathState,
  relativePath: string,
  context: PackageContext,
  severity: Diagnostic["severity"],
) {
  return {
    domain: "files",
    file: relativePath,
    fixAction: policy.autofix ? ("delete" as const) : undefined,
    message: unexpectedMessage(state, relativePath),
    packageName: context.packageName,
    packagePath: context.packagePath,
    ruleId: "files/unexpected",
    ruleName: unexpectedRuleName(state),
    severity,
  };
}

function unexpectedMessage(state: PathState, relativePath: string) {
  if (state.isDirectory) {
    return `Unexpected directory "${relativePath}"`;
  }
  if (state.isSymbolicLink) {
    return `Unexpected symbolic link "${relativePath}"`;
  }
  return `Unexpected file "${relativePath}"`;
}

function unexpectedRuleName(state: PathState) {
  if (state.isDirectory) {
    return "Unexpected directory";
  }
  if (state.isSymbolicLink) {
    return "Unexpected symbolic link";
  }
  return "Unexpected file";
}

function writeFix(policy: FilePolicy, content: string): FixTarget {
  if (!policy.autofix) {
    return NO_FIX;
  }
  return { fix: content, fixAction: "write" };
}
