import { execFileSync } from "node:child_process";
import path from "node:path";

import { readPackageJson } from "./package-json.js";

export interface Package {
  path: string;
}

type PackageManager = "npm" | "pnpm" | "yarn";

export async function detectPackageManager(
  root: string,
): Promise<PackageManager> {
  // 1. Check lock files first (project-level signal)
  const lockFileMap: Record<string, PackageManager> = {
    "package-lock.json": "npm",
    "pnpm-lock.yaml": "pnpm",
    "yarn.lock": "yarn",
  };

  for (const [lockFile, pm] of Object.entries(lockFileMap)) {
    try {
      const { access } = await import("node:fs/promises");
      await access(path.join(root, lockFile));
      return pm;
    } catch {
      // try next
    }
  }

  // 2. Check package.json's packageManager field
  try {
    const package_ = await readPackageJson(path.join(root, "package.json"));
    const rawPm = package_["packageManager"];
    const pm = typeof rawPm === "string" ? (rawPm.split("@", 2)[0] ?? "") : "";
    if (["npm", "pnpm", "yarn"].includes(pm)) {
      return pm as PackageManager;
    }
  } catch {
    // Ignore
  }

  // 3. Check npm_config_user_agent (runtime context, least reliable)
  const userAgent = process.env["npm_config_user_agent"] ?? "";
  if (userAgent.startsWith("pnpm")) return "pnpm";
  if (userAgent.startsWith("yarn")) return "yarn";
  if (userAgent.startsWith("npm")) return "npm";

  // 4. Default
  return "pnpm";
}

export async function discoverWorkspace(root: string): Promise<Package[]> {
  const pm = await detectPackageManager(root);

  let output: string;

  switch (pm) {
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

function pmBin(pm: string): string {
  return pm;
}
