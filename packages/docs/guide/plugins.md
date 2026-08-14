# Plugins

Moniq's plugin API lets you add custom policy domains for metadata, project
conventions, and workspace rules.

A plugin contributes one policy domain with:

- `name` — logical configuration key
- `policy` — policy schema and validation hooks
- `subjects()` — optional function that creates validation targets
- `validate()` — function that reports violations

Built-in policies use the same API and are available as reference
implementations in [`moniq/packages/plugins`](https://github.com/udohjeremiah/moniq/tree/main/packages/plugins).

> [!tip]
> Use the `moniq-plugin-<name>` naming convention. A plugin named
> `package-metadata` should be published as `moniq-plugin-package-metadata`.

## Installation

Declare `@udohjeremiah/moniq` as a peer dependency.

The plugin authoring API is exposed only through the dedicated subpath:

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

```ts
import { Type } from "@udohjeremiah/moniq/plugins";

export const packageMetadataSchema = Type.Object({
  private: Type.Optional(Type.Boolean()),
  license: Type.Optional(Type.String()),
});
```

## 2. Define the Policy Type

Derive the complete policy type from the shared `Policy` and your schema:

```ts
import type { Policy, Type } from "@udohjeremiah/moniq/plugins";

import { packageMetadataSchema } from "./schema.js";

export type PackageMetadataPolicy = Policy &
  Type.Static<typeof packageMetadataSchema>;
```

This keeps the runtime schema and TypeScript type synchronized.

## 3. Define Subjects

`PluginPackage` intentionally contains only the package path:

```ts
export interface PluginPackage {
  path: string;
}
```

Moniq does not eagerly read `package.json` or other package metadata for
plugins. If a plugin needs package contents, it loads them in `subjects()` and
passes the result through `PolicySubject.value`.

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
      // package.json is unavailable or invalid
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

This keeps package metadata loading lazy: Moniq itself does not eagerly read
package metadata for every plugin.

## 4. Define the Validator

The validator receives a `PolicyContext` containing:

- `package` — the current package
- `policy` — the selected policy configuration
- `subject` — the validation target
- `workspace.root` — workspace root
- `report()` — diagnostic reporting function

```ts
import type { PluginPolicyDefinition } from "@udohjeremiah/moniq/plugins";

import { packageMetadataSchema } from "./schema.js";
import {
  packageMetadataSubjects,
  type PackageMetadataSubject,
} from "./subjects.js";

export const packageMetadataPolicy: PluginPolicyDefinition<
  typeof packageMetadataSchema
> = {
  schema: packageMetadataSchema,
  subjects: packageMetadataSubjects,

  validate({ policy, report, subject }) {
    const { packageJson } = subject as PackageMetadataSubject;

    if (policy.private === false && packageJson?.["license"] === undefined) {
      report({
        message: "A public package should declare a license.",
        ruleId: "package-metadata/license",
        ruleName: "Missing license",
      });
    }
  },
};
```

## 5. Define the Plugin

Use `definePlugin()` for type checking and inference:

```ts
import { definePlugin } from "@udohjeremiah/moniq/plugins";

import { packageMetadataPolicy } from "./validate.js";

export default definePlugin({
  name: "package-metadata",
  policy: packageMetadataPolicy,
});
```

`definePlugin()` returns the plugin unchanged at runtime.

## 6. Add TypeScript Augmentation

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

Users can then configure:

```ts
export default defineConfig({
  "package-metadata": {
    private: false,
  },
});
```

## 7. Report Diagnostics

Use `report()` to report violations:

```ts
report({
  message: "A public package should declare a license.",
  ruleId: "package-metadata/license",
  ruleName: "Missing license",
});
```

Moniq supplies engine-owned diagnostic fields such as the policy domain, plugin,
package path, package name, and severity.

### Custom Diagnostic Fields

Plugins can add typed diagnostic fields through module augmentation:

```ts
declare module "@udohjeremiah/moniq/plugins" {
  interface Diagnostic {
    packageJsonField?: string;
  }
}
```

The field is then available to `report()`:

```ts
report({
  message: "Package is missing a license.",
  ruleId: "package-metadata/license",
  ruleName: "Missing license",
  packageJsonField: "license",
});
```

For plugin-specific data that does not need a first-class type, use `metadata`:

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

`metadata` is a `Record<string, unknown>` and is suitable for formatter-specific
data such as SARIF properties.

## 8. Publish the Plugin

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

## 9. Register the Plugin

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
