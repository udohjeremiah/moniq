import type * as childProcess from "node:child_process";

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { detectLang, generateConfig, init } from "./init.js";

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof childProcess>();
  return { ...actual, execFileSync: vi.fn() };
});

import { execFileSync } from "node:child_process";

async function createMonorepoFixture() {
  const directory = await createTemporaryDirectory();
  const { writeFile } = await import("node:fs/promises");
  await writeFile(
    path.join(directory, "package.json"),
    JSON.stringify({ name: "test", workspaces: ["packages/*"] }),
  );
  return directory;
}

function createTemporaryDirectory() {
  return mkdtemp(path.join(tmpdir(), "moniq-init-test-"));
}

beforeEach(() => {
  process.exitCode = 0;
  vi.mocked(execFileSync).mockReturnValue("{}");
});

describe("generateConfig", () => {
  it("generates the generic starter config", () => {
    const config = generateConfig();

    expect(config).toContain('".env": { kind: "file", presence: "forbidden" }');
    expect(config).toContain(
      '"README.md": { kind: "file", presence: "required" }',
    );
    expect(config).toContain('build: { presence: "required" }');
    expect(config).toContain('lint: { presence: "required" }');
  });

  it("includes defineConfig import", () => {
    const config = generateConfig();

    expect(config).toContain(
      'import { defineConfig } from "@udohjeremiah/moniq"',
    );
  });

  it("produces valid export syntax", () => {
    const config = generateConfig();

    expect(config).toMatch(/export default defineConfig/);
  });
});

describe("init", () => {
  it("creates a config file when the monorepo has no packages yet", async () => {
    const directory = await createMonorepoFixture();

    await init({ _cwd: directory, lang: "ts" });

    const { readFile } = await import("node:fs/promises");
    const content = await readFile(
      path.join(directory, "moniq.config.ts"),
      "utf8",
    );
    expect(content).toContain("defineConfig");

    await rm(directory, { recursive: true });
  });

  it("fails gracefully when no package.json exists", async () => {
    const directory = await createTemporaryDirectory();
    const { readFile } = await import("node:fs/promises");

    await init({ _cwd: directory, lang: "ts" });

    expect(process.exitCode).toBe(1);
    const configPath = path.join(directory, "moniq.config.ts");
    await expect(readFile(configPath, "utf8")).rejects.toThrow();

    await rm(directory, { recursive: true });
  });

  it("fails when not a monorepo (single package with a lock file)", async () => {
    const directory = await createTemporaryDirectory();
    const { writeFile } = await import("node:fs/promises");
    await writeFile(
      path.join(directory, "package.json"),
      JSON.stringify({ name: "test" }),
    );
    await writeFile(path.join(directory, "pnpm-lock.yaml"), "");

    await init({ _cwd: directory, lang: "ts" });

    const { readFile } = await import("node:fs/promises");
    expect(process.exitCode).toBe(1);
    const configPath = path.join(directory, "moniq.config.ts");
    await expect(readFile(configPath, "utf8")).rejects.toThrow();

    await rm(directory, { recursive: true });
  });

  it("rejects unsupported lang", async () => {
    const directory = await createMonorepoFixture();

    await init({ _cwd: directory, lang: "py" });

    const { readFile } = await import("node:fs/promises");
    expect(process.exitCode).toBe(1);
    const configPath = path.join(directory, "moniq.config.py");
    await expect(readFile(configPath, "utf8")).rejects.toThrow();

    await rm(directory, { recursive: true });
  });
});

describe("detectLang", () => {
  it("detects TypeScript when tsconfig.json exists", async () => {
    const directory = await createTemporaryDirectory();
    const { writeFile } = await import("node:fs/promises");
    await writeFile(path.join(directory, "tsconfig.json"), "{}");

    const result = await detectLang(directory, { dependencies: {} });

    expect(result).toBe("mts");

    await rm(directory, { recursive: true });
  });

  it("detects TypeScript when typescript is a dependency", async () => {
    const directory = await createTemporaryDirectory();

    const result = await detectLang(directory, {
      dependencies: { typescript: "^5.0.0" },
    });

    expect(result).toBe("mts");

    await rm(directory, { recursive: true });
  });

  it("detects TypeScript when typescript is a devDependency", async () => {
    const directory = await createTemporaryDirectory();

    const result = await detectLang(directory, {
      devDependencies: { typescript: "^5.0.0" },
    });

    expect(result).toBe("mts");

    await rm(directory, { recursive: true });
  });

  it("prefers tsconfig.json over dependency check", async () => {
    const directory = await createTemporaryDirectory();
    const { writeFile } = await import("node:fs/promises");
    await writeFile(path.join(directory, "tsconfig.json"), "{}");

    const result = await detectLang(directory, { dependencies: {} });

    expect(result).toBe("mts");

    await rm(directory, { recursive: true });
  });

  it("defaults to JavaScript ESM when no TypeScript detected", async () => {
    const directory = await createTemporaryDirectory();

    const result = await detectLang(directory, { dependencies: {} });

    expect(result).toBe("mjs");

    await rm(directory, { recursive: true });
  });
});

describe("init auto-detection", () => {
  it("auto-detects TypeScript when tsconfig.json exists", async () => {
    const directory = await createMonorepoFixture();
    const { writeFile } = await import("node:fs/promises");
    await writeFile(path.join(directory, "tsconfig.json"), "{}");

    await init({ _cwd: directory });

    const { readFile } = await import("node:fs/promises");
    const content = await readFile(
      path.join(directory, "moniq.config.mts"),
      "utf8",
    );
    expect(content).toContain("defineConfig");

    await rm(directory, { recursive: true });
  });

  it("auto-detects TypeScript when typescript is a devDependency", async () => {
    const directory = await createTemporaryDirectory();
    const { writeFile } = await import("node:fs/promises");
    await writeFile(
      path.join(directory, "package.json"),
      JSON.stringify({
        devDependencies: { typescript: "^5.0.0" },
        name: "test",
        workspaces: ["packages/*"],
      }),
    );

    await init({ _cwd: directory });

    const { readFile } = await import("node:fs/promises");
    const content = await readFile(
      path.join(directory, "moniq.config.mts"),
      "utf8",
    );
    expect(content).toContain("defineConfig");

    await rm(directory, { recursive: true });
  });

  it("defaults to JavaScript ESM when no TypeScript detected", async () => {
    const directory = await createMonorepoFixture();

    await init({ _cwd: directory });

    const { readFile } = await import("node:fs/promises");
    const content = await readFile(
      path.join(directory, "moniq.config.mjs"),
      "utf8",
    );
    expect(content).toContain("defineConfig");

    await rm(directory, { recursive: true });
  });

  it("explicit --lang overrides auto-detection", async () => {
    const directory = await createMonorepoFixture();
    const { writeFile } = await import("node:fs/promises");
    await writeFile(path.join(directory, "tsconfig.json"), "{}");

    await init({ _cwd: directory, lang: "cjs" });

    const { readFile } = await import("node:fs/promises");
    const content = await readFile(
      path.join(directory, "moniq.config.cjs"),
      "utf8",
    );
    expect(content).toContain("defineConfig");

    await rm(directory, { recursive: true });
  });
});
