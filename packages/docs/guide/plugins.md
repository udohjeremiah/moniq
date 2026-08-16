# Plugins

Moniq's plugin API lets you add custom policy domains for metadata, project
conventions, and other workspace rules.

A plugin contributes one policy domain. A typical plugin is split into:

- `schema.ts` — TypeBox schema for plugin-specific options
- `subjects.ts` — optional function that creates validation targets
- `validate.ts` — validator that reports violations and optional fixes
- `index.ts` — assembles the plugin and declares its logical `name`

Built-in policies use the same API and are available as reference
implementations in [`packages/plugins`](https://github.com/udohjeremiah/moniq/tree/main/packages/plugins).

> [!tip]
> Use the `moniq-plugin-<name>` naming convention. A plugin named
> `package-metadata` should be published as `moniq-plugin-package-metadata`.

## Installation

Declare `@udohjeremiah/moniq` as a peer dependency.

The plugin API is exposed only through the dedicated subpath:

```ts
import { Type, definePlugin } from "@udohjeremiah/moniq/plugins";
```

`Type` is re-exported from the plugin subpath, so plugin authors do not need
to install [TypeBox](https://sinclairzx81.github.io/typebox) separately.

## 1. Define the Schema

Declare only options specific to your plugin. Moniq handles the shared policy
options:

- `presence`
- `include`
- `exclude`
- `severity`
- `description`
- `autofix`

```ts
import { Type } from "@udohjeremiah/moniq/plugins";

export const packageMetadataSchema = Type.Object({
  private: Type.Optional(Type.Boolean()),
  license: Type.Optional(Type.String()),
});
```

## 2. Define the Policy Type

Derive the complete policy type from `Policy` and your schema:

```ts
import type { Policy, Type } from "@udohjeremiah/moniq/plugins";

import { packageMetadataSchema } from "./schema.js";

export type PackageMetadataPolicy = Policy &
  Type.Static<typeof packageMetadataSchema>;
```

This keeps the runtime schema and TypeScript type synchronized.

## 3. Define Subjects

Moniq does not eagerly load package contents for plugins. It only provides the
package path through `PluginPackage`.

If a plugin needs additional data, load it in `subjects()` and pass it through
`PolicySubject.value`.

For example:

```ts
import path from "node:path";
import { readFile } from "node:fs/promises";

import type { PluginPackage, PolicySubject } from "@udohjeremiah/moniq/plugins";

import type { PackageMetadataPolicy } from "./constants.js";

export interface PackageMetadataSubject {
  packageJson?: Record<string, unknown>;
}

export async function packageMetadataSubjects(
  config: unknown,
  root: string,
  packages: PluginPackage[],
): Promise<PolicySubject[]> {
  const policies = (
    Array.isArray(config) ? config : [config]
  ) as PackageMetadataPolicy[];

  const subjects: PolicySubject[] = [];

  for (const package_ of packages) {
    let packageJson: Record<string, unknown> | undefined;

    try {
      packageJson = JSON.parse(
        await readFile(path.join(package_.path, "package.json"), "utf8"),
      );
    } catch {
      // package.json is unavailable or invalid.
    }

    subjects.push({
      package: package_,
      policies,
      relativePath: path.relative(root, package_.path),
      value: { packageJson } satisfies PackageMetadataSubject,
    });
  }

  return subjects;
}
```

`value` is plugin-specific data and becomes `context.subject` in `validate()`.

When `subjects()` is provided, the plugin is responsible for supplying the
applicable `policies` for each subject.

## 4. Define the Validator

The validator receives a `PolicyContext` containing:

- `package` — current workspace package
- `policy` — selected policy configuration
- `subject` — plugin-specific validation data
- `workspace.root` — workspace root
- `report()` — diagnostic reporting function

```ts
import type { PluginValidator } from "@udohjeremiah/moniq/plugins";

import type { PackageMetadataPolicy } from "./constants.js";
import type { PackageMetadataSubject } from "./subjects.js";

export const packageMetadataValidator: PluginValidator<
  PackageMetadataPolicy
> = ({ policy, report, subject }) => {
  const { packageJson } = subject as PackageMetadataSubject;

  if (policy.private === false && packageJson?.["license"] === undefined) {
    report({
      message: "A public package should declare a license.",
      ruleId: "package-metadata/license",
      ruleName: "Missing license",
    });
  }
};
```

`policy` contains the **configuration**. `subject` contains the **data being
validated**.

## 5. Add Fixes

A policy can enable automatic fixes with `autofix`. Individual diagnostics
provide the `fix` operation that performs the change.

For example:

```ts
{
  private: false,
  autofix: true,
}
```

When a violation is reported, provide a self-contained `fix` function:

```ts
report({
  fix: async () => {
    const packageJsonPath = path.join(package_.path, "package.json");

    const packageJson = JSON.parse(
      await readFile(packageJsonPath, "utf8"),
    ) as Record<string, unknown>;

    packageJson["license"] = "MIT";

    await writeFile(
      packageJsonPath,
      `${JSON.stringify(packageJson, undefined, 2)}\n`,
    );
  },
  message: "A public package should declare a license.",
  ruleId: "package-metadata/license",
  ruleName: "Missing license",
});
```

The policy's `autofix` option controls whether Moniq may apply the fix. The
diagnostic's `fix` function defines how the violation is fixed.

During a dry run, Moniq reports available fixes without invoking them. After
applying fixes, run `moniq check` again to verify that the violations are
resolved.

## 6. Define the Plugin

`index.ts` assembles the schema, subjects, and validator and declares the
plugin's logical `name`:

```ts
import { definePlugin } from "@udohjeremiah/moniq/plugins";

import { packageMetadataSchema } from "./schema.js";
import { packageMetadataSubjects } from "./subjects.js";
import { packageMetadataValidator } from "./validate.js";

export default definePlugin({
  name: "package-metadata",
  policy: {
    schema: packageMetadataSchema,
    subjects: packageMetadataSubjects,
    validate: packageMetadataValidator,
  },
});
```

`definePlugin()` exists for type checking and inference and returns the plugin
unchanged at runtime.

## 7. Add TypeScript Augmentation

Augment `MoniqPluginPolicies` so users get autocomplete and type checking for
the plugin's configuration domain:

```ts
import type { PackageMetadataPolicy } from "./constants.js";

declare module "@udohjeremiah/moniq/plugins" {
  interface MoniqPluginPolicies {
    "package-metadata": PackageMetadataPolicy | PackageMetadataPolicy[];
  }
}
```

Users can then configure the plugin directly at the top level:

```ts
export default defineConfig({
  "package-metadata": {
    private: false,
  },
});
```

## 8. Report Diagnostics

Use `report()` to report violations:

```ts
report({
  message: "A public package should declare a license.",
  ruleId: "package-metadata/license",
  ruleName: "Missing license",
});
```

Moniq supplies engine-owned fields such as:

- `domain`
- `packageName`
- `packagePath`
- `plugin`
- `severity`

The plugin supplies:

- `message`
- `ruleId`
- `ruleName`
- optional `metadata`
- optional `fix`

### Typed Metadata

Use `metadata` for plugin-specific diagnostic data.

By default, `metadata` accepts arbitrary string keys with `unknown` values.
Plugins can augment `DiagnosticMetadata` to type-check their own fields:

```ts
declare module "@udohjeremiah/moniq/plugins" {
  interface DiagnosticMetadata {
    expected?: string;
    packageJsonField?: string;
  }
}
```

Those fields are then type-checked when reporting diagnostics:

```ts
report({
  message: "Package is missing a license.",
  ruleId: "package-metadata/license",
  ruleName: "Missing license",
  metadata: {
    expected: "MIT",
    packageJsonField: "license",
  },
});
```

## 9. Publish the Plugin

A plugin is a normal npm package:

```json
{
  "name": "moniq-plugin-package-metadata",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "peerDependencies": {
    "@udohjeremiah/moniq": "^..."
  }
}
```

## 10. Register the Plugin

Install the plugin:

```bash
pnpm add -D moniq-plugin-package-metadata
```

Register it in `moniq.config.ts`:

```ts
import { defineConfig } from "@udohjeremiah/moniq";
import packageMetadata from "moniq-plugin-package-metadata";

export default defineConfig({
  plugins: [packageMetadata],

  "package-metadata": {
    private: false,
  },
});
```

The `plugins` array registers the plugin for runtime validation.

The policy configuration remains at the top level and is keyed by the
plugin's logical `name`.
