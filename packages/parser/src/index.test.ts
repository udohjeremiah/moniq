import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  getScript,
  readPackageJson,
  setScript,
  writePackageJson,
} from "./index.js";

function createTemporaryDirectory(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), "moniq-parser-test-"));
}

describe("readPackageJson", () => {
  it("reads and parses a package.json file", async () => {
    const directory = await createTemporaryDirectory();
    const filePath = path.join(directory, "package.json");
    await writePackageJson(filePath, { name: "test" });

    const result = await readPackageJson(filePath);

    expect(result).toEqual({ name: "test" });
    await rm(directory, { recursive: true });
  });

  it("throws on invalid JSON", async () => {
    const directory = await createTemporaryDirectory();
    const filePath = path.join(directory, "package.json");
    const { writeFile } = await import("node:fs/promises");
    await writeFile(filePath, "not-json");

    await expect(readPackageJson(filePath)).rejects.toThrow();
    await rm(directory, { recursive: true });
  });

  it("throws on missing file", async () => {
    await expect(
      readPackageJson("/nonexistent/package.json"),
    ).rejects.toThrow();
  });
});

describe("writePackageJson", () => {
  it("writes package.json with 2-space indent and trailing newline", async () => {
    const directory = await createTemporaryDirectory();
    const filePath = path.join(directory, "package.json");
    const data = { name: "test", version: "1.0.0" };

    await writePackageJson(filePath, data);

    const result = await readPackageJson(filePath);
    expect(result).toEqual(data);
    await rm(directory, { recursive: true });
  });
});

describe("getScript", () => {
  it("returns the script command when it exists", () => {
    const result = getScript({ scripts: { build: "tsup" } }, "build");

    expect(result).toBe("tsup");
  });

  it("returns undefined when the script does not exist", () => {
    const result = getScript({ scripts: { build: "tsup" } }, "test");

    expect(result).toBeUndefined();
  });

  it("returns undefined when there are no scripts", () => {
    const result = getScript({ name: "test" }, "build");

    expect(result).toBeUndefined();
  });

  it("returns undefined when scripts is not an object", () => {
    const result = getScript({ scripts: "not-an-object" }, "build");

    expect(result).toBeUndefined();
  });
});

describe("setScript", () => {
  it("sets a script on an existing scripts object", () => {
    const packageJson = { scripts: { build: "tsup" } };

    setScript(packageJson, "test", "vitest run");

    expect(packageJson.scripts).toEqual({
      build: "tsup",
      test: "vitest run",
    });
  });

  it("creates scripts object when it does not exist", () => {
    const packageJson: Record<string, unknown> = { name: "test" };

    setScript(packageJson, "build", "tsup");

    expect(packageJson["scripts"]).toEqual({ build: "tsup" });
  });

  it("overwrites an existing script", () => {
    const packageJson = { scripts: { build: "tsup" } };

    setScript(packageJson, "build", "tsdown");

    expect(packageJson.scripts).toEqual({ build: "tsdown" });
  });
});
