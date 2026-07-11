import { describe, expect, it } from "vitest";

import { getScript, setScript } from "./scripts.js";

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
