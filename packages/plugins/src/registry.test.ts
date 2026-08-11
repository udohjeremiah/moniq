import type { Policy, UserConfig } from "@moniq/config";
import type {
  PluginPolicyDefinition,
  PolicySubject,
} from "@moniq/config/plugins";

import { definePlugin } from "@moniq/config/plugins";
import { readPackageJson } from "@moniq/workspace";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";

import { createRegistry, resolve } from "./index.js";

interface ReleasePolicy extends Policy {
  version?: string;
}

interface ReleaseSubject {
  version?: string;
}

async function createTemporaryDirectory() {
  return mkdtemp(path.join(tmpdir(), "moniq-plugin-test-"));
}

function releasePlugin() {
  const releaseSchema = Type.Object({
    version: Type.Optional(Type.String()),
  });

  return definePlugin({
    name: "release",
    policy: {
      schema: releaseSchema,

      async subjects(config, root, packages): Promise<PolicySubject[]> {
        const policy = config as ReleasePolicy;
        const subjects_: PolicySubject[] = [];

        for (const package_ of packages) {
          const packageJson = await readPackageJson(
            path.join(package_.path, "package.json"),
          );
          const version =
            typeof packageJson["version"] === "string"
              ? packageJson["version"]
              : undefined;

          subjects_.push({
            package: { path: package_.path },
            policies: [policy],
            relativePath: path.relative(root, package_.path),
            value: { version } satisfies ReleaseSubject,
          });
        }

        return subjects_;
      },

      validate({ policy, report, subject }) {
        const { version } = subject as ReleaseSubject;
        if (policy.version !== undefined && version !== policy.version) {
          report({
            message: `Expected version ${policy.version}`,
            ruleId: "release/version",
            ruleName: "release/version",
          });
        }
      },
    } satisfies PluginPolicyDefinition<typeof releaseSchema>,
  });
}

function rootPack(root: string, ...relativePaths: string[]) {
  return relativePaths.map((relative) => ({
    path: path.join(root, relative),
  }));
}

describe("built-in plugin registration", () => {
  it("registers built-in plugins without the user listing them", () => {
    const registry = createRegistry({
      files: {},
      scripts: {},
    });

    const files = registry.getDomain("files");
    const scripts = registry.getDomain("scripts");

    expect(files?.pluginName).toBe("files");
    expect(scripts?.pluginName).toBe("scripts");
  });

  it("rejects a user plugin registering the same domain as a built-in", () => {
    const config = {
      plugins: [
        definePlugin({
          name: "files",
          policy: {
            schema: Type.Object({}),
            // Validates nothing by design.
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            validate(): void {},
          },
        }),
      ],
    } as UserConfig;

    expect(() => createRegistry(config)).toThrow(/Duplicate plugin/);
  });

  it("rejects two user plugins registering the same domain", () => {
    const config = {
      plugins: [
        definePlugin({
          name: "release",
          policy: {
            schema: Type.Object({}),
            // Validates nothing by design.
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            validate(): void {},
          },
        }),
        releasePlugin(),
      ],
    } as UserConfig;

    expect(() => createRegistry(config)).toThrow(
      /(Duplicate policy domain|Duplicate plugin)/,
    );
  });
});

describe("third-party plugin pipeline", () => {
  it("resolves a user plugin through the same engine as built-ins", async () => {
    const root = await createTemporaryDirectory();
    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir(path.join(root, "."), { recursive: true });
    await writeFile(
      path.join(root, "package.json"),
      `${JSON.stringify({ name: "root", version: "1.0.0" }, undefined, 2)}\n`,
    );

    const config = {
      plugins: [releasePlugin()],
      release: { version: "2.0.0" },
    } as UserConfig;

    const report = await resolve(config, root, rootPack(root, "."));

    expect(report.results).toEqual([
      {
        domain: "release",
        message: "Expected version 2.0.0",
        packageName: "root",
        packagePath: path.join(root, "."),
        plugin: "release",
        ruleId: "release/version",
        ruleName: "release/version",
        severity: "error",
      },
    ]);
    await rm(root, { recursive: true });
  });

  it("stamps plugin name on built-in diagnostics (uniform engine)", async () => {
    const root = await createTemporaryDirectory();
    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir(path.join(root, "."), { recursive: true });
    await writeFile(
      path.join(root, "package.json"),
      `${JSON.stringify({ name: "root", scripts: {} }, undefined, 2)}\n`,
    );

    const report = await resolve(
      { scripts: { build: { presence: "required" } } },
      root,
      rootPack(root, "."),
    );

    expect(report.results).toEqual([
      {
        domain: "scripts",
        message: 'Missing required script "build"',
        packageName: "root",
        packagePath: path.join(root, "."),
        plugin: "scripts",
        ruleId: "scripts/missing",
        ruleName: "Missing required script",
        scriptName: "build",
        severity: "error",
      },
    ]);
    await rm(root, { recursive: true });
  });
});
