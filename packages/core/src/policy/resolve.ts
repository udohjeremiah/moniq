import path from "node:path";
import { type TSchema, Type } from "typebox";
import { Check, Errors } from "typebox/value";

import type { UserConfig } from "../config/index.js";
import type {
  Diagnostic,
  PluginReportInput,
  PolicySubject,
} from "../plugins/plugins.js";
import type { RegisteredPluginDomain } from "../plugins/registry.js";
import type { Package } from "../workspace/workspace.js";
import type { Policy } from "./policy.js";

import { PolicyType } from "../plugins/plugins.js";
import { readPackageJson } from "../workspace/package-json.js";
import { pickPolicy } from "./matching.js";

export interface FixSummary {
  errors: number;
  fixed: number;
  fixedDiagnostics: Diagnostic[];
  isDryRun: boolean;
  packageCount: number;
}

export interface Report {
  results: Diagnostic[];
  summary: {
    errors: number;
    passed: boolean;
    total: number;
    warnings: number;
  };
  tool: {
    name: string;
    version?: string;
  };
}

export interface ResolveResult {
  /** Fix summary, present only when `RunOptions.fix` is enabled. */
  fixSummary?: FixSummary;

  /** Baseline report of all resolved diagnostics (before fix filtering). */
  report: Report;
}

export interface RunOptions {
  /** Whether to apply autofixes after resolving policies. */
  fix?: boolean;

  /** Preview fixes without modifying anything on disk. */
  isDryRun?: boolean;
}

interface FixRun {
  available: number;
  errors: number;
  fixedDiagnostics: Diagnostic[];
  isDryRun: boolean;
  packages: Set<string>;
}

export async function resolveAll(
  registry: Iterable<RegisteredPluginDomain>,
  config: UserConfig,
  root: string,
  packages: Package[],
  options: RunOptions = {},
): Promise<ResolveResult> {
  const diagnostics: Diagnostic[] = [];
  const fixRun =
    options.fix === true ? createFixRun(options.isDryRun === true) : undefined;

  for (const domain of registry) {
    diagnostics.push(
      ...(await resolveDomain(domain, config, root, packages, fixRun)),
    );
  }

  return {
    fixSummary: fixRun === undefined ? undefined : buildFixSummary(fixRun),
    report: buildReport(diagnostics),
  };
}

async function applyFix(policy: Policy, current: Diagnostic[], fixRun: FixRun) {
  if (fixRun.isDryRun || !isAutofixEnabled(policy) || current.length === 0) {
    return;
  }

  for (const diagnostic of current) {
    if (diagnostic.fix === undefined) {
      continue;
    }
    try {
      await diagnostic.fix();
      fixRun.fixedDiagnostics.push(diagnostic);
      fixRun.packages.add(diagnostic.packagePath);
    } catch {
      fixRun.errors++;
    }
  }
}

async function applyFixRun(
  policy: Policy,
  diagnostics: Diagnostic[],
  fixRun: FixRun,
) {
  if (fixRun.isDryRun) {
    if (!isAutofixEnabled(policy)) {
      return;
    }

    const fixable = diagnostics.filter(
      (d) => d.fix !== undefined && d.severity !== "off",
    );
    fixRun.available += fixable.length;
    for (const diagnostic of fixable) {
      fixRun.packages.add(diagnostic.packagePath);
    }
    return;
  }

  await applyFix(policy, diagnostics, fixRun);
}

function buildFixSummary(run: FixRun): FixSummary {
  if (run.isDryRun) {
    return {
      errors: run.errors,
      fixed: run.available,
      fixedDiagnostics: [],
      isDryRun: true,
      packageCount: run.packages.size,
    };
  }

  return {
    errors: run.errors,
    fixed: run.fixedDiagnostics.length,
    fixedDiagnostics: run.fixedDiagnostics,
    isDryRun: false,
    packageCount: run.packages.size,
  };
}

function buildReport(diagnostics: Diagnostic[]) {
  const errors = diagnostics.reduce(
    (count, d) => count + Number(d.severity === "error"),
    0,
  );
  const warnings = diagnostics.reduce(
    (count, d) => count + Number(d.severity === "warn"),
    0,
  );

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

function createFixRun(isDryRun: boolean): FixRun {
  return {
    available: 0,
    errors: 0,
    fixedDiagnostics: [],
    isDryRun,
    packages: new Set(),
  };
}

function createReporter(
  domain: RegisteredPluginDomain,
  subject: PolicySubject,
  packageName: string,
  severity: Diagnostic["severity"],
) {
  const diagnostics: Diagnostic[] = [];

  const report = (input: PluginReportInput): void => {
    diagnostics.push({
      ...input,
      domain: domain.domain,
      packageName,
      packagePath: subject.package.path,
      plugin: domain.pluginName,
      ruleName: input.ruleName,
      severity,
    });
  };

  return { diagnostics, report };
}

function defaultSubjects(
  configValue: unknown,
  root: string,
  packages: Package[],
) {
  const policies = Array.isArray(configValue) ? configValue : [configValue];

  return packages.map((package_) => ({
    package: { path: package_.path },
    policies,
    relativePath: path.relative(root, package_.path),
    value: undefined,
  }));
}

function isAutofixEnabled(policy: Policy) {
  return (policy as { autofix?: unknown }).autofix === true;
}

function packageName(
  packageJson: Record<string, unknown>,
  packagePath: string,
) {
  const name = packageJson["name"];
  return typeof name === "string" ? name : path.basename(packagePath);
}

async function resolveDomain(
  domain: RegisteredPluginDomain,
  config: UserConfig,
  root: string,
  packages: Package[],
  fixRun: FixRun | undefined,
) {
  const { definition } = domain;
  const diagnostics: Diagnostic[] = [];
  const configValue = (config as unknown as Record<string, unknown>)[
    domain.domain
  ];

  if (configValue === undefined || configValue === null) {
    return diagnostics;
  }

  const subjects: PolicySubject[] =
    definition.subjects === undefined
      ? defaultSubjects(configValue, root, packages)
      : await definition.subjects(configValue, root, packages);

  const packageJsonCache = new Map<string, Promise<Record<string, unknown>>>();

  const getPackageJson = (packagePath: string) => {
    let promise = packageJsonCache.get(packagePath);
    if (promise === undefined) {
      promise = readPackageJson(path.join(packagePath, "package.json"));
      packageJsonCache.set(packagePath, promise);
    }
    return promise;
  };

  const fullSchema = Type.Intersect([PolicyType, definition.schema]);

  for (const subject of subjects) {
    const policy = pickPolicy(subject.policies, subject.relativePath);

    if (policy === undefined || policy.severity === "off") {
      continue;
    }

    validateSchema(fullSchema, policy, domain.domain);

    const packageJson = await getPackageJson(subject.package.path);
    const packageName_ = packageName(packageJson, subject.package.path);
    const severity = policy.severity ?? "error";

    const reporter = createReporter(domain, subject, packageName_, severity);

    await definition.validate({
      package: subject.package,
      policy,
      report: reporter.report,
      subject: subject.value,
      workspace: { root },
    });

    diagnostics.push(...reporter.diagnostics);

    if (fixRun !== undefined) {
      await applyFixRun(policy, reporter.diagnostics, fixRun);
    }
  }

  return diagnostics;
}

function validateSchema(schema: TSchema, policy: unknown, domain: string) {
  if (Check(schema, policy)) {
    return;
  }

  const errors = Errors(schema, policy);
  const first = errors[0];

  throw new TypeError(first?.message ?? `Invalid "${domain}" policy`);
}
