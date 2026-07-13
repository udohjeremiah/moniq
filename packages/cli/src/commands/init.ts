import {
  detectPackageManager,
  discoverWorkspace,
  type PackageJson,
  readPackageJson,
} from "@moniq/workspace";
import { execFile } from "node:child_process";
import path from "node:path";
import { stdin } from "node:process";
import { createInterface } from "node:readline/promises";
import { styleText } from "node:util";

import { renderBanner } from "../banner.js";

const SUPPORTED_LANGS = ["ts", "js", "mjs", "cjs", "mts", "cts"];

const DIVIDER_WIDTH = 44;

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

export async function detectLang(cwd: string, packageJson: PackageJson) {
  const rawDependencies = packageJson["dependencies"];
  const rawDevelopmentDependencies = packageJson["devDependencies"];
  const isModule = packageJson["type"] === "module";

  const { access } = await import("node:fs/promises");
  try {
    await access(path.join(cwd, "tsconfig.json"));
    return isModule ? "ts" : "mts";
  } catch {
    // no tsconfig
  }

  if (
    typeof rawDependencies === "object" &&
    rawDependencies !== null &&
    Object.hasOwn(rawDependencies, "typescript")
  ) {
    return isModule ? "ts" : "mts";
  }

  if (
    typeof rawDevelopmentDependencies === "object" &&
    rawDevelopmentDependencies !== null &&
    Object.hasOwn(rawDevelopmentDependencies, "typescript")
  ) {
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

  // Check for existing config with overwrite prompt
  const canProceed = await handleExistingConfig(configPath, filename);
  if (!canProceed) return;

  // Detect everything
  let workspaceLabel = "single package";
  let childPackages: { path: string }[] = [];
  try {
    const packages = await discoverWorkspace(cwd);
    childPackages = packages.filter(
      (p) => path.resolve(cwd, p.path) !== path.resolve(cwd),
    );
    if (childPackages.length > 1) {
      workspaceLabel = `monorepo with ${String(childPackages.length)} packages`;
    }
  } catch {
    workspaceLabel = "unknown (workspace detection failed)";
  }

  const pm = await detectPackageManager(cwd);

  const isTypeScript = ["cts", "mts", "ts"].includes(lang);
  const langDisplay = isTypeScript ? "TypeScript" : "JavaScript";

  // Print detection block
  const dim = (s: string) => styleText("dim", s);
  const cyan = (s: string) => styleText("cyan", s);

  const sideDashes = (DIVIDER_WIDTH - " Detected ".length) / 2;
  const topDivider = dim(
    `  ${"─".repeat(sideDashes)} Detected ${"─".repeat(sideDashes)}`,
  );
  const bottomDivider = dim(`  ${"─".repeat(DIVIDER_WIDTH)}`);
  const labelIndent = " ".repeat(19);

  console.log(topDivider);
  console.log(`    ${dim(labelPad("Workspace:"))} ${cyan(workspaceLabel)}`);
  if (childPackages.length > 1) {
    for (const package_ of childPackages) {
      const relativePath = path.relative(cwd, package_.path);
      const bullet = dim(`• ${relativePath}`);
      console.log(`    ${labelIndent}${bullet}`);
    }
  }
  console.log(`    ${dim(labelPad("Package Manager:"))} ${cyan(pm)}`);
  console.log(`    ${dim(labelPad("Language:"))} ${cyan(langDisplay)}`);
  console.log(bottomDivider);
  console.log();

  // Install package as devDependency (skip in test mode)
  if (!_cwd) {
    const stopSpinner = startSpinner(
      "Installing @udohjeremiah/moniq as devDependency...",
    );
    try {
      await installPackage(pm, cwd, options.version);
      stopSpinner();
      console.log(`  ✔ Installed @udohjeremiah/moniq as devDependency`);
    } catch (error) {
      stopSpinner();
      const errorMessage = `Installation failed: ${String(error)}`;
      const styledError = styleText("red", `✘ ${errorMessage}`);
      console.log(`  ${styledError}`);
      console.log(
        `  ${styleText("dim", "Make sure you have a working internet connection and try again.")}`,
      );
      console.log();
      process.exitCode = 1;
      return;
    }
  }

  // Write config
  const { writeFile } = await import("node:fs/promises");
  await writeFile(configPath, STARTER_CONFIG, "utf8");

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

async function handleExistingConfig(configPath: string, filename: string) {
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

function installArguments(pm: string, version?: string) {
  const spec = version
    ? `@udohjeremiah/moniq@${version}`
    : "@udohjeremiah/moniq";
  switch (pm) {
    case "bun": {
      return ["add", "--dev", spec];
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

async function readRootPackageJson(cwd: string) {
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
    return;
  }
}

function startSpinner(text: string): () => void {
  const frames = ["⠋", "⠙", "⠸", "⠴", "⠦", "⠧"];
  let index = 0;
  const id = setInterval(() => {
    const frame = frames.at(index) ?? "";
    const styled = styleText("dim", `${frame} ${text}`);
    process.stdout.write(`\r  ${styled}`);
    index = (index + 1) % frames.length;
  }, 80);
  return () => {
    clearInterval(id);
    process.stdout.write("\r\u{1B}[K");
  };
}
