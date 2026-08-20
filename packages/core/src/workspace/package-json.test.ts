import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { readPackageJson, writePackageJson } from "./package-json.js";

async function createTemporaryDirectory() {
  return mkdtemp(path.join(tmpdir(), "moniq-package-json-test-"));
}

describe("readPackageJson", () => {
  it("parses the package.json contents", async () => {
    const directory = await createTemporaryDirectory();
    const filePath = path.join(directory, "package.json");
    const { writeFile } = await import("node:fs/promises");
    await writeFile(
      filePath,
      JSON.stringify({ name: "core", scripts: { build: "tsc" } }),
    );

    await expect(readPackageJson(filePath)).resolves.toEqual({
      name: "core",
      scripts: { build: "tsc" },
    });

    await rm(directory, { recursive: true });
  });

  it("rejects when the file does not exist", async () => {
    const directory = await createTemporaryDirectory();

    await expect(
      readPackageJson(path.join(directory, "package.json")),
    ).rejects.toThrow();

    await rm(directory, { recursive: true });
  });
});

describe("writePackageJson", () => {
  it("writes pretty-printed JSON with a trailing newline", async () => {
    const directory = await createTemporaryDirectory();
    const filePath = path.join(directory, "package.json");

    await writePackageJson(filePath, { name: "core" });

    const { readFile } = await import("node:fs/promises");
    const content = await readFile(filePath, "utf8");
    expect(content).toBe('{\n  "name": "core"\n}\n');

    await rm(directory, { recursive: true });
  });

  it("round-trips through readPackageJson", async () => {
    const directory = await createTemporaryDirectory();
    const filePath = path.join(directory, "package.json");
    const data = { name: "core", scripts: { build: "tsc" } };

    await writePackageJson(filePath, data);

    await expect(readPackageJson(filePath)).resolves.toEqual(data);

    await rm(directory, { recursive: true });
  });
});
