import type { Diagnostic, Report } from "@moniq/core";

import { styleText } from "node:util";

import type { FormatContext, Formatter } from "./types.js";

export const prettyFormatter: Formatter = {
  format(report: Report, context?: FormatContext) {
    return formatPretty(report.results, context?.isDryRun);
  },
};

function formatPretty(diagnostics: Diagnostic[], isDryRun?: boolean) {
  if (diagnostics.length === 0) {
    return styleText(["bold", "green"], "✔ No issues found.");
  }

  const lines: string[] = [];

  const byPackage = new Map<string, Diagnostic[]>();
  for (const d of diagnostics) {
    const array = byPackage.get(d.packageName);
    if (array) {
      array.push(d);
    } else {
      byPackage.set(d.packageName, [d]);
    }
  }

  for (const [packageName, diags] of byPackage) {
    lines.push("", styleText(["bold", "cyan"], packageName));

    for (const d of diags) {
      pushDiagnostic(lines, d, isDryRun);
    }
  }

  const errorCount = diagnostics.filter((d) => d.severity === "error").length;
  const warningCount = diagnostics.filter((d) => d.severity === "warn").length;
  const countParts: string[] = [];
  if (errorCount > 0)
    countParts.push(styleText("red", `${String(errorCount)} error(s)`));
  if (warningCount > 0)
    countParts.push(styleText("yellow", `${String(warningCount)} warning(s)`));
  const summary = countParts.join(", ");

  const summaryLine = `${styleText("cyan", "\u{2139}")} Found ${String(diagnostics.length)} issue(s) \u{2014} ${summary.length > 0 ? summary : "all clear"}`;
  lines.push("", styleText("dim", summaryLine));

  if (isDryRun) {
    const fixableCount = diagnostics.filter(
      (d) => d.fix && d.severity !== "off",
    ).length;
    lines.push(
      "",
      styleText(
        "dim",
        `${styleText("cyan", "\u{2139}")} Dry-run: ${String(fixableCount)} fix(es) available`,
      ),
    );
  }

  return lines.join("\n");
}

function pushDiagnostic(lines: string[], d: Diagnostic, isDryRun?: boolean) {
  const badge = severityBadge(d.severity);
  const icon = severityIcon(d.severity);

  lines.push(`  ${icon} ${badge} ${d.message}`);

  if (d.expected && d.actual) {
    lines.push(
      `         ${styleText("dim", "Expected:")} ${styleText("cyan", d.expected)}`,
      `         ${styleText("dim", "Actual:")}   ${styleText("red", d.actual)}`,
    );
  } else if (d.expected) {
    lines.push(
      `         ${styleText("dim", "Expected:")} ${styleText("cyan", d.expected)}`,
    );
  } else if (d.actual) {
    lines.push(
      `         ${styleText("dim", "Actual:")}   ${styleText("red", d.actual)}`,
    );
  }

  if (d.fix) {
    const label = styleText("dim", isDryRun ? "Would fix:" : "Fix:");
    lines.push(`         ${label} ${d.fix}`);
  }
}

function severityBadge(severity: Diagnostic["severity"]) {
  if (severity === "error") {
    return styleText(["bold", "red"], "ERROR");
  }
  if (severity === "warn") {
    return styleText(["bold", "yellow"], "WARN");
  }
  return styleText("gray", "OFF");
}

function severityIcon(severity: Diagnostic["severity"]) {
  if (severity === "error") {
    return styleText(["bold", "red"], "\u{2718}");
  }
  if (severity === "warn") {
    return styleText(["bold", "yellow"], "\u{26A0}");
  }
  return " ";
}
