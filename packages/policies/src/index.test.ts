import { describe, expect, it } from "vitest";

import { ScriptPolicySchema } from "./scripts.js";

const isValid = (): boolean => true;

describe("ScriptPolicySchema", () => {
  it("accepts a minimal policy", () => {
    const result = ScriptPolicySchema.parse({ required: true });
    expect(result).toEqual({ required: true });
  });

  it("accepts a full policy", () => {
    const result = ScriptPolicySchema.parse({
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
    expect(() => ScriptPolicySchema.parse({ severity: "critical" })).toThrow();
  });

  it("rejects wrong type for a boolean field", () => {
    expect(() => ScriptPolicySchema.parse({ required: "yes" })).toThrow();
  });

  it("accepts RegExp command", () => {
    const result = ScriptPolicySchema.parse({
      command: /^eslint\b/,
    });
    expect(result.command).toBeInstanceOf(RegExp);
  });

  it("accepts function command", () => {
    const result = ScriptPolicySchema.parse({
      command: isValid,
    });
    expect(result.command).toBe(isValid);
  });
});
