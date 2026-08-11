import { loadConfig } from "@moniq/config";
import {
  applyFixes,
  type Diagnostic,
  type FixSummary,
  type Report,
  resolve,
} from "@moniq/plugins";
import { discoverWorkspace, findWorkspaceRoot } from "@moniq/workspace";
import { styleText } from "node:util";

import { type Format, formatReport } from "../format.js";

export interface CheckOptions {
  fix?: boolean;
  format?: Format;
  isDryRun?: boolean;
}

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
    fixSummary = await applyFixes(report.results, {
      isDryRun: options.isDryRun,
      root,
    });
  }

  const finalReport =
    fixSummary !== undefined &&
    !fixSummary.isDryRun &&
    fixSummary.fixedDiagnostics.length > 0
      ? withoutFixed(report, fixSummary.fixedDiagnostics)
      : report;

  if (options.format !== "json") {
    console.log(
      `${styleText("magentaBright", "\u{2139}")} Scanned ${String(packages.length)} package(s)`,
    );
  }

  console.log(
    formatReport(finalReport, {
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

  return finalReport;
}

function withoutFixed(report: Report, fixed: Diagnostic[]): Report {
  const results = report.results.filter((d) => !fixed.includes(d));
  const errors = results.reduce(
    (count, d) => count + Number(d.severity === "error"),
    0,
  );
  const warnings = results.reduce(
    (count, d) => count + Number(d.severity === "warn"),
    0,
  );

  return {
    ...report,
    results,
    summary: {
      errors,
      passed: errors === 0,
      total: results.length,
      warnings,
    },
  };
}
