import { describe, expect, it } from "vitest";

import { parseScriptPolicy } from "./scripts.js";

const isValid = () => true;

describe("parseScriptPolicy", () => {
  it("accepts a minimal policy", () => {
    const result = parseScriptPolicy({ presence: "required" });
    expect(result).toEqual({ presence: "required" });
  });

  it("accepts a full policy", () => {
    const result = parseScriptPolicy({
      allowCustomCommands: ["apps/*"],
      autofix: true,
      command: "eslint .",
      description: "Must use ESLint.",
      exclude: ["apps/legacy"],
      include: ["*"],
      presence: "required",
      severity: "warn",
    });
    expect(result).toEqual({
      allowCustomCommands: ["apps/*"],
      autofix: true,
      command: "eslint .",
      description: "Must use ESLint.",
      exclude: ["apps/legacy"],
      include: ["*"],
      presence: "required",
      severity: "warn",
    });
  });

  it("rejects invalid severity", () => {
    expect(() => parseScriptPolicy({ severity: "critical" })).toThrow();
  });

  it("rejects wrong type for presence", () => {
    expect(() => parseScriptPolicy({ presence: "yes" })).toThrow();
  });

  it("accepts RegExp command", () => {
    const result = parseScriptPolicy({
      command: /^eslint\b/,
    });
    expect(result.command).toBeInstanceOf(RegExp);
  });

  it("accepts function command", () => {
    const result = parseScriptPolicy({
      command: isValid,
    });
    expect(result.command).toBe(isValid);
  });
});
