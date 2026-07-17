import { type Report } from "@moniq/core";

import type { Format, Formatter } from "./formatters/types.js";

import {
  jsonFormatter,
  prettyFormatter,
  sarifFormatter,
} from "./formatters/index.js";

export interface FormatOptions {
  format?: Format;
  isDryRun?: boolean;
}

export function formatReport(report: Report, options?: FormatOptions): string {
  const fmt = options?.format ?? "pretty";
  const formatter = getFormatter(fmt);
  return formatter.format(report, { isDryRun: options?.isDryRun });
}

function getFormatter(format: Format): Formatter {
  if (format === "json") return jsonFormatter;
  if (format === "sarif") return sarifFormatter;
  return prettyFormatter;
}

export { type Format } from "./formatters/types.js";
