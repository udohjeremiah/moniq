import { type Diagnostic } from "@moniq/core";
import { bold, cyan, dim, gray, green, red, yellow } from "yoctocolors";

export type Format = "json" | "pretty";

export interface FormatOptions {
  format?: Format;
  isDryRun?: boolean;
}

export function formatDiagnostics(
  diagnostics: Diagnostic[],
  options?: FormatOptions,
): string {
  const fmt = options?.format ?? "pretty";

  if (fmt === "json") {
    return formatJson(diagnostics);
  }

  return formatPretty(diagnostics, options?.isDryRun);
}

function formatJson(diagnostics: Diagnostic[]): string {
  return `${JSON.stringify(diagnostics, undefined, 2)}\n`;
}

function formatPretty(diagnostics: Diagnostic[], isDryRun?: boolean): string {
  if (diagnostics.length === 0) {
    return green(bold("✅ No issues found."));
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
    lines.push("", `📦 ${cyan(bold(packageName))}`);

    for (const d of diags) {
      pushDiagnostic(lines, d, isDryRun);
    }
  }

  const errorCount = diagnostics.filter((d) => d.severity === "error").length;
  const warningCount = diagnostics.filter((d) => d.severity === "warn").length;
  const countParts: string[] = [];
  if (errorCount > 0) countParts.push(red(`${String(errorCount)} error(s)`));
  if (warningCount > 0)
    countParts.push(yellow(`${String(warningCount)} warning(s)`));
  const summary = countParts.join(", ");

  const summaryLine = `📋 Found ${String(diagnostics.length)} issue(s) — ${summary.length > 0 ? summary : "all clear"}`;
  lines.push("", dim(summaryLine));

  if (isDryRun) {
    const fixableCount = diagnostics.filter(
      (d) => d.fix && d.severity !== "off",
    ).length;
    lines.push(
      "",
      dim(`🔮 Dry-run: ${String(fixableCount)} fix(es) available`),
    );
  }

  return lines.join("\n");
}

function pushDiagnostic(
  lines: string[],
  d: Diagnostic,
  isDryRun?: boolean,
): void {
  const badge = severityBadge(d.severity);
  const emoji = severityEmoji(d.severity);

  lines.push(`  ${emoji} ${badge} ${d.message}`);

  if (d.expected && d.actual) {
    lines.push(
      `         ${dim("Expected:")} ${cyan(d.expected)}`,
      `         ${dim("Actual:")}   ${red(d.actual)}`,
    );
  } else if (d.expected) {
    lines.push(`         ${dim("Expected:")} ${cyan(d.expected)}`);
  } else if (d.actual) {
    lines.push(`         ${dim("Actual:")}   ${red(d.actual)}`);
  }

  if (d.fix) {
    const label = dim(isDryRun ? "Would fix:" : "Fix:");
    const icon = isDryRun ? "🔮" : "🔧";
    lines.push(`         ${icon} ${label} ${d.fix}`);
  }
}

function severityBadge(severity: Diagnostic["severity"]): string {
  if (severity === "error") {
    return red(bold("ERROR"));
  }
  if (severity === "warn") {
    return yellow(bold("WARN"));
  }
  return gray("OFF");
}

function severityEmoji(severity: Diagnostic["severity"]): string {
  if (severity === "error") {
    return "❌";
  }
  if (severity === "warn") {
    return "⚠️ ";
  }
  return "⚪";
}
