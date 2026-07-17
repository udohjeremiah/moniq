import { cac } from "cac";

import moniqPackage from "../../moniq/package.json" with { type: "json" };
import { check } from "./commands/check.js";
import { doctor } from "./commands/doctor.js";
import { init } from "./commands/init.js";
import { type Format } from "./format.js";

const cli = cac("moniq");

cli
  .command("check", "Run policy checks")
  .option("--format <fmt>", "Output format: pretty, json, or sarif", {
    default: "pretty",
  })
  .action(async (options: Record<string, unknown>) => {
    const fmt =
      typeof options["format"] === "string"
        ? (options["format"] as Format)
        : "pretty";

    try {
      const report = await check({ fix: false, format: fmt });
      process.exitCode = report.summary.passed ? 0 : 1;
    } catch (error) {
      console.error(String(error));
      process.exitCode = 2;
    }
  });

cli
  .command("fix", "Run policy checks and apply autofixes")
  .option("--dry-run", "Preview autofixes without writing to files")
  .option("--format <fmt>", "Output format: pretty, json, or sarif", {
    default: "pretty",
  })
  .action(async (options: Record<string, unknown>) => {
    const isDryRun = options["dryRun"] === true;
    const fmt =
      typeof options["format"] === "string"
        ? (options["format"] as Format)
        : "pretty";

    try {
      const report = await check({ fix: true, format: fmt, isDryRun });
      process.exitCode = report.summary.passed ? 0 : 1;
    } catch (error) {
      console.error(String(error));
      process.exitCode = 2;
    }
  });

cli.command("doctor", "Detect configuration mistakes").action(async () => {
  await doctor();
});

cli
  .command("init", "Scaffold a moniq.config file in the current directory")
  .option(
    "--lang <type>",
    "Config language: ts, js, mjs, cjs, mts, cts (default: auto-detected)",
  )
  .action(async (options: Record<string, unknown>) => {
    const lang =
      typeof options["lang"] === "string" ? options["lang"] : undefined;
    await init({ lang, version: moniqPackage.version });
  });

cli.help();
cli.version(moniqPackage.version);
cli.parse();
