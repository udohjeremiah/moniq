import type { Report } from "@moniq/core";

export type Format = "json" | "pretty" | "sarif";

export interface FormatContext {
  isDryRun?: boolean;
}

export interface Formatter {
  format(report: Report, context?: FormatContext): string;
}
