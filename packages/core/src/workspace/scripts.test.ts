import { describe, expect, it } from "vitest";

import type { PackageJson } from "./package-json.js";

import { getScript, setScript } from "./scripts.js";

describe("getScript", () => {
  it("returns the script command when present", () => {
    const packageJson: PackageJson = { scripts: { build: "tsc" } };

    expect(getScript(packageJson, "build")).toBe("tsc");
  });

  it("returns undefined for a missing script", () => {
    const packageJson: PackageJson = { scripts: { build: "tsc" } };

    expect(getScript(packageJson, "test")).toBeUndefined();
  });

  it("returns undefined when scripts is not an object", () => {
    expect(getScript({ scripts: "none" }, "build")).toBeUndefined();
    expect(getScript({}, "build")).toBeUndefined();
  });

  it("returns undefined when the script value is not a string", () => {
    const packageJson: PackageJson = { scripts: { build: 42 } };

    expect(getScript(packageJson, "build")).toBeUndefined();
  });
});

describe("setScript", () => {
  it("sets a script command in an existing scripts object", () => {
    const packageJson: PackageJson = { scripts: { build: "tsc" } };

    setScript(packageJson, "lint", "eslint .");

    expect(packageJson["scripts"]).toEqual({ build: "tsc", lint: "eslint ." });
  });

  it("creates a scripts object when absent", () => {
    const packageJson: PackageJson = { name: "core" };

    setScript(packageJson, "build", "tsc");

    expect(packageJson["scripts"]).toEqual({ build: "tsc" });
  });

  it("replaces a script with the same name", () => {
    const packageJson: PackageJson = { scripts: { build: "tsc" } };

    setScript(packageJson, "build", "tsc --noEmit");

    expect(packageJson["scripts"]).toEqual({ build: "tsc --noEmit" });
  });
});
