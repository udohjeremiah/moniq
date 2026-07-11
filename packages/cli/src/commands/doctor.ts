import { type Config, loadConfig } from "@moniq/config";
import { discoverWorkspace } from "@moniq/workspace";
import { styleText } from "node:util";

interface DoctorIssue {
  message: string;
  severity: "error" | "warn";
}

export async function doctor(): Promise<void> {
  const cwd = process.cwd();
  const issues: DoctorIssue[] = [];

  // Check 1: Config file exists + valid structure
  try {
    const config: Config = await loadConfig(cwd);
    issues.push({
      message: "moniq.config file found and loadable.",
      severity: "warn",
    });

    checkScriptPolicies(config, issues);
  } catch {
    issues.push({
      message: "No moniq.config file found in or above the current directory.",
      severity: "error",
    });
  }

  // Check 2: Workspace is detectable
  try {
    const packages = discoverWorkspace(cwd);
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
        severity: "warn",
      });
    }
  } catch {
    issues.push({
      message:
        "Failed to discover workspace packages. Ensure a lock file or packageManager field is present.",
      severity: "error",
    });
  }

  // Report
  console.log();
  console.log(`  ${styleText("bold", "🏥 Configuration Doctor")}`);
  console.log();

  if (issues.length === 0) {
    console.log(
      `  ${styleText(["bold", "green"], "✅ Everything looks good!")}`,
    );
    return;
  }

  for (const issue of issues) {
    const icon = issue.severity === "error" ? "❌" : "⚠️ ";
    const label =
      issue.severity === "error"
        ? styleText(["bold", "red"], "ERROR")
        : styleText(["bold", "yellow"], "WARN");
    console.log(`  ${icon} ${label} ${issue.message}`);
  }

  const errorCount = issues.filter(
    (index) => index.severity === "error",
  ).length;
  const warningCount = issues.filter(
    (index) => index.severity === "warn",
  ).length;
  const errorText = `${String(errorCount)} error(s)`;
  const warningText = `${String(warningCount)} warning(s)`;
  const summary = styleText("dim", `Found ${errorText}, ${warningText}`);

  console.log();
  console.log(`  ${summary}`);

  if (errorCount > 0) {
    const tip = styleText(["bold", "cyan"], "💡 Tip:");
    const hint = styleText("dim", "moniq init");
    console.log();
    console.log(`  ${tip} Run ${hint} to scaffold a starter configuration.`);
  }
}

function checkScriptPolicies(config: Config, issues: DoctorIssue[]): void {
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
