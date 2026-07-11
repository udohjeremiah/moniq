import { access } from "node:fs/promises";
import path from "node:path";
import { bold, cyan, dim, green, yellow } from "yoctocolors";

import { renderBanner } from "../banner.js";

const SUPPORTED_LANGS = ["ts", "js", "mjs", "cjs", "mts", "cts"];

const STARTER_CONFIG = `import { defineConfig } from "moniq";

export default defineConfig({
  scripts: {
    dev: { required: true },
    build: { required: true },
    lint: { required: true },
  },
});
`;

export interface InitOptions {
  lang: string;
}

export async function init(options: InitOptions): Promise<void> {
  const { lang } = options;

  if (!SUPPORTED_LANGS.includes(lang)) {
    const unsupportedMessage = `Unsupported --lang "${lang}". Supported: ${SUPPORTED_LANGS.join(", ")}`;
    console.error(`  ${yellow(unsupportedMessage)}`);
    process.exitCode = 1;
    return;
  }

  const cwd = process.cwd();
  const filename = `moniq.config.${lang}`;
  const targetPath = path.join(cwd, filename);

  try {
    await access(targetPath);
    const existsMessage = `⚠️  ${filename} already exists. Remove it first to reinitialize.`;
    console.log(`  ${yellow(existsMessage)}`);
    return;
  } catch {
    // File doesn't exist — good
  }

  const { writeFile } = await import("node:fs/promises");
  await writeFile(targetPath, STARTER_CONFIG, "utf8");

  console.log(renderBanner());
  console.log();
  const created = `✅ Created ${filename}`;
  console.log(`  ${green(bold(created))}`);
  console.log();
  console.log(`  ${dim("Next steps:")}`);
  console.log(
    `   1. ${dim("Edit")} ${cyan(filename)} ${dim("to configure your script policies.")}`,
  );
  console.log(
    `   2. ${dim("Run")} ${cyan("moniq doctor")} ${dim("to verify your configuration.")}`,
  );
  console.log(
    `   3. ${dim("Run")} ${cyan("moniq check")} ${dim("to validate your workspace.")}`,
  );
  console.log(
    `   4. ${dim("Run")} ${cyan("moniq fix")} ${dim("to apply automatic fixes.")}`,
  );
  console.log();
}
