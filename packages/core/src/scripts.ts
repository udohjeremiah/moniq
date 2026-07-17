import { type ScriptPolicy } from "@moniq/config";
import { getScript, type Package, readPackageJson } from "@moniq/workspace";
import path from "node:path";
import wcmatch from "wildcard-match";

import { type Diagnostic } from "./index.js";

export async function resolveScriptPolicies(
  scriptsConfig: Record<string, ScriptPolicy | ScriptPolicy[]> | undefined,
  root: string,
  packages_: Package[],
) {
  const diagnostics: Diagnostic[] = [];
  const entries = Object.entries(scriptsConfig ?? {});

  for (const [scriptName, policyOrArray] of entries) {
    const policies = Array.isArray(policyOrArray)
      ? policyOrArray
      : [policyOrArray];

    for (const package_ of packages_) {
      const relativePath = path.relative(root, package_.path);
      const policy = pickPolicy(policies, relativePath);

      if (policy !== undefined && policy.severity !== "off") {
        await resolvePolicy(
          policy,
          scriptName,
          package_,
          relativePath,
          diagnostics,
        );
      }
    }
  }

  return diagnostics;
}

function isCommandMatch(
  actual: string,
  expected: ((command: string) => boolean) | RegExp | string,
) {
  if (typeof expected === "function") {
    return expected(actual);
  }
  if (expected instanceof RegExp) {
    return expected.test(actual);
  }
  return actual === expected;
}

function isGlobMatch(pattern: string, relativePath: string) {
  if (pattern === "*") {
    return true;
  }

  if (pattern === ".") {
    return relativePath === "." || relativePath === "";
  }

  return wcmatch(pattern)(relativePath);
}

function isMatchAny(patterns: string[], relativePath: string) {
  for (const pattern of patterns) {
    if (isGlobMatch(pattern, relativePath)) {
      return true;
    }
  }
  return false;
}

function isPolicyMatch(policy: ScriptPolicy, relativePath: string) {
  const include = policy.include ?? ["*"];
  const exclude = policy.exclude ?? [];

  return (
    isMatchAny(include, relativePath) && !isMatchAny(exclude, relativePath)
  );
}

function pickPolicy(policies: ScriptPolicy[], relativePath: string) {
  for (const policy of policies) {
    if (isPolicyMatch(policy, relativePath)) {
      return policy;
    }
  }

  // eslint-disable-next-line unicorn/no-useless-undefined
  return undefined;
}

async function resolvePolicy(
  policy: ScriptPolicy,
  scriptName: string,
  package_: Package,
  relativePath: string,
  diagnostics: Diagnostic[],
) {
  const packageJson = await readPackageJson(
    path.join(package_.path, "package.json"),
  );
  const packageDisplayName =
    (packageJson["name"] as string | undefined) ?? path.basename(package_.path);
  const hasScript = getScript(packageJson, scriptName) !== undefined;
  const severity = policy.severity ?? "error";

  // required
  if (policy.required !== false && !hasScript) {
    diagnostics.push({
      domain: "scripts",
      fix:
        policy.autofix && typeof policy.command === "string"
          ? policy.command
          : undefined,
      message: `Missing required script "${scriptName}"`,
      packageName: packageDisplayName,
      packagePath: package_.path,
      ruleId: "scripts/missing",
      ruleName: "Missing required script",
      scriptName,
      severity,
    });
    return;
  }

  // command
  if (policy.command === undefined || !hasScript) {
    return;
  }

  if (
    policy.allowCustomCommands !== undefined &&
    isMatchAny(policy.allowCustomCommands, relativePath)
  ) {
    return;
  }

  const actualCommand = getScript(packageJson, scriptName);

  if (
    actualCommand !== undefined &&
    isCommandMatch(actualCommand, policy.command)
  ) {
    return;
  }

  diagnostics.push({
    actual: actualCommand,
    domain: "scripts",
    expected: typeof policy.command === "string" ? policy.command : undefined,
    fix:
      policy.autofix && typeof policy.command === "string"
        ? policy.command
        : undefined,
    message: `Unexpected command for script "${scriptName}"`,
    packageName: packageDisplayName,
    packagePath: package_.path,
    ruleId: "scripts/command-mismatch",
    ruleName: "Unexpected command",
    scriptName,
    severity,
  });
}
