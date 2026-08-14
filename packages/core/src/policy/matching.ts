import wcmatch from "wildcard-match";

import type { Policy } from "./policy.js";

const matcherCache = new Map<string, (value: string) => boolean>();

export function isMatchAny(patterns: string[], relativePath: string) {
  return patterns.some((pattern) => isGlobMatch(pattern, relativePath));
}

export function pickPolicy<T extends Policy>(
  policies: T[],
  relativePath: string,
) {
  return policies.find((policy) => isPolicyMatch(policy, relativePath));
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

  let matcher = matcherCache.get(pattern);
  if (matcher === undefined) {
    matcher = wcmatch(pattern);
    matcherCache.set(pattern, matcher);
  }

  return matcher(relativePath);
}

function isPolicyMatch(policy: Policy, relativePath: string) {
  const include = policy.include ?? ["*"];
  const exclude = policy.exclude ?? [];

  return (
    isMatchAny(include, relativePath) && !isMatchAny(exclude, relativePath)
  );
}
