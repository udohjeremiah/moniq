import { access } from "node:fs/promises";
import path from "node:path";
import { styleText } from "node:util";

import { renderBanner } from "../banner.js";

const SUPPORTED_LANGS = ["ts", "js", "mjs", "cjs", "mts", "cts"];

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
  lang: string;
}

export async function init(options: InitOptions): Promise<void> {
  const { lang } = options;

  if (!SUPPORTED_LANGS.includes(lang)) {
    const unsupportedMessage = `Unsupported --lang "${lang}". Supported: ${SUPPORTED_LANGS.join(", ")}`;
    console.error(`  ${styleText("yellow", unsupportedMessage)}`);
    process.exitCode = 1;
    return;
  }

  const cwd = process.cwd();
  const filename = `moniq.config.${lang}`;
  const targetPath = path.join(cwd, filename);

  try {
    await access(targetPath);
    const existsMessage = `⚠️  ${filename} already exists. Remove it first to reinitialize.`;
    console.log(`  ${styleText("yellow", existsMessage)}`);
    return;
  } catch {
    // File doesn't exist — good
  }

  const { writeFile } = await import("node:fs/promises");
  await writeFile(targetPath, STARTER_CONFIG, "utf8");

  console.log(renderBanner());
  console.log();
  const created = `✅ Created ${filename}`;
  console.log(`  ${styleText(["bold", "green"], created)}`);
  console.log();
  console.log(`  ${styleText("dim", "Next steps:")}`);
  console.log(
    `   1. ${styleText("dim", "Edit")} ${styleText("cyan", filename)} ${styleText("dim", "to configure your script policies.")}`,
  );
  console.log(
    `   2. ${styleText("dim", "Run")} ${styleText("cyan", "moniq doctor")} ${styleText("dim", "to verify your configuration.")}`,
  );
  console.log(
    `   3. ${styleText("dim", "Run")} ${styleText("cyan", "moniq check")} ${styleText("dim", "to validate your workspace.")}`,
  );
  console.log(
    `   4. ${styleText("dim", "Run")} ${styleText("cyan", "moniq fix")} ${styleText("dim", "to apply automatic fixes.")}`,
  );
  console.log();
}
