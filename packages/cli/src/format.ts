import type { Report } from "@moniq/core";

import { jsonFormatter } from "./formatters/json.js";
import { prettyFormatter } from "./formatters/pretty.js";
import { sarifFormatter } from "./formatters/sarif.js";

export type Format = "json" | "pretty" | "sarif";

export interface FormatContext {
  isDryRun?: boolean;
}

export interface FormatOptions {
  format?: Format;
  isDryRun?: boolean;
}

export interface Formatter {
  format(report: Report, context?: FormatContext): string;
}

export function formatReport(report: Report, options?: FormatOptions) {
  const fmt = options?.format ?? "pretty";
  const formatter = getFormatter(fmt);
  return formatter.format(report, { isDryRun: options?.isDryRun });
}

function getFormatter(format: Format) {
  if (format === "json") return jsonFormatter;
  if (format === "sarif") return sarifFormatter;
  return prettyFormatter;
}
