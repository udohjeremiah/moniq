import {
  detectPackageManager,
  discoverWorkspace,
  type PackageJson,
  type PackageManager,
  readPackageJson,
} from "@moniq/workspace";
import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { stdin } from "node:process";
import { createInterface } from "node:readline/promises";
import { styleText } from "node:util";

import { renderBanner } from "../banner.js";

const SUPPORTED_LANGS = ["ts", "js", "mjs", "cjs", "mts", "cts"];

const DIVIDER_WIDTH = 44;

const dim = (s: string) => styleText("dim", s);
const cyan = (s: string) => styleText("cyan", s);

function labelPad(label: string) {
  return label.padEnd(18);
}

const STARTER_CONFIG = `import { defineConfig } from "@udohjeremiah/moniq";

export default defineConfig({
  scripts: {
    dev: { required: true },
    build: { required: true },
    lint: { required: true },
  },
});
`;

export interface InitOptions {
  _cwd?: string;
  lang?: string;
  version?: string;
}

export async function detectLang(
  cwd: string,
  packageJson: PackageJson,
  pm?: PackageManager,
) {
  // Deno handles TypeScript natively — default to .mts for Node+strip-types compat
  if (pm === "deno") return "mts";

  const isModule = packageJson["type"] === "module";

  try {
    await access(path.join(cwd, "tsconfig.json"));
    return isModule ? "ts" : "mts";
  } catch {
    // no tsconfig
  }

  if (hasTypescript(packageJson)) {
    return isModule ? "ts" : "mts";
  }

  return isModule ? "js" : "mjs";
}
export function generateConfig() {
  return STARTER_CONFIG;
}

export async function init(options: InitOptions): Promise<void> {
  const { _cwd, lang: explicitLang } = options;

  const cwd = _cwd ?? process.cwd();

  console.log(renderBanner());

  const pmResult = await detectPmAndPackageJson(cwd);
  if (!pmResult) return;
  const { pm, rootPackageJson } = pmResult;

  const lang = explicitLang ?? (await detectLang(cwd, rootPackageJson, pm));

  if (!SUPPORTED_LANGS.includes(lang)) {
    const unsupportedMessage = `Unsupported --lang "${lang}". Supported: ${SUPPORTED_LANGS.join(", ")}`;
    console.error(`  ${styleText("yellow", unsupportedMessage)}`);
    process.exitCode = 1;
    return;
  }

  const filename = `moniq.config.${lang}`;
  const configPath = path.join(cwd, filename);

  // Check for existing config with overwrite prompt
  const canProceed = await handleExistingConfig(configPath, filename);
  if (!canProceed) return;

  // Detect workspace
  let workspaceLabel = "single package";
  let workspacePackages: { path: string }[] = [];
  try {
    const packages = await discoverWorkspace(cwd);
    workspacePackages = packages;
    if (workspacePackages.length > 1) {
      workspaceLabel = `monorepo with ${String(workspacePackages.length)} packages`;
    }
  } catch {
    workspaceLabel = "unknown (workspace detection failed)";
  }

  printDetectedInfo(cwd, pm, lang, workspaceLabel, workspacePackages);
  console.log();

  if (!_cwd) {
    const isInstalled = await handleInstall(pm, cwd, options.version);
    if (!isInstalled) return;
  }

  const { writeFile } = await import("node:fs/promises");
  await writeFile(configPath, STARTER_CONFIG, "utf8");
  printCompletion(filename);
}

async function detectPmAndPackageJson(cwd: string) {
  let pm: PackageManager;
  try {
    pm = await detectPackageManager(cwd);
  } catch {
    pm = "npm";
  }

  try {
    const rootPackageJson = await readPackageJson(
      path.join(cwd, "package.json"),
    );
    return { pm, rootPackageJson };
  } catch {
    if (pm === "deno") {
      const rootPackageJson: PackageJson = {};
      return { pm, rootPackageJson };
    }

    console.log();
    console.log(
      `  ${styleText("yellow", "⚠ No package.json found in current directory.")}`,
    );
    console.log(
      `  Create one first, then run ${styleText("cyan", "moniq init")} again.`,
    );
    console.log();
    process.exitCode = 1;
    return;
  }
}

async function handleExistingConfig(configPath: string, filename: string) {
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

async function handleInstall(pm: string, root: string, version?: string) {
  const stopSpinner = startSpinner(
    `Installing ${styleText("cyan", "@udohjeremiah/moniq")} as devDependency...`,
  );
  try {
    await installPackage(pm, root, version);
    stopSpinner();
    console.log(
      `  ${styleText(["bold", "green"], "✔ Installed @udohjeremiah/moniq as devDependency")}`,
    );
    return true;
  } catch (error) {
    stopSpinner();
    const errorMessage = `✘ Installation failed: ${String(error)}`;
    console.log(`  ${styleText("red", errorMessage)}`);
    console.log(
      `  ${styleText("dim", "Make sure you have a working internet connection and try again.")}`,
    );
    console.log();
    process.exitCode = 1;
    return false;
  }
}

function hasTypescript(packageJson: PackageJson) {
  const dependencies = packageJson["dependencies"];
  const devDependencies = packageJson["devDependencies"];
  return (
    (typeof dependencies === "object" &&
      dependencies !== null &&
      Object.hasOwn(dependencies, "typescript")) ||
    (typeof devDependencies === "object" &&
      devDependencies !== null &&
      Object.hasOwn(devDependencies, "typescript"))
  );
}

function installArguments(pm: string, version?: string) {
  const spec = version
    ? `@udohjeremiah/moniq@${version}`
    : "@udohjeremiah/moniq";
  switch (pm) {
    case "bun": {
      return ["add", "--dev", spec];
    }
    case "deno": {
      return ["add", "-D", `npm:${spec}`];
    }
    case "npm": {
      return ["install", "--save-dev", spec];
    }
    case "pnpm": {
      return ["add", "-D", "-w", spec];
    }
    case "yarn": {
      return ["add", "--dev", spec];
    }
  }
  throw new Error(`Unknown package manager: ${pm}`);
}

function installPackage(pm: string, root: string, version?: string) {
  return new Promise<void>((resolve, reject) => {
    const child = execFile(pm, installArguments(pm, version), { cwd: root });
    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Exit code ${String(code)}: ${stderr.trim()}`));
    });
    child.on("error", reject);
  });
}

function printCompletion(filename: string) {
  const createdMessage = `✔ Created ${filename}`;
  console.log(`  ${styleText(["bold", "green"], createdMessage)}`);
  console.log();
  console.log(`  ${styleText("dim", "Next steps:")}`);
  console.log(
    `   1. ${styleText("dim", "Edit")} ${styleText("cyan", filename)} ${styleText("dim", "to configure your policies.")}`,
  );
  console.log(
    `   2. ${styleText("dim", "Run")} ${styleText("cyan", "moniq check")} ${styleText("dim", "to validate your workspace.")}`,
  );
  console.log(
    `   3. ${styleText("dim", "Run")} ${styleText("cyan", "moniq fix")} ${styleText("dim", "to apply automatic fixes.")}`,
  );
  console.log();
}

function printDetectedInfo(
  cwd: string,
  pm: PackageManager,
  lang: string,
  workspaceLabel: string,
  workspacePackages: { path: string }[],
) {
  const isTypeScript = ["cts", "mts", "ts"].includes(lang);
  const langDisplay = isTypeScript ? "TypeScript" : "JavaScript";
  const sideDashes = (DIVIDER_WIDTH - " Detected ".length) / 2;
  const topDivider = dim(
    `  ${"─".repeat(sideDashes)} Detected ${"─".repeat(sideDashes)}`,
  );
  const bottomDivider = dim(`  ${"─".repeat(DIVIDER_WIDTH)}`);
  const labelIndent = " ".repeat(19);

  console.log(topDivider);
  console.log(`    ${dim(labelPad("Workspace:"))} ${cyan(workspaceLabel)}`);
  if (workspacePackages.length > 1) {
    for (const package_ of workspacePackages) {
      const relativePath = path.relative(cwd, package_.path);
      const bullet = dim(`• ${relativePath}`);
      console.log(`    ${labelIndent}${bullet}`);
    }
  }
  console.log(`    ${dim(labelPad("Package Manager:"))} ${cyan(pm)}`);
  console.log(`    ${dim(labelPad("Language:"))} ${cyan(langDisplay)}`);
  console.log(bottomDivider);
}

function startSpinner(text: string) {
  const frames = ["⠋", "⠙", "⠸", "⠴", "⠦", "⠧"];
  let index = 0;
  const id = setInterval(() => {
    const frame = frames.at(index) ?? "";
    const styled = `${styleText("dim", frame)} ${text}`;
    process.stdout.write(`\r  ${styled}`);
    index = (index + 1) % frames.length;
  }, 80);
  return () => {
    clearInterval(id);
    process.stdout.write("\r\u{1B}[K");
  };
}
