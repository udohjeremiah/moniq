import { describe, expect, it } from "vitest";

import { parseScriptPolicy } from "./scripts.js";

const isValid = (): boolean => true;

describe("parseScriptPolicy", () => {
  it("accepts a minimal policy", () => {
    const result = parseScriptPolicy({ required: true });
    expect(result).toEqual({ required: true });
  });

  it("accepts a full policy", () => {
    const result = parseScriptPolicy({
      allowCustomCommands: ["apps/*"],
      autofix: true,
      command: "eslint .",
      description: "Must use ESLint.",
      exclude: ["apps/legacy"],
      include: ["*"],
      required: true,
      severity: "warn",
    });
    expect(result).toEqual({
      allowCustomCommands: ["apps/*"],
      autofix: true,
      command: "eslint .",
      description: "Must use ESLint.",
      exclude: ["apps/legacy"],
      include: ["*"],
      required: true,
      severity: "warn",
    });
  });

  it("rejects invalid severity", () => {
    expect(() => parseScriptPolicy({ severity: "critical" })).toThrow();
  });

  it("rejects wrong type for a boolean field", () => {
    expect(() => parseScriptPolicy({ required: "yes" })).toThrow();
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
