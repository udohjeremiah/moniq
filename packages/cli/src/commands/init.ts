import {
  discoverWorkspace,
  type PackageJson,
  readPackageJson,
} from "@moniq/workspace";
import path from "node:path";
import { stdin } from "node:process";
import { createInterface } from "node:readline/promises";
import { styleText } from "node:util";

import { renderBanner } from "../banner.js";
import { doctor } from "./doctor.js";

const SUPPORTED_LANGS = ["ts", "js", "mjs", "cjs", "mts", "cts"];

export interface InitOptions {
  _cwd?: string;
  lang?: string;
}

export async function detectLang(
  cwd: string,
  packageJson: PackageJson,
): Promise<string> {
  const rawDependencies = packageJson["dependencies"];
  const rawDevelopmentDependencies = packageJson["devDependencies"];

  const { access } = await import("node:fs/promises");
  try {
    await access(path.join(cwd, "tsconfig.json"));
    return "ts";
  } catch {
    // no tsconfig
  }

  if (
    typeof rawDependencies === "object" &&
    rawDependencies !== null &&
    Object.hasOwn(rawDependencies, "typescript")
  ) {
    return "ts";
  }

  if (
    typeof rawDevelopmentDependencies === "object" &&
    rawDevelopmentDependencies !== null &&
    Object.hasOwn(rawDevelopmentDependencies, "typescript")
  ) {
    return "ts";
  }

  return "js";
}

export function generateConfig(): string {
  return `import { defineConfig } from "@udohjeremiah/moniq";

export default defineConfig({
  scripts: {
    dev: { required: true },
    build: { required: true },
    lint: { required: true },
  },
});
`;
}

export async function init(options: InitOptions): Promise<void> {
  const { _cwd, lang: explicitLang } = options;

  const cwd = _cwd ?? process.cwd();

  const rootPackageJson = await readRootPackageJson(cwd);
  if (rootPackageJson === undefined) return;

  const lang = explicitLang ?? (await detectLang(cwd, rootPackageJson));

  if (!SUPPORTED_LANGS.includes(lang)) {
    const unsupportedMessage = `Unsupported --lang "${lang}". Supported: ${SUPPORTED_LANGS.join(", ")}`;
    console.error(`  ${styleText("yellow", unsupportedMessage)}`);
    process.exitCode = 1;
    return;
  }

  const filename = `moniq.config.${lang}`;
  const configPath = path.join(cwd, filename);

  console.log(renderBanner());
  console.log();

  // Detect workspace
  let packages: { path: string }[] = [];
  let workspaceLabel = "single package";
  try {
    packages = discoverWorkspace(cwd);
    if (packages.length > 1) {
      workspaceLabel = `monorepo with ${String(packages.length)} packages`;
    }
  } catch {
    workspaceLabel = "unknown (workspace detection failed)";
  }

  const detectedLabel = `🔍 Detected: ${styleText("cyan", workspaceLabel)}`;
  console.log(`  ${styleText("dim", detectedLabel)}`);

  if (packages.length > 1) {
    for (const package_ of packages) {
      const relativePath = path.relative(cwd, package_.path);
      const packageLine = `   • ${relativePath}`;
      console.log(`  ${styleText("dim", packageLine)}`);
    }
  }

  const langDisplay = langLabel(lang);
  const langLine = `🔍 Language: ${styleText("cyan", langDisplay)}`;
  console.log(`  ${styleText("dim", langLine)}`);

  console.log();

  // Check for existing config
  const canProceed = await handleExistingConfig(configPath, filename);
  if (!canProceed) return;

  // Generate and write config
  const { writeFile } = await import("node:fs/promises");
  const configContent = generateConfig();
  await writeFile(configPath, configContent, "utf8");

  const createdMessage = `✅ Created ${filename}`;
  console.log(`  ${styleText(["bold", "green"], createdMessage)}`);

  console.log();

  // Run doctor
  await doctor();

  console.log();
  console.log(`  ${styleText("dim", "Next steps:")}`);
  console.log(
    `   1. ${styleText("dim", "Edit")} ${styleText("cyan", "moniq.config")} ${styleText("dim", "to fine-tune your policies.")}`,
  );
  console.log(
    `   2. ${styleText("dim", "Run")} ${styleText("cyan", "moniq check")} ${styleText("dim", "to validate your workspace.")}`,
  );
  console.log(
    `   3. ${styleText("dim", "Run")} ${styleText("cyan", "moniq fix")} ${styleText("dim", "to apply automatic fixes.")}`,
  );
  console.log();
}

async function handleExistingConfig(
  configPath: string,
  filename: string,
): Promise<boolean> {
  const { access } = await import("node:fs/promises");
  try {
    await access(configPath);
  } catch {
    return true;
  }

  if (!stdin.isTTY) return true;

  const rl = createInterface({ input: stdin, output: process.stdout });
  const message = `${filename} already exists. Overwrite?`;
  const answer = await rl.question(
    `  ${styleText("dim", message + " (y/N) ")}`,
  );
  rl.close();

  if (answer.trim().length === 0) return false;
  return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
}

function langLabel(lang: string): string {
  switch (lang) {
    case "cjs": {
      return "JavaScript (CommonJS)";
    }
    case "cts": {
      return "TypeScript (CommonJS)";
    }
    case "js": {
      return "JavaScript";
    }
    case "mjs": {
      return "JavaScript (ESM)";
    }
    case "mts": {
      return "TypeScript (ESM)";
    }
    case "ts": {
      return "TypeScript";
    }
    default: {
      return lang;
    }
  }
}

async function readRootPackageJson(
  cwd: string,
): Promise<PackageJson | undefined> {
  try {
    return await readPackageJson(path.join(cwd, "package.json"));
  } catch {
    console.log();
    console.log(
      `  ${styleText("yellow", "⚠ No package.json found in current directory.")}`,
    );
    console.log(
      `  Create one first, then run ${styleText("cyan", "moniq init")} again.`,
    );
    console.log();
    process.exitCode = 1;
    return undefined;
  }
}
