import { execFileSync } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";

import { readPackageJson } from "./package-json.js";

const WORKSPACE_MARKERS = [
  "package-lock.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
  "deno.lock",
  "deno.json",
  "deno.jsonc",
];

export interface Package {
  path: string;
}

export type PackageManager = "bun" | "deno" | "npm" | "pnpm" | "yarn";

export async function detectPackageManager(
  root: string,
): Promise<PackageManager> {
  // 1. Check lock files first (project-level signal)
  const lockFileMap: Record<string, PackageManager> = {
    "bun.lock": "bun",
    "bun.lockb": "bun",
    "deno.lock": "deno",
    "package-lock.json": "npm",
    "pnpm-lock.yaml": "pnpm",
    "yarn.lock": "yarn",
  };

  for (const [lockFile, pm] of Object.entries(lockFileMap)) {
    try {
      await access(path.join(root, lockFile));
      return pm;
    } catch {
      // try next
    }
  }

  // 2. Check for deno.json or deno.jsonc (Deno-native projects may not have a lock file)
  //    Deno projects frequently .gitignore deno.lock, so we check the config file too.
  for (const name of ["deno.json", "deno.jsonc"]) {
    try {
      await access(path.join(root, name));
      return "deno";
    } catch {
      // try next
    }
  }

  // 3. Check package.json's packageManager field
  try {
    const package_ = await readPackageJson(path.join(root, "package.json"));
    const rawPm = package_["packageManager"];
    const pm = typeof rawPm === "string" ? (rawPm.split("@", 2)[0] ?? "") : "";
    if (["bun", "deno", "npm", "pnpm", "yarn"].includes(pm)) {
      return pm as PackageManager;
    }
  } catch {
    // Ignore
  }

  // 4. Check npm_config_user_agent (runtime context, least reliable)
  const userAgent = process.env["npm_config_user_agent"] ?? "";
  if (userAgent.startsWith("npm")) return "npm";
  if (userAgent.startsWith("pnpm")) return "pnpm";
  if (userAgent.startsWith("yarn")) return "yarn";
  if (userAgent.startsWith("bun")) return "bun";

  // 5. No package manager detected
  throw new Error(
    "Could not detect package manager. " +
      "Ensure a lock file (package-lock.json, pnpm-lock.yaml, yarn.lock, bun.lock, or deno.lock) " +
      "or a config file (deno.json, deno.jsonc) exists in the project root.",
  );
}

export async function discoverWorkspace(root: string): Promise<Package[]> {
  const pm = await detectPackageManager(root);

  let output: string;

  switch (pm) {
    case "bun": {
      return resolveBunWorkspaces(root);
    }
    case "deno": {
      return resolveDenoWorkspaces(root);
    }
    case "npm": {
      output = execFileSync(
        pmBin("npm"),
        ["ls", "--workspaces", "--all", "--json", "--depth", "0"],
        { cwd: root, encoding: "utf8" },
      );
      const tree = JSON.parse(output) as {
        dependencies?: Record<string, { path: string }>;
      };
      return Object.values(tree.dependencies ?? {}).map((entry) => ({
        path: entry.path,
      }));
    }
    case "pnpm": {
      output = execFileSync(
        pmBin("pnpm"),
        ["ls", "-r", "--depth", "-1", "--json"],
        { cwd: root, encoding: "utf8" },
      );
      const packages = JSON.parse(output) as { path: string }[];
      return packages.map((entry) => ({ path: entry.path }));
    }
    case "yarn": {
      output = execFileSync(pmBin("yarn"), ["workspaces", "list", "--json"], {
        cwd: root,
        encoding: "utf8",
      });
      const lines = output.trim().split("\n").filter(Boolean);
      const packages = lines.map(
        (line) => JSON.parse(line) as { location: string },
      );
      return packages.map((entry) => ({
        path: path.resolve(root, entry.location),
      }));
    }
  }
}

export async function findWorkspaceRoot(cwd: string): Promise<string> {
  let directory = path.resolve(cwd);
  let isRootReached = false;

  while (!isRootReached) {
    for (const marker of WORKSPACE_MARKERS) {
      try {
        await access(path.join(directory, marker));
        return directory;
      } catch {
        // try next marker
      }
    }

    try {
      const package_ = await readPackageJson(
        path.join(directory, "package.json"),
      );
      if (package_["workspaces"] !== undefined) {
        return directory;
      }
    } catch {
      // no package.json — keep walking
    }

    const parent = path.dirname(directory);
    isRootReached = parent === directory;
    directory = parent;
  }

  throw new Error(
    "Could not find workspace root. " +
      "Ensure a lock file (package-lock.json, pnpm-lock.yaml, yarn.lock, bun.lock, or deno.lock) " +
      "or a workspace config file exists in the project root.",
  );
}

function getWorkspacePatterns(packageJson: Record<string, unknown>) {
  const raw = packageJson["workspaces"];
  if (Array.isArray(raw)) {
    return raw as string[];
  }
  if (
    typeof raw === "object" &&
    raw !== null &&
    "packages" in raw &&
    Array.isArray(raw.packages)
  ) {
    return raw.packages as string[];
  }
  return [];
}

function parseDenoJson(content: string) {
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    const stripped = content
      .replaceAll(/\/\/[^\n]*/g, "")
      .replaceAll(/,\s*([}\]])/g, "$1");
    return JSON.parse(stripped) as Record<string, unknown>;
  }
}

function parseDenoWorkspacePatterns(config: Record<string, unknown>) {
  const raw = config["workspace"];
  if (Array.isArray(raw)) {
    return raw.filter(
      (p): p is string => typeof p === "string" && !p.startsWith("!"),
    );
  }
  if (
    typeof raw === "object" &&
    raw !== null &&
    "members" in raw &&
    Array.isArray(raw.members)
  ) {
    return raw.members.filter(
      (p): p is string => typeof p === "string" && !p.startsWith("!"),
    );
  }
  return [];
}

function pmBin(pm: string) {
  return pm;
}

async function readDenoJson(root: string) {
  for (const name of ["deno.json", "deno.jsonc"]) {
    try {
      const { readFile } = await import("node:fs/promises");
      const content = await readFile(path.join(root, name), "utf8");
      return parseDenoJson(content);
    } catch {
      // try next
    }
  }

  // eslint-disable-next-line unicorn/no-useless-undefined
  return undefined;
}

async function resolveBunWorkspaces(root: string) {
  const rootPackageJson = await readPackageJson(
    path.join(root, "package.json"),
  );
  const patterns = getWorkspacePatterns(rootPackageJson);

  return resolveGlobPatterns(root, patterns);
}

async function resolveDenoWorkspaces(root: string) {
  const config = await readDenoJson(root);
  if (config === undefined) return [];

  const patterns = parseDenoWorkspacePatterns(config);
  return resolveGlobPatterns(root, patterns);
}

async function resolveGlobPatterns(root: string, patterns: string[]) {
  const { glob } = await import("node:fs/promises");
  const packagePaths: string[] = [];
  for (const pattern of patterns) {
    const iterable = glob(pattern, { cwd: root });
    for await (const entry of iterable) {
      const absolute = path.resolve(root, entry);
      if (!packagePaths.includes(absolute)) {
        packagePaths.push(absolute);
      }
    }
  }
  return packagePaths.map((p) => ({ path: p }));
}
