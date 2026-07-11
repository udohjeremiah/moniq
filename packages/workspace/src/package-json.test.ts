import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { readPackageJson, writePackageJson } from "./package-json.js";

function createTemporaryDirectory(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), "moniq-workspace-test-"));
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
