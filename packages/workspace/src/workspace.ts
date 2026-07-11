import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

export interface Package {
  path: string;
}

type PackageManager = "npm" | "pnpm" | "yarn";

const npmCommand = getNpmCommand();
const pnpmCommand = getPnpmCommand();
const yarnCommand = getYarnCommand();

export function discoverWorkspace(root: string): Package[] {
  const pm = detectPackageManager(root);

  let output: string;

  switch (pm) {
    case "npm": {
      output = execFileSync(
        npmCommand,
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
        pnpmCommand,
        ["ls", "-r", "--depth", "-1", "--json"],
        { cwd: root, encoding: "utf8" },
      );
      const packages = JSON.parse(output) as { path: string }[];
      return packages.map((entry) => ({ path: entry.path }));
    }
    case "yarn": {
      output = execFileSync(yarnCommand, ["workspaces", "list", "--json"], {
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

function detectPackageManager(root: string): PackageManager {
  const userAgent = process.env["npm_config_user_agent"] ?? "";
  if (userAgent.startsWith("pnpm")) return "pnpm";
  if (userAgent.startsWith("yarn")) return "yarn";
  if (userAgent.startsWith("npm")) return "npm";

  const request = createRequire(import.meta.url);

  const lockFileMap: Record<string, PackageManager> = {
    "package-lock.json": "npm",
    "pnpm-lock.yaml": "pnpm",
    "yarn.lock": "yarn",
  };

  for (const [lockFile, pm] of Object.entries(lockFileMap)) {
    try {
      request.resolve(path.join(root, lockFile));
      return pm;
    } catch {
      // try next
    }
  }

  try {
    const package_ = request(path.join(root, "package.json")) as Record<
      string,
      unknown
    >;
    const rawPm = package_["packageManager"];
    const pm = typeof rawPm === "string" ? (rawPm.split("@", 2)[0] ?? "") : "";
    if (["npm", "pnpm", "yarn"].includes(pm)) {
      return pm as PackageManager;
    }
  } catch {
    // Ignore
  }

  return "pnpm";
}

function getNpmCommand(): string {
  return path.join(path.dirname(process.execPath), "npm");
}

function getPnpmCommand(): string {
  try {
    const request = createRequire(import.meta.url);
    const specifier = ["pnpm", "package.json"].join("/");
    const packagePath = request.resolve(specifier);
    return path.resolve(path.dirname(packagePath), "bin", "pnpm.cjs");
  } catch {
    return "pnpm";
  }
}

function getYarnCommand(): string {
  try {
    const request = createRequire(import.meta.url);
    const specifier = ["@yarnpkg", "cli", "package.json"].join("/");
    const packagePath = request.resolve(specifier);
    return path.resolve(path.dirname(packagePath), "sources", "bin", "yarn.js");
  } catch {
    try {
      const request = createRequire(import.meta.url);
      const specifier = ["yarn", "package.json"].join("/");
      const packagePath = request.resolve(specifier);
      return path.resolve(path.dirname(packagePath), "bin", "yarn.js");
    } catch {
      return "yarn";
    }
  }
}
