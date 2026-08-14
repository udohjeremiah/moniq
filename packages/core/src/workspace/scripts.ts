import type { PackageJson } from "./package-json.js";

export function getScript(packageJson: PackageJson, name: string) {
  const scripts = packageJson["scripts"];
  if (typeof scripts !== "object" || scripts === null) {
    return;
  }
  const record = scripts as Record<string, unknown>;
  const value = new Map(Object.entries(record)).get(name);
  return typeof value === "string" ? value : undefined;
}

export function setScript(
  packageJson: PackageJson,
  name: string,
  command: string,
) {
  let scripts = packageJson["scripts"];
  if (typeof scripts !== "object" || scripts === null) {
    scripts = {};
    packageJson["scripts"] = scripts;
  }
  Object.assign(scripts as Record<string, unknown>, { [name]: command });
}
