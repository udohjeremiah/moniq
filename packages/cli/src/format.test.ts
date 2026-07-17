import { type Diagnostic, type Report } from "@moniq/core";
import { describe, expect, it } from "vitest";

import { formatReport } from "./format.js";

const makeDiagnostic = (overrides?: Partial<Diagnostic>): Diagnostic => ({
  domain: "scripts",
  message: 'Missing required script "build"',
  packageName: "@moniq/core",
  packagePath: "/packages/core",
  ruleId: "scripts/missing",
  ruleName: "Missing required script",
  severity: "error",
  ...overrides,
});

function makeReport(diagnostics: Diagnostic[]): Report {
  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warn").length;
  return {
    results: diagnostics,
    summary: {
      errors,
      passed: errors === 0,
      total: diagnostics.length,
      warnings,
    },
    tool: { name: "moniq" },
  };
}

describe("formatPretty", () => {
  it("returns success message when no diagnostics", () => {
    const result = formatReport(makeReport([]), { format: "pretty" });
    expect(result).toContain("No issues found");
  });

  it("formats a single error diagnostic", () => {
    const result = formatReport(makeReport([makeDiagnostic()]), {
      format: "pretty",
    });
    expect(result).toContain("ERROR");
    expect(result).toContain("Missing required script");
  });

  it("includes fix suggestion when present", () => {
    const d = makeDiagnostic({ fix: "eslint .", severity: "warn" });
    const result = formatReport(makeReport([d]), { format: "pretty" });
    expect(result).toContain("Fix:");
    expect(result).toContain("eslint .");
  });

  it("groups diagnostics by package", () => {
    const result = formatReport(
      makeReport([
        makeDiagnostic({ message: "Issue 1", packageName: "pkg-a" }),
        makeDiagnostic({ message: "Issue 2", packageName: "pkg-b" }),
      ]),
      { format: "pretty" },
    );
    expect(result).toContain("pkg-a");
    expect(result).toContain("pkg-b");
  });

  it("shows expected/actual when provided", () => {
    const result = formatReport(
      makeReport([makeDiagnostic({ actual: "tsc", expected: "tsc --noEmit" })]),
      { format: "pretty" },
    );
    expect(result).toContain("tsc --noEmit");
    expect(result).toContain("tsc");
  });

  it("shows warning badge", () => {
    const result = formatReport(
      makeReport([makeDiagnostic({ severity: "warn" })]),
      { format: "pretty" },
    );
    expect(result).toContain("WARN");
  });

  it("shows summary line at the end", () => {
    const result = formatReport(
      makeReport([
        makeDiagnostic({ severity: "error" }),
        makeDiagnostic({ message: "Other", severity: "warn" }),
      ]),
      { format: "pretty" },
    );
    expect(result).toContain("Found 2 issue(s)");
    expect(result).toContain("error(s)");
    expect(result).toContain("warning(s)");
  });
});

describe("formatPretty dry-run", () => {
  it("shows Would fix: instead of Fix: when isDryRun is true", () => {
    const d = makeDiagnostic({ fix: "tsup" });
    const result = formatReport(makeReport([d]), {
      format: "pretty",
      isDryRun: true,
    });
    expect(result).toContain("Would fix:");
    expect(result).not.toContain("Fix:");
    expect(result).toContain("tsup");
  });

  it("includes dry-run summary line when fixes are available", () => {
    const result = formatReport(
      makeReport([
        makeDiagnostic({ fix: "eslint .", severity: "error" }),
        makeDiagnostic({ fix: "tsup", severity: "error" }),
      ]),
      { format: "pretty", isDryRun: true },
    );
    expect(result).toContain("Dry-run:");
    expect(result).toContain("2 fix(es)");
  });

  it("shows Fix: normally when isDryRun is not set", () => {
    const d = makeDiagnostic({ fix: "tsup" });
    const result = formatReport(makeReport([d]), { format: "pretty" });
    expect(result).toContain("Fix:");
    expect(result).not.toContain("Would fix:");
  });
});

describe("formatJson", () => {
  it("returns valid JSON with tool, summary, results", () => {
    const report = makeReport([makeDiagnostic()]);
    const result = formatReport(report, { format: "json" });
    const parsed = JSON.parse(result) as Report;
    expect(parsed.tool).toEqual({ name: "moniq" });
    expect(parsed.summary.total).toBe(1);
    expect(parsed.summary.passed).toBe(false);
    expect(parsed.results[0]?.message).toBe('Missing required script "build"');
  });

  it("returns empty results for no diagnostics", () => {
    const report = makeReport([]);
    const result = formatReport(report, { format: "json" });
    const parsed = JSON.parse(result) as Report;
    expect(parsed.results).toEqual([]);
    expect(parsed.summary.passed).toBe(true);
  });
});

describe("formatReport", () => {
  it("defaults to pretty format", () => {
    const result = formatReport(makeReport([]));
    expect(result).toContain("No issues found");
  });

  it("returns JSON when format is json", () => {
    const result = formatReport(makeReport([makeDiagnostic()]), {
      format: "json",
    });
    expect(() => {
      JSON.parse(result);
    }).not.toThrow();
  });
});
