import type { Diagnostic, Report } from "@moniq/core";

import { styleText } from "node:util";

import type { FormatContext, Formatter } from "../format.js";

const INFO_INDENT = " ".repeat(14);
const SEV_PAD = 8;

export const prettyFormatter: Formatter = {
  format(report: Report, context?: FormatContext) {
    return formatPretty(report.results, context?.isDryRun);
  },
};

function buildSummary(diagnostics: Diagnostic[], isDryRun?: boolean) {
  const errorCount = diagnostics.filter((d) => d.severity === "error").length;
  const warningCount = diagnostics.filter((d) => d.severity === "warn").length;
  const parts: string[] = [];

  if (errorCount > 0)
    parts.push(
      styleText(
        "red",
        `${String(errorCount)} error${errorCount === 1 ? "" : "s"}`,
      ),
    );
  if (warningCount > 0)
    parts.push(
      styleText(
        "yellow",
        `${String(warningCount)} warning${warningCount === 1 ? "" : "s"}`,
      ),
    );

  const summary = parts.length > 0 ? parts.join(", ") : "0 problems";
  const count = diagnostics.length;
  const plural = count === 1 ? "" : "s";
  let line = `\u{2718} ${String(count)} problem${plural} (${summary})`;

  if (isDryRun) {
    const fixableCount = diagnostics.filter(
      (d) =>
        (d.fix !== undefined || d.fixAction !== undefined) &&
        d.severity !== "off",
    ).length;
    if (fixableCount > 0) {
      const fixSuffix = fixableCount === 1 ? "" : "es";
      line += ` \u{2014} ${String(fixableCount)} fix${fixSuffix} available`;
    }
  }

  return line;
}

function describeFix(d: Diagnostic) {
  if (d.fixAction === "delete") {
    return `delete ${d.file ?? ""}`;
  }
  if (d.fixAction === "create") {
    return `create ${d.file ?? ""}`;
  }
  if (d.fixAction === "mkdir") {
    return `create directory ${d.file ?? ""}`;
  }
  if (d.fixAction === "write") {
    return `write ${d.file ?? ""}`;
  }
  return d.fix ?? "";
}

function formatPretty(diagnostics: Diagnostic[], isDryRun?: boolean) {
  if (diagnostics.length === 0) {
    return styleText(["bold", "green"], "\u{2714} No problems found");
  }

  const lines: string[] = [];
  const byPackage = groupByPackage(diagnostics);

  for (const [packageName, diags] of byPackage) {
    const packagePath = diags[0]?.packagePath ?? "";
    lines.push(
      "",
      styleText(["bold", "magentaBright"], `${packageName} (${packagePath})`),
    );

    for (const d of diags) {
      pushDiagnostic(lines, d, isDryRun);
    }
  }

  const summaryLine = buildSummary(diagnostics, isDryRun);
  lines.push("", styleText("dim", summaryLine));

  return lines.join("\n");
}

function groupByPackage(diagnostics: Diagnostic[]) {
  const map = new Map<string, Diagnostic[]>();
  for (const d of diagnostics) {
    const array = map.get(d.packageName);
    if (array) {
      array.push(d);
    } else {
      map.set(d.packageName, [d]);
    }
  }
  return map;
}

function padSeverity(label: string) {
  const stripped = stripAnsi(label);
  const padLength = SEV_PAD - stripped.length;
  return padLength > 0 ? label + " ".repeat(padLength) : label;
}

function pushDiagnostic(lines: string[], d: Diagnostic, isDryRun?: boolean) {
  const icon = severityIcon(d.severity);
  const badge = severityBadge(d.severity);
  const indent = INFO_INDENT;

  lines.push(`  ${icon} ${badge}  ${d.message}  ${styleText("dim", d.ruleId)}`);

  if (d.file) {
    lines.push(`${indent}${styleText("dim", d.file)}`);
  }

  if (d.expected && d.actual) {
    lines.push(
      `${indent}${styleText("dim", "Expected:")} ${styleText("magentaBright", d.expected)}`,
      `${indent}${styleText("dim", "Actual:")}   ${styleText("red", d.actual)}`,
    );
  } else if (d.expected) {
    lines.push(
      `${indent}${styleText("dim", "Expected:")} ${styleText("magentaBright", d.expected)}`,
    );
  } else if (d.actual) {
    lines.push(
      `${indent}${styleText("dim", "Actual:")}   ${styleText("red", d.actual)}`,
    );
  }

  if (d.fixAction !== undefined || d.fix) {
    const label = styleText("dim", isDryRun ? "Would fix:" : "Fix:");
    lines.push(`${indent}${label} ${describeFix(d)}`);
  }
}

function severityBadge(severity: Diagnostic["severity"]) {
  if (severity === "error") {
    return padSeverity(styleText(["bold", "red"], "error"));
  }
  if (severity === "warn") {
    return padSeverity(styleText(["bold", "yellow"], "warning"));
  }
  return padSeverity(styleText("gray", "note"));
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

function stripAnsi(text: string) {
  const escape = String.fromCodePoint(0x1b);
  let result = "";
  let isInEscape = false;
  for (const char of text) {
    if (char === escape) {
      isInEscape = true;
    } else if (isInEscape && char === "m") {
      isInEscape = false;
    } else if (!isInEscape) {
      result += char;
    }
  }
  return result;
}
