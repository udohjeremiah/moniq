import type { Diagnostic, Report } from "@moniq/core";

import { describe, expect, it } from "vitest";

import { sarifFormatter } from "./sarif.js";

interface SarifArtifact {
  location: { uri: string };
}

interface SarifLog {
  $schema: string;
  runs: SarifRun[];
  version: string;
}

interface SarifResult {
  fixes?: { description: { text: string } }[];
  level: string;
  locations?: { physicalLocation: { artifactLocation: { uri: string } } }[];
  message: { text: string };
  ruleId: string;
  ruleIndex: number;
}

interface SarifRule {
  id: string;
  name: string;
}

interface SarifRun {
  artifacts?: SarifArtifact[];
  results: SarifResult[];
  tool: {
    driver: { informationUri?: string; name: string; rules?: SarifRule[] };
  };
}

describe("sarifFormatter", () => {
  it("formats an empty report", () => {
    const report: Report = {
      results: [],
      summary: { errors: 0, passed: true, total: 0, warnings: 0 },
      tool: { name: "moniq" },
    };

    const output = sarifFormatter.format(report);
    const parsed = JSON.parse(output) as SarifLog;

    expect(parsed.$schema).toBe(
      "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
    );
    expect(parsed.version).toBe("2.1.0");
    expect(parsed.runs).toHaveLength(1);
  });

  it("includes tool driver info", () => {
    const report: Report = {
      results: [],
      summary: { errors: 0, passed: true, total: 0, warnings: 0 },
      tool: { name: "moniq" },
    };

    const output = sarifFormatter.format(report);
    const parsed = JSON.parse(output) as SarifLog;

    expect(parsed.runs[0]?.tool.driver.name).toBe("moniq");
  });

  it("deduplicates rules", () => {
    const report: Report = {
      results: [
        {
          domain: "scripts",
          message: 'Missing required script "build"',
          packageName: "a",
          packagePath: "/packages/a",
          plugin: "scripts",
          ruleId: "scripts/missing",
          ruleName: "Missing required script",
          severity: "error",
        },
        {
          domain: "scripts",
          message: 'Missing required script "test"',
          packageName: "b",
          packagePath: "/packages/b",
          plugin: "scripts",
          ruleId: "scripts/missing",
          ruleName: "Missing required script",
          severity: "error",
        },
      ] as Diagnostic[],
      summary: { errors: 2, passed: false, total: 2, warnings: 0 },
      tool: { name: "moniq" },
    };

    const output = sarifFormatter.format(report);
    const parsed = JSON.parse(output) as SarifLog;
    const rules = parsed.runs[0]?.tool.driver.rules;

    expect(rules).toHaveLength(1);
    expect(rules?.[0]?.id).toBe("scripts/missing");
  });

  it("maps diagnostics to results with correct levels", () => {
    const report: Report = {
      results: [
        {
          domain: "scripts",
          message: 'Missing required script "build"',
          packageName: "a",
          packagePath: "/packages/a",
          ruleId: "scripts/missing",
          ruleName: "Missing required script",
          severity: "error",
        },
        {
          domain: "scripts",
          message: 'Unexpected command for script "test"',
          metadata: { actual: "tsc", expected: "tsup" },
          packageName: "b",
          packagePath: "/packages/b",
          plugin: "scripts",
          ruleId: "scripts/command-mismatch",
          ruleName: "Unexpected command",
          severity: "warn",
        },
      ] as Diagnostic[],
      summary: { errors: 1, passed: false, total: 2, warnings: 1 },
      tool: { name: "moniq" },
    };

    const output = sarifFormatter.format(report);
    const parsed = JSON.parse(output) as SarifLog;
    const results = parsed.runs[0]?.results ?? [];

    expect(results).toHaveLength(2);
    expect(results[0]?.level).toBe("error");
    expect(results[1]?.level).toBe("warning");
    expect(results[1]?.ruleId).toBe("scripts/command-mismatch");
  });

  it("includes artifact locations", () => {
    const report: Report = {
      results: [
        {
          domain: "scripts",
          message: 'Missing required script "build"',
          packageName: "my-package",
          packagePath: "/packages/my-package",
          plugin: "scripts",
          ruleId: "scripts/missing",
          ruleName: "Missing required script",
          severity: "error",
        },
      ],
      summary: { errors: 1, passed: false, total: 1, warnings: 0 },
      tool: { name: "moniq" },
    };

    const output = sarifFormatter.format(report);
    const parsed = JSON.parse(output) as SarifLog;
    const artifacts = parsed.runs[0]?.artifacts;

    expect(artifacts).toHaveLength(1);
    expect(artifacts?.[0]?.location.uri).toBe("/packages/my-package");
  });

  it("does not emit SARIF fixes", () => {
    const report: Report = {
      results: [
        {
          domain: "scripts",
          fix: async () => {
            await Promise.resolve();
          },
          message: 'Missing required script "build"',
          packageName: "my-package",
          packagePath: "/packages/my-package",
          plugin: "scripts",
          ruleId: "scripts/missing",
          ruleName: "Missing required script",
          severity: "error",
        },
      ] as Diagnostic[],
      summary: { errors: 1, passed: false, total: 1, warnings: 0 },
      tool: { name: "moniq" },
    };

    const output = sarifFormatter.format(report);
    const parsed = JSON.parse(output) as SarifLog;
    const results = parsed.runs[0]?.results ?? [];

    expect(results[0]?.fixes).toBeUndefined();
  });

  it("ends with a newline", () => {
    const report: Report = {
      results: [],
      summary: { errors: 0, passed: true, total: 0, warnings: 0 },
      tool: { name: "moniq" },
    };

    const output = sarifFormatter.format(report);
    expect(output.endsWith("\n")).toBe(true);
  });
});
