import { loadConfig } from "@moniq/config";
import { resolve } from "@moniq/core";
import { discoverWorkspace } from "@moniq/workspace";

import { type Format, formatDiagnostics } from "../format.js";
import { applyScriptFixes } from "../scripts.js";

export interface CheckOptions {
  fix?: boolean;
  format?: Format;
}

export async function check(options: CheckOptions): Promise<void> {
  const cwd = process.cwd();

  let config;
  try {
    config = await loadConfig(cwd);
  } catch {
    throw new Error(
      "No moniq.config file found in or above the current directory.",
    );
  }

  const packages = discoverWorkspace(cwd);
  if (packages.length === 0) {
    throw new Error("No workspace packages found.");
  }

  const diagnostics = await resolve(config, cwd, packages);

  if (options.fix) {
    await applyScriptFixes(diagnostics);
  }

  if (options.format !== "json") {
    console.log(`  🔍 Scanned ${String(packages.length)} package(s)`);
    console.log();
  }

  console.log(formatDiagnostics(diagnostics, { format: options.format }));
}
