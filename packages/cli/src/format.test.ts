import { type Diagnostic } from "@moniq/core";
import { describe, expect, it } from "vitest";

import { formatDiagnostics } from "./format.js";

const makeDiagnostic = (overrides?: Partial<Diagnostic>): Diagnostic => ({
  message: 'Missing required script "build"',
  packageName: "@moniq/core",
  packagePath: "/packages/core",
  severity: "error",
  ...overrides,
});

describe("formatPretty", () => {
  it("returns success message when no diagnostics", () => {
    const result = formatDiagnostics([], { format: "pretty" });
    expect(result).toContain("No issues found");
  });

  it("formats a single error diagnostic", () => {
    const result = formatDiagnostics([makeDiagnostic()], { format: "pretty" });
    expect(result).toContain("ERROR");
    expect(result).toContain("Missing required script");
  });

  it("includes fix suggestion when present", () => {
    const d = makeDiagnostic({ fix: "eslint .", severity: "warn" });
    const result = formatDiagnostics([d], { format: "pretty" });
    expect(result).toContain("Fix:");
    expect(result).toContain("eslint .");
  });

  it("groups diagnostics by package", () => {
    const result = formatDiagnostics(
      [
        makeDiagnostic({ message: "Issue 1", packageName: "pkg-a" }),
        makeDiagnostic({ message: "Issue 2", packageName: "pkg-b" }),
      ],
      { format: "pretty" },
    );
    expect(result).toContain("pkg-a");
    expect(result).toContain("pkg-b");
  });

  it("shows expected/actual when provided", () => {
    const result = formatDiagnostics(
      [makeDiagnostic({ actual: "tsc", expected: "tsc --noEmit" })],
      { format: "pretty" },
    );
    expect(result).toContain("tsc --noEmit");
    expect(result).toContain("tsc");
  });

  it("shows warning badge", () => {
    const result = formatDiagnostics([makeDiagnostic({ severity: "warn" })], {
      format: "pretty",
    });
    expect(result).toContain("WARN");
  });

  it("shows summary line at the end", () => {
    const result = formatDiagnostics(
      [
        makeDiagnostic({ severity: "error" }),
        makeDiagnostic({ message: "Other", severity: "warn" }),
      ],
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
    const result = formatDiagnostics([d], { format: "pretty", isDryRun: true });
    expect(result).toContain("Would fix:");
    expect(result).not.toContain("Fix:");
    expect(result).toContain("tsup");
  });

  it("includes dry-run summary line when fixes are available", () => {
    const result = formatDiagnostics(
      [
        makeDiagnostic({ fix: "eslint .", severity: "error" }),
        makeDiagnostic({ fix: "tsup", severity: "error" }),
      ],
      { format: "pretty", isDryRun: true },
    );
    expect(result).toContain("Dry-run:");
    expect(result).toContain("2 fix(es)");
  });

  it("shows Fix: normally when isDryRun is not set", () => {
    const d = makeDiagnostic({ fix: "tsup" });
    const result = formatDiagnostics([d], { format: "pretty" });
    expect(result).toContain("Fix:");
    expect(result).not.toContain("Would fix:");
  });
});

describe("formatJson", () => {
  it("returns valid JSON array", () => {
    const result = formatDiagnostics([makeDiagnostic()], { format: "json" });
    const parsed = JSON.parse(result) as Diagnostic[];
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0]?.message).toBe('Missing required script "build"');
  });

  it("returns empty array for no diagnostics", () => {
    const result = formatDiagnostics([], { format: "json" });
    const parsed = JSON.parse(result) as Diagnostic[];
    expect(parsed).toEqual([]);
  });
});

describe("formatDiagnostics", () => {
  it("defaults to pretty format", () => {
    const result = formatDiagnostics([]);
    expect(result).toContain("No issues found");
  });

  it("returns JSON when format is json", () => {
    const result = formatDiagnostics([makeDiagnostic()], { format: "json" });
    expect(() => {
      JSON.parse(result);
    }).not.toThrow();
  });
});
