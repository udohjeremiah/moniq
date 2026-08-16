import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";

import {
  createRegistry,
  definePlugin,
  type PluginPolicyDefinition,
  type Policy,
  type PolicySubject,
  resolveAll,
  type UserConfig,
} from "../index.js";

interface ContentPolicy extends Policy {
  autofix?: boolean;
  content?: string;
}

interface ContentSubject {
  target: string;
}

type TestConfig = Record<string, unknown> & UserConfig;

function contentPlugin() {
  const schema = Type.Object({
    autofix: Type.Optional(Type.Boolean()),
    content: Type.Optional(Type.String()),
  });

  return definePlugin({
    name: "content",
    policy: {
      schema,

      subjects(config, root, packages): PolicySubject[] {
        const policy = config as ContentPolicy;
        return packages.map((package_) => ({
          package: package_,
          policies: [policy],
          relativePath: path.relative(root, package_.path),
          value: { target: path.join(package_.path, "expected.txt") },
        }));
      },

      async validate({ policy, report, subject }) {
        const { target } = subject as ContentSubject;
        const { readFile } = await import("node:fs/promises");
        let actual: string | undefined;
        try {
          actual = await readFile(target, "utf8");
        } catch {
          actual = undefined;
        }

        if (policy.content !== undefined && actual !== policy.content) {
          report({
            fix:
              policy.content === "$THROW$"
                ? () => {
                    throw new Error("fixture fix failure");
                  }
                : async () => {
                    const { writeFile } = await import("node:fs/promises");
                    await writeFile(
                      target,
                      policy.content === "$WRONG$"
                        ? "still wrong"
                        : (policy.content ?? ""),
                      "utf8",
                    );
                  },
            message: `Expected "${policy.content}" but found ${String(actual)}`,
            ruleId: "content/mismatch",
            ruleName: "Content mismatch",
          });
        }
      },
    } satisfies PluginPolicyDefinition<typeof schema>,
  });
}

async function createFixture(root: string, packages: string[]) {
  const { mkdir, writeFile } = await import("node:fs/promises");
  for (const relative of packages) {
    const directory = path.join(root, relative);
    await mkdir(directory, { recursive: true });
    await writeFile(
      path.join(directory, "package.json"),
      `${JSON.stringify({ name: relative === "." ? "root" : relative }, undefined, 2)}\n`,
    );
  }
}

async function createTemporaryDirectory() {
  return mkdtemp(path.join(tmpdir(), "moniq-fix-test-"));
}

async function readContent(pathname: string) {
  const { readFile } = await import("node:fs/promises");
  try {
    return await readFile(pathname, "utf8");
  } catch {
    return;
  }
}

function rootPack(root: string, ...relativePaths: string[]) {
  return relativePaths.map((relative) => ({ path: path.join(root, relative) }));
}

async function run(
  config: TestConfig,
  root: string,
  packages: { path: string }[],
  options?: Parameters<typeof resolveAll>[4],
) {
  const registry = createRegistry(config);
  return resolveAll(registry.domains, config, root, packages, options);
}

async function writeTarget(pathname: string, contents: string) {
  const { writeFile } = await import("node:fs/promises");
  await writeFile(pathname, contents, "utf8");
}

describe("plugin fixes", () => {
  it("applies the plugin fix when autofix is enabled", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, ["."]);
    const target = path.join(root, "expected.txt");
    await writeTarget(target, "wrong");

    const result = await run(
      {
        content: { autofix: true, content: "right" },
        plugins: [contentPlugin()],
      },
      root,
      rootPack(root, "."),
      { fix: true },
    );

    expect(await readContent(target)).toBe("right");
    expect(result.fixSummary?.isDryRun).toBe(false);
    expect(result.fixSummary?.fixed).toBe(1);
    expect(result.fixSummary?.errors).toBe(0);
    expect(result.fixSummary?.fixedDiagnostics).toHaveLength(1);
    expect(result.fixSummary?.fixedDiagnostics[0]?.ruleId).toBe(
      "content/mismatch",
    );
    expect(result.report.results).toHaveLength(1);
    expect(result.report.results[0]?.fix).toBeTypeOf("function");
    await rm(root, { recursive: true });
  });

  it("does not apply fixes when autofix is disabled", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, ["."]);
    const target = path.join(root, "expected.txt");
    await writeTarget(target, "wrong");

    const result = await run(
      { content: { content: "right" }, plugins: [contentPlugin()] },
      root,
      rootPack(root, "."),
      { fix: true },
    );

    expect(await readContent(target)).toBe("wrong");
    expect(result.fixSummary?.fixed).toBe(0);
    expect(result.fixSummary?.fixedDiagnostics).toEqual([]);
    expect(result.report.results[0]?.fix).toBeTypeOf("function");
    await rm(root, { recursive: true });
  });

  it("counts available fixes in dry-run without writing", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, ["."]);
    const target = path.join(root, "expected.txt");
    await writeTarget(target, "wrong");

    const result = await run(
      {
        content: { autofix: true, content: "right" },
        plugins: [contentPlugin()],
      },
      root,
      rootPack(root, "."),
      { fix: true, isDryRun: true },
    );

    expect(await readContent(target)).toBe("wrong");
    expect(result.fixSummary?.isDryRun).toBe(true);
    expect(result.fixSummary?.fixed).toBe(1);
    expect(result.fixSummary?.fixedDiagnostics).toEqual([]);
    expect(result.fixSummary?.packageCount).toBe(1);
    await rm(root, { recursive: true });
  });

  it("counts thrown fixes as errors", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, ["."]);
    const target = path.join(root, "expected.txt");
    await writeTarget(target, "wrong");

    const result = await run(
      {
        content: { autofix: true, content: "$THROW$" },
        plugins: [contentPlugin()],
      },
      root,
      rootPack(root, "."),
      { fix: true },
    );

    expect(await readContent(target)).toBe("wrong");
    expect(result.fixSummary?.errors).toBe(1);
    expect(result.fixSummary?.fixed).toBe(0);
    expect(result.fixSummary?.fixedDiagnostics).toEqual([]);
    await rm(root, { recursive: true });
  });

  it("counts a fix as fixed without re-validating", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, ["."]);
    const target = path.join(root, "expected.txt");
    await writeTarget(target, "wrong");

    const result = await run(
      {
        content: { autofix: true, content: "$WRONG$" },
        plugins: [contentPlugin()],
      },
      root,
      rootPack(root, "."),
      { fix: true },
    );

    expect(await readContent(target)).toBe("still wrong");
    expect(result.fixSummary?.fixed).toBe(1);
    expect(result.fixSummary?.fixedDiagnostics).toHaveLength(1);
    await rm(root, { recursive: true });
  });

  it("does not apply fixes without the fix option", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, ["."]);
    const target = path.join(root, "expected.txt");
    await writeTarget(target, "wrong");

    const result = await run(
      {
        content: { autofix: true, content: "right" },
        plugins: [contentPlugin()],
      },
      root,
      rootPack(root, "."),
    );

    expect(result.fixSummary).toBeUndefined();
    expect(await readContent(target)).toBe("wrong");
    await rm(root, { recursive: true });
  });

  it("applies fixes per package", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, ["packages/a", "packages/b"]);
    await writeTarget(path.join(root, "packages/a/expected.txt"), "wrong");
    await writeTarget(path.join(root, "packages/b/expected.txt"), "wrong");

    const result = await run(
      {
        content: { autofix: true, content: "right" },
        plugins: [contentPlugin()],
      },
      root,
      rootPack(root, "packages/a", "packages/b"),
      { fix: true },
    );

    expect(result.fixSummary?.fixed).toBe(2);
    expect(result.fixSummary?.packageCount).toBe(2);
    expect(await readContent(path.join(root, "packages/a/expected.txt"))).toBe(
      "right",
    );
    expect(await readContent(path.join(root, "packages/b/expected.txt"))).toBe(
      "right",
    );
    await rm(root, { recursive: true });
  });

  it("does not apply fixes when there is nothing to fix", async () => {
    const root = await createTemporaryDirectory();
    await createFixture(root, ["."]);
    const target = path.join(root, "expected.txt");
    await writeTarget(target, "right");

    const result = await run(
      {
        content: { autofix: true, content: "right" },
        plugins: [contentPlugin()],
      },
      root,
      rootPack(root, "."),
      { fix: true },
    );

    expect(result.fixSummary?.fixed).toBe(0);
    expect(result.fixSummary?.fixedDiagnostics).toEqual([]);
    expect(result.report.results).toEqual([]);
    await rm(root, { recursive: true });
  });
});
