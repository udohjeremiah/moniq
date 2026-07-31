import type { BasePolicy } from "@moniq/config";

import wcmatch from "wildcard-match";

export function isMatchAny(patterns: string[], relativePath: string) {
  for (const pattern of patterns) {
    if (isGlobMatch(pattern, relativePath)) {
      return true;
    }
  }
  return false;
}

export function pickPolicy<T extends BasePolicy>(
  policies: T[],
  relativePath: string,
) {
  for (const policy of policies) {
    if (isPolicyMatch(policy, relativePath)) {
      return policy;
    }
  }

  // eslint-disable-next-line unicorn/no-useless-undefined
  return undefined;
}

function isGlobMatch(pattern: string, relativePath: string) {
  if (pattern === ".") {
    return relativePath === "." || relativePath === "";
  }

  if (pattern === "*") {
    return true;
  }

  if (pattern === "**") {
    return relativePath !== "." && relativePath !== "";
  }

  return wcmatch(pattern)(relativePath);
}

function isPolicyMatch(policy: BasePolicy, relativePath: string) {
  const include = policy.include ?? ["*"];
  const exclude = policy.exclude ?? [];

  return (
    isMatchAny(include, relativePath) && !isMatchAny(exclude, relativePath)
  );
}
