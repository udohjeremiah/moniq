import type * as moniqCore from "@moniq/core";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@moniq/core", async (importOriginal) => {
  const actual = await importOriginal<typeof moniqCore>();
  return {
    ...actual,
    discoverWorkspace: vi.fn(),
    findWorkspaceRoot: vi.fn(),
    loadConfig: vi.fn(),
  };
});

import { discoverWorkspace, findWorkspaceRoot, loadConfig } from "@moniq/core";

import { doctor } from "./doctor.js";

beforeEach(() => {
  vi.mocked(findWorkspaceRoot).mockResolvedValue("/repo");
  vi.mocked(discoverWorkspace).mockResolvedValue([{ path: "/repo" }]);
  vi.mocked(loadConfig).mockResolvedValue({ files: {} });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("doctor", () => {
  it("reports a healthy configuration", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => void 0);

    await doctor();

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Everything looks good!"),
    );
  });

  it("reports an error when the workspace root cannot be detected", async () => {
    vi.mocked(findWorkspaceRoot).mockRejectedValue(new Error("not found"));
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => void 0);

    await doctor();

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Could not detect workspace root"),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Found 1 error(s), 0 warning(s)"),
    );
  });

  it("warns when no workspace packages are detected", async () => {
    vi.mocked(discoverWorkspace).mockResolvedValue([]);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => void 0);

    await doctor();

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("No workspace packages detected"),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Found 0 error(s), 1 warning(s)"),
    );
  });

  it("reports an error when the config cannot be loaded", async () => {
    vi.mocked(loadConfig).mockRejectedValue(new Error("syntax error"));
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => void 0);

    await doctor();

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to load moniq.config.*"),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Found 1 error(s), 0 warning(s)"),
    );
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("moniq init"));
  });
});
