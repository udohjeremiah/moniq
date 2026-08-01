import { describe, expect, it } from "vitest";

import { parseFilePolicy } from "./files.js";

describe("parseFilePolicy", () => {
  it("accepts a minimal policy", () => {
    const result = parseFilePolicy({ presence: "required" });
    expect(result).toEqual({ presence: "required" });
  });

  it("accepts a full policy", () => {
    const result = parseFilePolicy({
      autofix: true,
      content: "auto-install-peers=true",
      description: "Must exist.",
      exclude: ["apps/legacy"],
      include: ["*"],
      kind: "file",
      presence: "required",
      severity: "warn",
    });
    expect(result).toEqual({
      autofix: true,
      content: "auto-install-peers=true",
      description: "Must exist.",
      exclude: ["apps/legacy"],
      include: ["*"],
      kind: "file",
      presence: "required",
      severity: "warn",
    });
  });

  it("rejects invalid severity", () => {
    expect(() => parseFilePolicy({ severity: "critical" })).toThrow();
  });

  it("rejects wrong type for presence", () => {
    expect(() => parseFilePolicy({ presence: "yes" })).toThrow();
  });

  it("accepts kind symlink", () => {
    const result = parseFilePolicy({ kind: "symlink" });
    expect(result).toEqual({ kind: "symlink" });
  });

  it("rejects invalid kind", () => {
    expect(() => parseFilePolicy({ kind: "junction" })).toThrow();
  });

  it("rejects content combined with kind directory", () => {
    expect(() =>
      parseFilePolicy({ content: "x", kind: "directory" }),
    ).toThrow();
  });

  it("rejects content combined with kind symlink", () => {
    expect(() => parseFilePolicy({ content: "x", kind: "symlink" })).toThrow();
  });

  it("accepts RegExp content", () => {
    const result = parseFilePolicy({ content: /^# / });
    expect(result.content).toBeInstanceOf(RegExp);
  });

  it("rejects non-string, non-RegExp content", () => {
    expect(() => parseFilePolicy({ content: 42 })).toThrow();
  });
});
