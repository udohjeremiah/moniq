import { type PackageJson } from "./scripts.js";

export async function readPackageJson(filePath: string): Promise<PackageJson> {
  const { readFile } = await import("node:fs/promises");
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as PackageJson;
}

export async function writePackageJson(
  filePath: string,
  data: PackageJson,
): Promise<void> {
  const { writeFile } = await import("node:fs/promises");
  const content = `${JSON.stringify(data, undefined, 2)}\n`;
  await writeFile(filePath, content, "utf8");
}
