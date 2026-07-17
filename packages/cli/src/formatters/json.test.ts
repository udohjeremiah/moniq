import { type Report } from "@moniq/core";
import { describe, expect, it } from "vitest";

import { jsonFormatter } from "./json.js";

describe("jsonFormatter", () => {
  it("formats an empty report", () => {
    const report: Report = {
      results: [],
      summary: { errors: 0, passed: true, total: 0, warnings: 0 },
      tool: { name: "moniq" },
    };

    const output = jsonFormatter.format(report);
    const parsed = JSON.parse(output) as Report;

    expect(parsed.tool.name).toBe("moniq");
    expect(parsed.summary.passed).toBe(true);
    expect(parsed.results).toEqual([]);
  });

  it("formats a report with diagnostics", () => {
    const report: Report = {
      results: [
        {
          domain: "scripts",
          message: 'Missing required script "build"',
          packageName: "@moniq/core",
          packagePath: "/packages/core",
          ruleId: "scripts/missing",
          ruleName: "Missing required script",
          scriptName: "build",
          severity: "error",
        },
      ],
      summary: { errors: 1, passed: false, total: 1, warnings: 0 },
      tool: { name: "moniq" },
    };

    const output = jsonFormatter.format(report);
    const parsed = JSON.parse(output) as Report;

    expect(Array.isArray(parsed.results)).toBe(true);
    expect(parsed.results).toHaveLength(1);
    expect(parsed.results[0]?.ruleId).toBe("scripts/missing");
    expect(parsed.summary.errors).toBe(1);
    expect(parsed.summary.passed).toBe(false);
  });

  it("output is stable JSON (tool, summary, results)", () => {
    const report: Report = {
      results: [],
      summary: { errors: 0, passed: true, total: 0, warnings: 0 },
      tool: { name: "moniq" },
    };

    const output = jsonFormatter.format(report);
    const parsed = JSON.parse(output) as Record<string, unknown>;

    expect(parsed).toHaveProperty("tool");
    expect(parsed).toHaveProperty("summary");
    expect(parsed).toHaveProperty("results");
  });

  it("ends with a newline", () => {
    const report: Report = {
      results: [],
      summary: { errors: 0, passed: true, total: 0, warnings: 0 },
      tool: { name: "moniq" },
    };

    const output = jsonFormatter.format(report);
    expect(output.endsWith("\n")).toBe(true);
  });
});
