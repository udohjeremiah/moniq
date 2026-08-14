import type { PluginPolicyDefinition } from "@moniq/core";

import { getScript, isMatchAny } from "@moniq/core";

import { scriptPolicySchema } from "./schema.js";
import { scriptsSubjects, type ScriptTarget } from "./subjects.js";

export const scriptPolicy: PluginPolicyDefinition<typeof scriptPolicySchema> = {
  schema: scriptPolicySchema,
  subjects: scriptsSubjects,

  validate({ policy, report, subject }) {
    const { packageJson, relativePath, scriptName } = subject as ScriptTarget;
    const hasScript = getScript(packageJson, scriptName) !== undefined;
    const presence = policy.presence ?? "required";

    if (presence === "required" && !hasScript) {
      report({
        fix:
          policy.autofix && typeof policy.command === "string"
            ? policy.command
            : undefined,
        message: `Missing required script "${scriptName}"`,
        ruleId: "scripts/missing",
        ruleName: "Missing required script",
        scriptName,
      });
      return;
    }

    if (presence === "forbidden" && hasScript) {
      report({
        message: `Unexpected script "${scriptName}"`,
        ruleId: "scripts/unexpected",
        ruleName: "Unexpected script",
        scriptName,
      });
      return;
    }

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

    report({
      actual: actualCommand,
      expected: typeof policy.command === "string" ? policy.command : undefined,
      fix:
        policy.autofix && typeof policy.command === "string"
          ? policy.command
          : undefined,
      message: `Unexpected command for script "${scriptName}"`,
      ruleId: "scripts/command-mismatch",
      ruleName: "Unexpected command",
      scriptName,
    });
  },
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
