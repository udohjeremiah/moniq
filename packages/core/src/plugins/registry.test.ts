import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";

import type { Policy, UserConfig } from "../index.js";
import type { PluginPolicyDefinition, PolicySubject } from "./plugins.js";

import { createRegistry, registerPluginPack, resolveAll } from "../index.js";
import { readPackageJson } from "../workspace/package-json.js";
import { definePlugin } from "./plugins.js";

interface ReleasePolicy extends Policy {
  version?: string;
}

interface ReleaseSubject {
  version?: string;
}

async function createTemporaryDirectory() {
  return mkdtemp(path.join(tmpdir(), "moniq-core-test-"));
}

function noopPolicy(pluginName: string) {
  return definePlugin({
    name: pluginName,
    policy: {
      schema: Type.Object({}),
      // Validates nothing by design.
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      validate(): void {},
    } satisfies PluginPolicyDefinition,
  });
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

describe("createRegistry", () => {
  it("registers user plugins from config.plugins", () => {
    const registry = createRegistry({
      plugins: [noopPolicy("release")],
    });

    expect(registry.getDomain("release")?.pluginName).toBe("release");
  });

  it("registers a plugin pack added through registerPluginPack", () => {
    registerPluginPack(noopPolicy("pack-rule"));

    const registry = createRegistry({});

    expect(registry.getDomain("pack-rule")?.pluginName).toBe("pack-rule");
  });

  it("rejects a duplicate plugin pack registration", () => {
    expect(() => {
      registerPluginPack(noopPolicy("pack-rule"));
    }).toThrow(/Duplicate plugin/);
  });

  it("rejects two plugins registering the same domain", () => {
    const config = {
      plugins: [releasePlugin(), noopPolicy("release")],
    } as UserConfig;

    expect(() => createRegistry(config)).toThrow(
      /(Duplicate policy domain|Duplicate plugin)/,
    );
  });
});

describe("plugin pipeline", () => {
  it("resolves a user plugin through the engine", async () => {
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

    const { report } = await resolveAll(
      createRegistry(config).domains,
      config,
      root,
      rootPack(root, "."),
    );

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
});
