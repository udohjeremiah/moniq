import type { PluginPackage, PluginValidator } from "@moniq/core";

import {
  getScript,
  isMatchAny,
  readPackageJson,
  setScript,
  writePackageJson,
} from "@moniq/core";
import path from "node:path";

import type { ScriptPolicy } from "./constants.js";
import type { ScriptTarget } from "./subjects.js";

export const scriptValidator: PluginValidator<ScriptPolicy> = ({
  package: package_,
  policy,
  report,
  subject,
}) => {
  const { packageJson, relativePath, scriptName } = subject as ScriptTarget;
  const hasScript = getScript(packageJson, scriptName) !== undefined;
  const presence = policy.presence ?? "required";
  const command = policy.command;

  if (presence === "required" && !hasScript) {
    report({
      fix:
        typeof command === "string"
          ? scriptFix(package_, scriptName, command)
          : undefined,
      message: `Missing required script "${scriptName}"`,
      ruleId: "scripts/missing",
      ruleName: "Missing required script",
    });
    return;
  }

  if (presence === "forbidden" && hasScript) {
    report({
      message: `Unexpected script "${scriptName}"`,
      ruleId: "scripts/unexpected",
      ruleName: "Unexpected script",
    });
    return;
  }

  if (command === undefined || !hasScript) {
    return;
  }

  if (
    policy.allowCustomCommands !== undefined &&
    isMatchAny(policy.allowCustomCommands, relativePath)
  ) {
    return;
  }

  const actualCommand = getScript(packageJson, scriptName);

  if (actualCommand !== undefined && isCommandMatch(actualCommand, command)) {
    return;
  }

  report({
    fix:
      typeof command === "string"
        ? scriptFix(package_, scriptName, command)
        : undefined,
    message: `Unexpected command for script "${scriptName}"`,
    metadata: {
      actual: actualCommand,
      expected: typeof command === "string" ? command : undefined,
    },
    ruleId: "scripts/command-mismatch",
    ruleName: "Unexpected command",
  });
};

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

function scriptFix(
  package_: PluginPackage,
  scriptName: string,
  command: string,
) {
  return async () => {
    const packageJsonPath = path.join(package_.path, "package.json");
    const freshPackageJson = await readPackageJson(packageJsonPath);
    setScript(freshPackageJson, scriptName, command);
    await writePackageJson(packageJsonPath, freshPackageJson);
  };
}
