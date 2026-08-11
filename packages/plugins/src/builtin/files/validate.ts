import type {
  PluginPolicyDefinition,
  PluginReportInput,
} from "@moniq/config/plugins";

import type { FileKind, FilePolicy, FixAction } from "./constants.js";

import { filePolicySchema } from "./schema.js";
import { filesSubjects, type FileTarget } from "./subjects.js";

interface FixTarget {
  fix: string | undefined;
  fixAction: FixAction | undefined;
}

interface PathState {
  exists: boolean;
  isDirectory: boolean;
  isFile: boolean;
  isSymbolicLink: boolean;
}

const NO_FIX: FixTarget = { fix: undefined, fixAction: undefined };

export const filePolicy: PluginPolicyDefinition<typeof filePolicySchema> = {
  schema: filePolicySchema,
  subjects: filesSubjects,
  validate({ policy, report, subject }) {
    return resolvePolicy(policy, subject, report);
  },
};

async function contentDiagnostic(
  policy: FilePolicy,
  relativePath: string,
  absolutePath: string,
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
    expected: isExactContent ? content : undefined,
    file: relativePath,
    fix: fixTarget.fix,
    fixAction: fixTarget.fixAction,
    message: `Unexpected contents for "${relativePath}"`,
    ruleId: "files/content-mismatch",
    ruleName: "Unexpected contents",
  };
}

function createFix(policy: FilePolicy, expectedKind: FileKind | undefined) {
  const canAutofix =
    policy.autofix &&
    expectedKind !== undefined &&
    expectedKind !== "symlink" &&
    (policy.content === undefined || typeof policy.content === "string");

  if (!canAutofix) {
    return NO_FIX;
  }

  if (expectedKind === "directory") {
    return { fix: undefined, fixAction: "mkdir" } satisfies FixTarget;
  }

  return {
    fix: typeof policy.content === "string" ? policy.content : "",
    fixAction: "create",
  } satisfies FixTarget;
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

async function inspectPath(absolutePath: string) {
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
) {
  return {
    file: relativePath,
    message: `Expected ${describeExpectedKindPhrase(expectedKind)} but found ${describeKind(state)} at "${relativePath}"`,
    ruleId: "files/kind",
    ruleName: "Unexpected kind",
  };
}

function missingDiagnostic(policy: FilePolicy, relativePath: string) {
  const expectedKind = policy.kind;
  const fixTarget = createFix(policy, expectedKind);
  const expected = describeExpectedKind(expectedKind);

  return {
    file: relativePath,
    fix: fixTarget.fix,
    fixAction: fixTarget.fixAction,
    message: `Missing required ${expected} "${relativePath}"`,
    ruleId: "files/missing",
    ruleName: `Missing required ${expected}`,
  };
}

async function resolvePolicy(
  policy: FilePolicy,
  subject: unknown,
  report: (input: PluginReportInput) => void,
) {
  const { absolutePath, relativePath } = subject as FileTarget;
  const presence = policy.presence ?? "required";

  const state = await inspectPath(absolutePath);

  if (presence === "required" && !state.exists) {
    report(missingDiagnostic(policy, relativePath));
    return;
  }

  if (presence === "forbidden" && state.exists) {
    report(unexpectedDiagnostic(policy, state, relativePath));
    return;
  }

  if (
    state.exists &&
    policy.kind !== undefined &&
    !isKindMatch(policy.kind, state)
  ) {
    report(kindDiagnostic(policy.kind, state, relativePath));
    return;
  }

  if (policy.content === undefined || !state.exists || !state.isFile) {
    return;
  }

  const diagnostic = await contentDiagnostic(
    policy,
    relativePath,
    absolutePath,
  );

  if (diagnostic !== undefined) {
    report(diagnostic);
  }
}

function unexpectedDiagnostic(
  policy: FilePolicy,
  state: PathState,
  relativePath: string,
) {
  return {
    file: relativePath,
    fixAction: policy.autofix ? "delete" : undefined,
    message: unexpectedMessage(state, relativePath),
    ruleId: "files/unexpected",
    ruleName: unexpectedRuleName(state),
  } satisfies PluginReportInput;
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

function writeFix(policy: FilePolicy, content: string) {
  if (!policy.autofix) {
    return NO_FIX;
  }
  return { fix: content, fixAction: "write" } satisfies FixTarget;
}
