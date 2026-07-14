import { loadConfig } from "@moniq/config";
import { discoverWorkspace } from "@moniq/workspace";
import { styleText } from "node:util";

interface DoctorIssue {
  message: string;
  severity: "error" | "info" | "warn";
}

export async function doctor(): Promise<void> {
  const cwd = process.cwd();
  const issues: DoctorIssue[] = [];

  console.log(styleText("bold", "Configuration Doctor"));

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
    await loadConfig(cwd);
    issues.push({
      message: "moniq.config file found and loadable.",
      severity: "info",
    });
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
    console.log(styleText(["bold", "green"], "✔ Everything looks good!"));
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
  console.log(summary);

  if (errorCount > 0) {
    const tip = styleText(["bold", "cyan"], "Tip:");
    const hint = styleText("dim", "moniq init");
    console.log();
    console.log(`${tip} Run ${hint} to scaffold a starter configuration.`);
  }
}

function formatIssue(issue: DoctorIssue) {
  if (issue.severity === "error") {
    return `  ${styleText(["bold", "red"], "✘")} ${styleText(["bold", "red"], "ERROR")} ${issue.message}`;
  }
  if (issue.severity === "warn") {
    return `  ${styleText(["bold", "yellow"], "⚠")} ${styleText(["bold", "yellow"], "WARN")} ${issue.message}`;
  }
  return `  ${styleText("cyan", "ℹ")} ${styleText(["bold", "cyan"], "INFO")} ${issue.message}`;
}

function severityIndex(severity: DoctorIssue["severity"]) {
  if (severity === "error") return 2;
  if (severity === "warn") return 1;
  return 0;
}
