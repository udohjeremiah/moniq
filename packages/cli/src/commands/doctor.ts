import { type Config, loadConfig } from "@moniq/config";
import { discoverWorkspace } from "@moniq/workspace";
import { styleText } from "node:util";

interface DoctorIssue {
  message: string;
  severity: "error" | "info" | "warn";
}

export async function doctor(): Promise<void> {
  const cwd = process.cwd();
  const issues: DoctorIssue[] = [];

  console.log();
  console.log(`  ${styleText("bold", "Configuration Doctor")}`);

  // Check 1: Workspace is detectable
  try {
    const packages = await discoverWorkspace(cwd);
    const packageCount = packages.length;
    if (packageCount === 0) {
      issues.push({
        message:
          "No workspace packages detected. Check your workspace configuration.",
        severity: "warn",
      });
    } else {
      issues.push({
        message: `Detected ${String(packageCount)} workspace package(s).`,
        severity: "info",
      });
    }
  } catch {
    issues.push({
      message:
        "Failed to discover workspace packages. Ensure a lock file or packageManager field is present.",
      severity: "error",
    });
  }

  // Check 2: Config file exists + valid structure
  try {
    const config: Config = await loadConfig(cwd);
    issues.push({
      message: "moniq.config file found and loadable.",
      severity: "info",
    });

    checkScriptPolicies(config, issues);
  } catch (error) {
    issues.push({
      message: `Failed to load moniq.config: ${String(error)}`,
      severity: "error",
    });
  }

  console.log();

  issues.sort((a, b) => severityIndex(a.severity) - severityIndex(b.severity));

  const hasIssues = issues.some((issue) => issue.severity !== "info");

  if (!hasIssues) {
    console.log(
      `  ${styleText(["bold", "green"], "✔ Everything looks good!")}`,
    );
    return;
  }

  for (const issue of issues) {
    console.log(formatIssue(issue));
  }

  const errorCount = issues.filter(
    (issue) => issue.severity === "error",
  ).length;
  const warningCount = issues.filter(
    (issue) => issue.severity === "warn",
  ).length;
  const errorText = `${String(errorCount)} error(s)`;
  const warningText = `${String(warningCount)} warning(s)`;
  const summary = styleText("dim", `Found ${errorText}, ${warningText}`);

  console.log();
  console.log(`  ${summary}`);

  if (errorCount > 0) {
    const tip = styleText(["bold", "cyan"], "Tip:");
    const hint = styleText("dim", "moniq init");
    console.log();
    console.log(`  ${tip} Run ${hint} to scaffold a starter configuration.`);
  }
}

function checkScriptPolicies(config: Config, issues: DoctorIssue[]) {
  const scripts = config.scripts;
  if (!scripts) return;

  for (const [name, policyOrArray] of Object.entries(scripts)) {
    const policies = Array.isArray(policyOrArray)
      ? policyOrArray
      : [policyOrArray];
    for (const policy of policies) {
      const sev = policy.severity;
      if (sev !== undefined && !["error", "off", "warn"].includes(sev)) {
        issues.push({
          message: `Script policy "${name}" has invalid severity "${sev}".`,
          severity: "error",
        });
      }
    }
  }
}

function formatIssue(issue: DoctorIssue): string {
  let icon: string;
  let label: string;
  let iconColor: "cyan" | "dim";

  if (issue.severity === "error") {
    icon = "✘";
    label = styleText(["bold", "red"], "ERROR");
    iconColor = "dim";
  } else if (issue.severity === "warn") {
    icon = "⚠";
    label = styleText(["bold", "yellow"], "WARN");
    iconColor = "dim";
  } else {
    icon = "ℹ";
    label = styleText(["bold", "cyan"], "INFO");
    iconColor = "cyan";
  }

  return `  ${styleText(iconColor, icon)} ${label} ${issue.message}`;
}

function severityIndex(severity: DoctorIssue["severity"]): number {
  if (severity === "error") return 2;
  if (severity === "warn") return 1;
  return 0;
}
