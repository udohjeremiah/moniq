import { loadConfig } from "@moniq/config";
import { resolve } from "@moniq/core";
import { discoverWorkspace } from "@moniq/workspace";
import { styleText } from "node:util";

import { type Format, formatDiagnostics } from "../format.js";
import { applyScriptFixes, type FixSummary } from "../scripts.js";

export interface CheckOptions {
  fix?: boolean;
  format?: Format;
  isDryRun?: boolean;
}

export async function check(options: CheckOptions): Promise<void> {
  const cwd = process.cwd();

  let config;
  try {
    config = await loadConfig(cwd);
  } catch (error) {
    throw new Error(`Failed to load moniq.config: ${String(error)}`, {
      cause: error,
    });
  }

  const packages = await discoverWorkspace(cwd);
  if (packages.length === 0) {
    throw new Error("No workspace packages found.");
  }

  const diagnostics = await resolve(config, cwd, packages);

  let fixSummary: FixSummary | undefined;

  if (options.fix) {
    fixSummary = await applyScriptFixes(diagnostics, {
      isDryRun: options.isDryRun,
    });
  }

  if (options.format !== "json") {
    console.log(
      `${styleText("cyan", "ℹ")} Scanned ${String(packages.length)} package(s)`,
    );
  }

  console.log(
    formatDiagnostics(diagnostics, {
      format: options.format,
      isDryRun: options.isDryRun,
    }),
  );

  if (fixSummary) {
    if (fixSummary.isDryRun) {
      const message = `${styleText("cyan", "ℹ")} Dry-run: ${String(fixSummary.fixed)} fix(es) available, ${String(fixSummary.errors)} error(s)`;
      console.log(styleText("dim", message));
    } else {
      const message = `✔ Fixed ${String(fixSummary.fixed)} issue(s) across ${String(fixSummary.packageCount)} package(s)`;
      console.log(styleText(["bold", "green"], message));
    }
  }
}
