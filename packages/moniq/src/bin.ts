import { parse } from "shell-quote";

const WRAPPER_SEQUENCES = [
  ["pnpm", "exec"],
  ["pnpm", "dlx"],
  ["yarn", "dlx"],
];

const WRAPPER_SINGLE = new Set(["bunx", "node", "npx", "yarn"]);

export function bin(name: string) {
  return (command: string): boolean => {
    let tokens = parse(command).filter(
      (t): t is string => typeof t === "string",
    );

    while (tokens[0] === "cross-env" || /^[A-Z_]\w*=/i.test(tokens[0] ?? "")) {
      tokens = tokens.slice(1);
    }

    ({ remaining: tokens } = stripWrappers(tokens));

    let index = 0;

    while (tokens.slice(index, index + 1)[0]?.startsWith("-")) {
      index++;
    }

    const candidate = tokens.slice(index, index + 1)[0];
    return candidate !== undefined && toBinaryName(candidate) === name;
  };
}

function stripWrappers(tokens: string[]): { remaining: string[] } {
  let remaining = tokens;
  let isChanged = true;

  while (isChanged) {
    isChanged = false;

    const seq = WRAPPER_SEQUENCES.find((w) => {
      const slice = remaining.slice(0, w.length);
      return (
        slice.length === w.length &&
        slice.every((t, index_) => t === w.slice(index_, index_ + 1)[0])
      );
    });
    if (seq) {
      remaining = remaining.slice(seq.length);
      isChanged = true;
    } else if (WRAPPER_SINGLE.has(remaining[0] ?? "")) {
      remaining = remaining.slice(1);
      isChanged = true;
    }
  }

  return { remaining };
}

function toBinaryName(token: string): string {
  if (token.startsWith("@")) {
    const atIndexes = Array.from(token.matchAll(/@/g), (m) => m.index);

    if (atIndexes.length >= 2) {
      return token.slice(0, atIndexes[1] ?? token.length);
    }

    return token;
  }

  const basename = token.split("/").pop() ?? token;
  const atIndex = basename.lastIndexOf("@");

  if (atIndex > 0) {
    return basename.slice(0, atIndex);
  }

  return basename;
}
