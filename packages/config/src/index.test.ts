import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { ConfigNotFoundError, defineConfig, loadConfig } from "./index.js";

async function createSubdirectory(parent: string, sub: string) {
  const { mkdir } = await import("node:fs/promises");
  await mkdir(path.join(parent, sub), { recursive: true });
}

function createTemporaryDirectory() {
  return mkdtemp(path.join(tmpdir(), "moniq-config-test-"));
}

async function writeConfig(
  directory: string,
  content: string,
  extension = ".ts",
) {
  const { writeFile } = await import("node:fs/promises");
  const configPath = path.join(directory, `moniq.config${extension}`);
  await writeFile(configPath, content);
  return configPath;
}

describe("defineConfig", () => {
  it("returns the same config object", () => {
    const config = { plugins: [] as never[] };
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
        '    build: { presence: "required" },',
        '    lint: { command: "eslint .", presence: "required" },',
        "  },",
        "};",
      ].join("\n"),
    );

    const config = await loadConfig(directory);

    expect(config).toEqual({
      scripts: {
        build: { presence: "required" },
        lint: { command: "eslint .", presence: "required" },
      },
    });
    await rm(directory, { recursive: true });
  });

  it("does not walk up directories — config must be in the given directory", async () => {
    const directory = await createTemporaryDirectory();
    const subdirectory = path.join(directory, "packages", "my-app");
    await createSubdirectory(directory, "packages/my-app");
    await writeConfig(
      directory,
      [
        "export default {",
        "  scripts: {",
        '    build: { presence: "required" },',
        "  },",
        "};",
      ].join("\n"),
    );

    await expect(loadConfig(subdirectory)).rejects.toThrow(ConfigNotFoundError);
    await rm(directory, { recursive: true });
  });

  it("loads a .js config file", async () => {
    const directory = await createTemporaryDirectory();
    await writeConfig(
      directory,
      [
        "export default {",
        "  scripts: {",
        '    dev: { command: "vitest" },',
        "  },",
        "};",
      ].join("\n"),
      ".js",
    );

    const config = await loadConfig(directory);

    expect(config).toEqual({
      scripts: {
        dev: { command: "vitest" },
      },
    });
    await rm(directory, { recursive: true });
  });

  it("loads a .mjs config file", async () => {
    const directory = await createTemporaryDirectory();
    await writeConfig(
      directory,
      [
        "export default {",
        "  scripts: {",
        '    dev: { command: "vitest" },',
        "  },",
        "};",
      ].join("\n"),
      ".mjs",
    );

    const config = await loadConfig(directory);

    expect(config).toEqual({
      scripts: {
        dev: { command: "vitest" },
      },
    });
    await rm(directory, { recursive: true });
  });

  it("throws when more than one config file exists", async () => {
    const directory = await createTemporaryDirectory();
    await writeConfig(directory, "export default {};", ".ts");
    await writeConfig(directory, "export default {};", ".js");

    await expect(loadConfig(directory)).rejects.toThrow(
      /Multiple moniq\.config\.\* files found/,
    );
    await rm(directory, { recursive: true });
  });

  it("throws ConfigNotFoundError when no config file is found", async () => {
    const directory = await createTemporaryDirectory();

    await expect(loadConfig(directory)).rejects.toThrow(ConfigNotFoundError);
    await expect(loadConfig(directory)).rejects.toThrow(
      /No Moniq configuration found/,
    );
    await rm(directory, { recursive: true });
  });

  it("loads a config file with the files domain", async () => {
    const directory = await createTemporaryDirectory();
    await writeConfig(
      directory,
      [
        "export default {",
        "  files: {",
        '    ".env": { presence: "forbidden" },',
        '    "README.md": { presence: "required" },',
        "  },",
        "};",
      ].join("\n"),
    );

    const config = await loadConfig(directory);

    expect(config).toEqual({
      files: {
        ".env": { presence: "forbidden" },
        "README.md": { presence: "required" },
      },
    });
    await rm(directory, { recursive: true });
  });

  it("loads a config with an arbitrary plugin domain untouched", async () => {
    const directory = await createTemporaryDirectory();
    await writeConfig(
      directory,
      [
        "export default {",
        '  docker: { image: "node", tag: "24" },',
        "};",
      ].join("\n"),
    );

    const config = await loadConfig(directory);

    expect(config).toEqual({
      docker: { image: "node", tag: "24" },
    });
    await rm(directory, { recursive: true });
  });

  it("rejects a config export that is not an object", async () => {
    const directory = await createTemporaryDirectory();
    await writeConfig(directory, "export default 42;");

    await expect(loadConfig(directory)).rejects.toThrow();
    await rm(directory, { recursive: true });
  });

  it("rejects a config where plugins is not an array", async () => {
    const directory = await createTemporaryDirectory();
    await writeConfig(directory, 'export default { plugins: "npm" };');

    await expect(loadConfig(directory)).rejects.toThrow();
    await rm(directory, { recursive: true });
  });

  it("accepts a config with a plugins array of plugin objects", async () => {
    const directory = await createTemporaryDirectory();
    await writeConfig(
      directory,
      [
        "export default {",
        '  plugins: [{ name: "package-metadata", policy: {} }],',
        "};",
      ].join("\n"),
    );

    const config = await loadConfig(directory);

    expect(config).toEqual({
      plugins: [{ name: "package-metadata", policy: {} }],
    });
    await rm(directory, { recursive: true });
  });
});
