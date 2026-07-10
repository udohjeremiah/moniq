import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { defineConfig, loadConfig } from "./index.js";

async function createSubdirectory(parent: string, sub: string): Promise<void> {
  const { mkdir } = await import("node:fs/promises");
  await mkdir(path.join(parent, sub), { recursive: true });
}

function createTemporaryDirectory(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), "moniq-config-test-"));
}

async function writeConfig(
  directory: string,
  content: string,
): Promise<string> {
  const { writeFile } = await import("node:fs/promises");
  const configPath = path.join(directory, "moniq.config.ts");
  await writeFile(configPath, content);
  return configPath;
}

describe("defineConfig", () => {
  it("returns the same config object", () => {
    const config = { scripts: { build: { required: true } } };
    const result = defineConfig(config);
    expect(result).toBe(config);
  });
});

describe("loadConfig", () => {
  it("loads a config file from the current directory", async () => {
    const directory = await createTemporaryDirectory();
    await writeConfig(
      directory,
      [
        "export default {",
        "  scripts: {",
        "    build: { required: true },",
        '    lint: { command: "eslint .", required: true },',
        "  },",
        "};",
      ].join("\n"),
    );

    const config = await loadConfig(directory);

    expect(config).toEqual({
      scripts: {
        build: { required: true },
        lint: { command: "eslint .", required: true },
      },
    });
    await rm(directory, { recursive: true });
  });

  it("walks up directories to find a config file", async () => {
    const directory = await createTemporaryDirectory();
    const subdirectory = path.join(directory, "packages", "my-app");
    await createSubdirectory(directory, "packages/my-app");
    await writeConfig(
      directory,
      [
        "export default {",
        "  scripts: {",
        "    build: { required: true },",
        "  },",
        "};",
      ].join("\n"),
    );

    const config = await loadConfig(subdirectory);

    expect(config).toEqual({
      scripts: {
        build: { required: true },
      },
    });
    await rm(directory, { recursive: true });
  });

  it("throws when no config file is found", async () => {
    const directory = await createTemporaryDirectory();

    await expect(loadConfig(directory)).rejects.toThrow(
      /No moniq\.config\.ts found/,
    );
    await rm(directory, { recursive: true });
  });

  it("throws on invalid severity value", async () => {
    const directory = await createTemporaryDirectory();
    await writeConfig(
      directory,
      [
        "export default {",
        "  scripts: {",
        '    build: { severity: "critical" },',
        "  },",
        "};",
      ].join("\n"),
    );

    await expect(loadConfig(directory)).rejects.toThrow();
    await rm(directory, { recursive: true });
  });

  it("throws on wrong type for a boolean field", async () => {
    const directory = await createTemporaryDirectory();
    await writeConfig(
      directory,
      [
        "export default {",
        "  scripts: {",
        '    build: { required: "yes" },',
        "  },",
        "};",
      ].join("\n"),
    );

    await expect(loadConfig(directory)).rejects.toThrow();
    await rm(directory, { recursive: true });
  });
});
