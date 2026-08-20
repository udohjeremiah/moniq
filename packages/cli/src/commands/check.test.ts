import type * as moniqCore from "@moniq/core";
import type { Diagnostic, Report } from "@moniq/core";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@moniq/plugins", () => ({}));

vi.mock("@moniq/core", async (importOriginal) => {
  const actual = await importOriginal<typeof moniqCore>();
  return {
    ...actual,
    createRegistry: vi.fn(),
    discoverWorkspace: vi.fn(),
    findWorkspaceRoot: vi.fn(),
    loadConfig: vi.fn(),
    resolveAll: vi.fn(),
  };
});

import {
  createRegistry,
  discoverWorkspace,
  findWorkspaceRoot,
  loadConfig,
  PluginRegistry,
  resolveAll,
} from "@moniq/core";

import { check } from "./check.js";

const makeDiagnostic = (overrides?: Partial<Diagnostic>): Diagnostic => ({
  domain: "scripts",
  message: 'Missing required script "build"',
  packageName: "@moniq/core",
  packagePath: "/repo/packages/core",
  plugin: "scripts",
  ruleId: "scripts/missing",
  ruleName: "Missing required script",
  severity: "error",
  ...overrides,
});

const makeReport = (diagnostics: Diagnostic[]): Report => {
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
};

beforeEach(() => {
  vi.mocked(findWorkspaceRoot).mockResolvedValue("/repo");
  vi.mocked(loadConfig).mockResolvedValue({ files: {} });
  vi.mocked(discoverWorkspace).mockResolvedValue([{ path: "/repo" }]);
  vi.mocked(createRegistry).mockImplementation(() => new PluginRegistry());
  vi.mocked(resolveAll).mockResolvedValue({
    report: makeReport([]),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("check", () => {
  it("resolves policies and returns the report", async () => {
    const result = await check({});

    expect(findWorkspaceRoot).toHaveBeenCalledWith(process.cwd());
    expect(loadConfig).toHaveBeenCalledWith("/repo");
    expect(discoverWorkspace).toHaveBeenCalledWith("/repo");
    expect(resolveAll).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "/repo",
      [{ path: "/repo" }],
      { fix: undefined, isDryRun: undefined },
    );
    expect(result.summary.passed).toBe(true);
  });

  it("prints the scanned package count for pretty format", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => void 0);

    await check({});

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Scanned 1 package(s)"),
    );
  });

  it("skips the scanned banner for json format", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => void 0);

    await check({ format: "json" });

    for (const call of logSpy.mock.calls) {
      expect(String(call[0])).not.toContain("Scanned");
    }
  });

  it("wraps config load errors", async () => {
    vi.mocked(loadConfig).mockRejectedValue(new Error("syntax error"));

    await expect(check({})).rejects.toThrow(
      /Failed to load moniq\.config\.\*: Error: syntax error/,
    );
  });

  it("throws when no workspace packages are found", async () => {
    vi.mocked(discoverWorkspace).mockResolvedValue([]);

    await expect(check({})).rejects.toThrow("No workspace packages found.");
  });

  it("filters out fixed diagnostics from the report", async () => {
    const fixable = makeDiagnostic({
      fix: async () => {
        await Promise.resolve();
      },
    });
    const unfixable = makeDiagnostic({ message: "Unfixable" });
    vi.mocked(resolveAll).mockResolvedValue({
      fixSummary: {
        errors: 0,
        fixed: 1,
        fixedDiagnostics: [fixable],
        isDryRun: false,
        packageCount: 1,
      },
      report: makeReport([fixable, unfixable]),
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => void 0);

    const result = await check({ fix: true });

    expect(result.results).toEqual([unfixable]);
    expect(result.summary.total).toBe(1);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Fixed 1 issue(s)"),
    );
  });

  it("prints the dry-run summary when fixes are available", async () => {
    vi.mocked(resolveAll).mockResolvedValue({
      fixSummary: {
        errors: 0,
        fixed: 2,
        fixedDiagnostics: [],
        isDryRun: true,
        packageCount: 1,
      },
      report: makeReport([makeDiagnostic()]),
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => void 0);

    await check({ fix: true, isDryRun: true });

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Dry-run: 2 fix(es) available, 0 error(s)"),
    );
  });

  it("keeps the report untouched when nothing was fixed", async () => {
    const diagnostic = makeDiagnostic();
    vi.mocked(resolveAll).mockResolvedValue({
      fixSummary: {
        errors: 0,
        fixed: 0,
        fixedDiagnostics: [],
        isDryRun: false,
        packageCount: 0,
      },
      report: makeReport([diagnostic]),
    });
    vi.spyOn(console, "log").mockImplementation(() => void 0);

    const result = await check({ fix: true });

    expect(result.results).toEqual([diagnostic]);
  });
});
