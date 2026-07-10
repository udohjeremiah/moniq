/** Shape of a parsed `package.json` file. */
export type PackageJson = Record<string, unknown>;

/**
 * Returns the command string for a given npm script.
 *
 * @param packageJson - Parsed `package.json` object.
 * @param name - Script name (e.g. `"build"`).
 * @returns The script command, or `undefined` if it does not exist.
 */
export function getScript(
  packageJson: PackageJson,
  name: string,
): string | undefined {
  const scripts = packageJson["scripts"];
  if (typeof scripts !== "object" || scripts === null) {
    return undefined;
  }
  const record = scripts as Record<string, unknown>;
  const value = Object.entries(record).find(([k]) => k === name)?.[1];
  return typeof value === "string" ? value : undefined;
}

/**
 * Reads and parses a `package.json` file from disk.
 *
 * @param path - Path to the `package.json` file.
 * @returns The parsed package.json object.
 */
export async function readPackageJson(path: string): Promise<PackageJson> {
  const { readFile } = await import("node:fs/promises");
  const content = await readFile(path, "utf8");
  return JSON.parse(content) as PackageJson;
}

/**
 * Sets a script command in a package.json object.
 *
 * If the `scripts` field does not exist, it is created.
 * If the script already exists, it is overwritten.
 *
 * @param packageJson - The package.json object to mutate.
 * @param name - Script name (e.g. `"build"`).
 * @param command - Command string (e.g. `"tsdown"`).
 */
export function setScript(
  packageJson: PackageJson,
  name: string,
  command: string,
): void {
  let scripts = packageJson["scripts"];
  if (typeof scripts !== "object" || scripts === null) {
    scripts = {};
    packageJson["scripts"] = scripts;
  }
  Object.assign(scripts as Record<string, unknown>, { [name]: command });
}

/**
 * Writes a `package.json` object to disk with standard formatting
 * (2-space indent, trailing newline).
 *
 * @param filePath - Destination path for the file.
 * @param data - Package.json object to write.
 */
export async function writePackageJson(
  filePath: string,
  data: PackageJson,
): Promise<void> {
  const { writeFile } = await import("node:fs/promises");
  const content = `${JSON.stringify(data, undefined, 2)}\n`;
  await writeFile(filePath, content, "utf8");
}
