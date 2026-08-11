import type { UserConfig } from "@moniq/config";
import type {
  Diagnostic,
  PluginReportInput,
  PolicySubject,
} from "@moniq/config/plugins";

import { PolicyType } from "@moniq/config/plugins";
import { type Package, readPackageJson } from "@moniq/workspace";
import path from "node:path";
import { type TSchema, Type } from "typebox";
import { Check, Errors } from "typebox/value";

import type { RegisteredPluginDomain } from "./registry.js";

import { pickPolicy } from "./matching.js";

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

export async function resolveAll(
  registry: Iterable<RegisteredPluginDomain>,
  config: UserConfig,
  root: string,
  packages: Package[],
) {
  const diagnostics: Diagnostic[] = [];

  for (const domain of registry) {
    diagnostics.push(...(await resolveDomain(domain, config, root, packages)));
  }

  return buildReport(diagnostics);
}

export async function resolveDomain(
  domain: RegisteredPluginDomain,
  config: UserConfig,
  root: string,
  packages: Package[],
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

    const report = (input: PluginReportInput): void => {
      diagnostics.push({
        ...input,
        domain: domain.domain,
        packageName: packageName_,
        packagePath: subject.package.path,
        plugin: domain.pluginName,
        ruleName: input.ruleName,
        severity,
      });
    };

    await definition.validate({
      package: { path: subject.package.path },
      policy,
      report,
      subject: subject.value,
      workspace: { root },
    });
  }

  return diagnostics;
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

function packageName(
  packageJson: Record<string, unknown>,
  packagePath: string,
) {
  const name = packageJson["name"];
  return typeof name === "string" ? name : path.basename(packagePath);
}

function validateSchema(schema: TSchema, policy: unknown, domain: string) {
  if (Check(schema, policy)) {
    return;
  }

  const errors = Errors(schema, policy);
  const first = errors[0];

  throw new TypeError(first?.message ?? `Invalid "${domain}" policy`);
}
