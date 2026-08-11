import { parse } from "shell-quote";

const WRAPPER_SEQUENCES = [
  ["pnpm", "exec"],
  ["pnpm", "dlx"],
  ["yarn", "dlx"],
];

const WRAPPER_SINGLE = new Set(["bunx", "node", "npx", "yarn"]);

export function bin(name: string) {
  return (command: string) => {
    const tokens = parse(command).filter((t) => typeof t === "string");
    let start = 0;

    while (
      tokens.at(start) === "cross-env" ||
      /^[A-Z_]\w*=/i.test(tokens.at(start) ?? "")
    ) {
      start++;
    }

    start = stripWrappers(tokens, start);

    while (tokens.at(start)?.startsWith("-")) {
      start++;
    }

    const candidate = tokens.at(start);
    return candidate !== undefined && toBinaryName(candidate) === name;
  };
}

function stripWrappers(tokens: string[], start: number) {
  let isChanged = true;

  while (isChanged) {
    isChanged = false;

    const seq = WRAPPER_SEQUENCES.find((w) =>
      w.every((t, index) => tokens.at(start + index) === t),
    );
    if (seq) {
      start += seq.length;
      isChanged = true;
    } else if (WRAPPER_SINGLE.has(tokens.at(start) ?? "")) {
      start += 1;
      isChanged = true;
    }
  }

  return start;
}

function toBinaryName(token: string) {
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
