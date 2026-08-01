import { loadConfig } from "@moniq/config";
import { resolve } from "@moniq/core";
import { discoverWorkspace, findWorkspaceRoot } from "@moniq/workspace";
import { styleText } from "node:util";

import { applyFileFixes } from "../files.js";
import { applyFixes, type Fixer, type FixSummary } from "../fix.js";
import { type Format, formatReport } from "../format.js";
import { applyScriptFixes } from "../scripts.js";

export interface CheckOptions {
  fix?: boolean;
  format?: Format;
  isDryRun?: boolean;
}

const fixers: Fixer[] = [
  { apply: applyFileFixes, domain: "files" },
  { apply: applyScriptFixes, domain: "scripts" },
];

export async function check(options: CheckOptions) {
  const cwd = process.cwd();
  const root = await findWorkspaceRoot(cwd);

  let config;
  try {
    config = await loadConfig(root);
  } catch (error) {
    throw new Error(`Failed to load moniq.config.*: ${String(error)}`, {
      cause: error,
    });
  }

  const packages = await discoverWorkspace(root);
  if (packages.length === 0) {
    throw new Error("No workspace packages found.");
  }

  const report = await resolve(config, root, packages);

  let fixSummary: FixSummary | undefined;

  if (options.fix) {
    fixSummary = await applyFixes(fixers, report.results, {
      isDryRun: options.isDryRun,
      root,
    });
  }

  if (options.format !== "json") {
    console.log(
      `${styleText("magentaBright", "\u{2139}")} Scanned ${String(packages.length)} package(s)`,
    );
  }

  console.log(
    formatReport(report, {
      format: options.format,
      isDryRun: options.isDryRun,
    }),
  );

  if (fixSummary) {
    if (fixSummary.isDryRun) {
      const message = `${styleText("magentaBright", "\u{2139}")} Dry-run: ${String(fixSummary.fixed)} fix(es) available, ${String(fixSummary.errors)} error(s)`;
      console.log(styleText("dim", message));
    } else {
      const message = `\u{2714} Fixed ${String(fixSummary.fixed)} issue(s) across ${String(fixSummary.packageCount)} package(s)`;
      console.log(styleText(["bold", "green"], message));
    }
  }

  return report;
}
