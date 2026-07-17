import type { Diagnostic, Report } from "@moniq/core";

import type { Formatter } from "./types.js";

interface SarifArtifact {
  length: number;
  location: { uri: string; uriBaseId?: string };
  roles?: string[];
}

interface SarifArtifactChange {
  artifactLocation: {
    index: number;
    uri: string;
    uriBaseId?: string;
  };
  replacements: SarifReplacement[];
}

interface SarifFix {
  artifactChanges: SarifArtifactChange[];
  description: { text: string };
}

interface SarifLocation {
  physicalLocation: {
    artifactLocation: {
      index: number;
      uri: string;
      uriBaseId?: string;
    };
    region?: {
      startColumn?: number;
      startLine?: number;
    };
  };
}

interface SarifLog {
  $schema: string;
  runs: SarifRun[];
  version: "2.1.0";
}

interface SarifReplacement {
  deletedRegion: {
    endColumn: number;
    endLine: number;
    startColumn: number;
    startLine: number;
  };
  insertedContent: { text: string };
}

interface SarifResult {
  fixes?: SarifFix[];
  kind: "fail";
  level: "error" | "note" | "warning";
  locations?: SarifLocation[];
  message: { text: string };
  properties?: Record<string, unknown>;
  ruleId: string;
  ruleIndex: number;
}

interface SarifRule {
  fullDescription?: { text: string };
  id: string;
  name?: string;
  properties?: Record<string, unknown>;
  shortDescription?: { text: string };
}

interface SarifRun {
  artifacts?: SarifArtifact[];
  results: SarifResult[];
  tool: {
    driver: {
      informationUri?: string;
      name: string;
      rules?: SarifRule[];
    };
  };
}

export const sarifFormatter: Formatter = {
  format(report) {
    const sarifLog = buildSarifLog(report);
    return `${JSON.stringify(sarifLog, undefined, 2)}\n`;
  },
};

function buildResult(
  d: Diagnostic,
  rules: SarifRule[],
  artifacts: SarifArtifact[],
) {
  const ruleIndex = rules.findIndex((r) => r.id === d.ruleId);
  const artifactIndex = artifacts.findIndex(
    (a) => a.location.uri === d.packagePath,
  );

  const result: SarifResult = {
    kind: "fail",
    level: toSarifLevel(d.severity),
    message: { text: d.message },
    properties: {
      packageName: d.packageName,
      ...(d.scriptName && { scriptName: d.scriptName }),
    },
    ruleId: d.ruleId,
    ruleIndex: Math.max(ruleIndex, 0),
  };

  const locations: SarifLocation[] = [];

  const location: SarifLocation = {
    physicalLocation: {
      artifactLocation: {
        index: Math.max(artifactIndex, 0),
        uri: d.packagePath,
        uriBaseId: "ROOTPATH",
      },
    },
  };

  if (d.line !== undefined) {
    location.physicalLocation.region = {
      startLine: d.line,
      ...(d.column !== undefined && { startColumn: d.column }),
    };
  }

  locations.push(location);
  result.locations = locations;

  if (d.fix) {
    result.fixes = [
      {
        artifactChanges: [
          {
            artifactLocation: {
              index: Math.max(artifactIndex, 0),
              uri: d.packagePath,
              uriBaseId: "ROOTPATH",
            },
            replacements: [],
          },
        ],
        description: { text: d.fix },
      },
    ];
  }

  if (d.metadata) {
    result.properties = { ...result.properties, ...d.metadata };
  }

  return result;
}

function buildResults(
  diagnostics: Diagnostic[],
  rules: SarifRule[],
  artifacts: SarifArtifact[],
) {
  return diagnostics.map((d) => buildResult(d, rules, artifacts));
}

function buildSarifLog(report: Report): SarifLog {
  const rules = deduplicateRules(report.results);
  const artifacts = collectArtifacts(report.results);
  const results = buildResults(report.results, rules, artifacts);

  return {
    $schema:
      "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
    runs: [
      {
        artifacts: artifacts.length > 0 ? artifacts : undefined,
        results,
        tool: {
          driver: {
            informationUri: "https://github.com/udohjeremiah/moniq",
            name: report.tool.name,
            rules: rules.length > 0 ? rules : undefined,
          },
        },
      },
    ],
    version: "2.1.0",
  };
}

function collectArtifacts(diagnostics: Diagnostic[]): SarifArtifact[] {
  const seen = new Map<string, SarifArtifact>();

  for (const d of diagnostics) {
    if (!seen.has(d.packagePath)) {
      seen.set(d.packagePath, {
        length: -1,
        location: { uri: d.packagePath, uriBaseId: "ROOTPATH" },
        roles: ["application"],
      });
    }
  }

  // eslint-disable-next-line unicorn/prefer-spread
  return Array.from(seen.values());
}

function deduplicateRules(diagnostics: Diagnostic[]) {
  const seen = new Map<string, SarifRule>();

  for (const d of diagnostics) {
    if (seen.has(d.ruleId)) {
      continue;
    }

    const rule: SarifRule = {
      fullDescription: { text: d.message },
      id: d.ruleId,
      name: d.ruleName,
      properties: {
        domain: d.domain,
        ...(d.plugin && { plugin: d.plugin }),
      },
      shortDescription: { text: d.message },
    };
    seen.set(d.ruleId, rule);
  }

  // eslint-disable-next-line unicorn/prefer-spread
  return Array.from(seen.values());
}

function toSarifLevel(severity: Diagnostic["severity"]) {
  if (severity === "error") return "error";
  if (severity === "warn") return "warning";
  return "note";
}
