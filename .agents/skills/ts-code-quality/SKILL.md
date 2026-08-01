---
name: ts-code-quality
description: >-
  Sets up and enforces ESLint, Prettier, and TypeScript configuration for
  TypeScript projects, including VS Code settings and extension
  recommendations. Use this when the user wants to configure linting,
  formatting, or type-checking rules, set up a .vscode folder, add or
  recommend ESLint plugins, or improve code quality tooling in a TypeScript
  project.
---

# TS Code Quality Skill

Sets up ESLint, Prettier, TypeScript, EditorConfig, and Knip config for
TypeScript projects, plus matching VS Code settings and extensions.

## Detection (run first)

Run per **package** (each workspace in a monorepo, or once for a single repo).
Read the project's `package.json`(s) and workspace config first.

### 1. Is this a monorepo?

Check in order:

1. Root `package.json` has a `workspaces` array? (pnpm, npm, yarn, bun)
2. `pnpm-workspace.yaml` has a `packages` field?
3. A common monorepo config file exists?
   (`turbo.json`, `nx.json`, `lerna.json`, `rush.json`, `moon.json`)

If any indicates multiple packages:

- Run per-package detection for each workspace to pick the ESLint + tsconfig
  variant.
- Use shared config packages (`packages/eslint-config/`,
  `packages/typescript-config/`) instead of root-level configs.
- Do **not** create root-level `tsconfig.json` or `eslint.config.js` —
  Turborepo recommends against them (cache misses).

### 2. Package manager detection

Detect via lock files or the `packageManager` field in `package.json`:

| Lock file           | Package manager |
| ------------------- | --------------- |
| `pnpm-lock.yaml`    | pnpm            |
| `package-lock.json` | npm             |
| `yarn.lock`         | yarn            |
| `bun.lock`          | bun             |

If no lock file, check the `packageManager` field (e.g. `"pnpm@10.8.0"`). Use
the detected package manager in all commands.

### 3. Per-package framework detection

Read `package.json` `dependencies` + `devDependencies`:

| If dep found                 | ESLint layer           | TypeScript config     |
| ---------------------------- | ---------------------- | --------------------- |
| `next`                       | base + nextjs          | `nextjs.json`         |
| `@tanstack/react-start`      | react + tanstack-start | `tanstack-start.json` |
| `fastify`                    | node + fastify         | `fastify.json`        |
| `express`                    | node + express         | `express.json`        |
| `react` (none of above)      | react only             | `react.json`          |
| none, but `"type": "module"` | node only              | `node.json`           |
| otherwise                    | base only              | `base.json`           |

> **Important:** `next` already bundles React + React Hooks rules via
> `eslint-config-next`. Do **not** add the `react` layer for Next.js
> projects — only `base + nextjs`.

### 4. Tailwind check

If `tailwindcss` is in deps:

- Merge `assets/eslint/tailwind.js`
- Merge `assets/prettier/tailwind.json`'s fields into the
  base `.prettierrc.json` (adds `prettier-plugin-tailwindcss` and `tailwindFunctions`)
- Find the CSS entry file by scanning for `@import "tailwindcss"`. Set its
  relative path in `tailwindStylesheet` (Prettier) and
  `tailwindCSS.experimental.configFile` (VS Code).

## Composition model

**Monorepo:** create `packages/eslint-config/` + `packages/typescript-config/`
shared configs; each app's `eslint.config.js` imports from the shared package
and each app's `tsconfig.json` extends the shared tsconfig. Avoids duplication
and cache misses.

**Single-package:** all config lives inline in root files — no `eslint/` or
`tsconfig/` subdirectory. Root `eslint.config.js` defines each layer as a
separate `const` and merges them; root `tsconfig.json` has one `compilerOptions`
block with options grouped and labeled by layer.

Both use the `assets/` files as the source of truth for config content.

## Existing projects

Never blindly overwrite existing config files — merge instead.

### Existing eslint.config.js

**Replace** the existing flat config with the layered approach (base +
framework) — not a merge. Review the old config's custom rules and port any
still-relevant ones into the appropriate layer or a separate config object in
`eslint.config.js`.

### Existing tsconfig.json

If the project already has custom `compilerOptions`:

- **Single-package**: merge them into the inline `tsconfig.json`, preserving
  `paths`, `outDir`, etc. Add missing strictness flags from the relevant layer.
- **Monorepo**: copy the relevant variants to `packages/typescript-config/` and
  update each app's `tsconfig.json` to extend its variant, preserving existing
  `compilerOptions`.

### Existing package.json

Only add the code quality scripts and devDependencies below. Do **not** remove
or modify existing scripts or dependencies — merge the new scripts in.

### Existing .vscode/

If `.vscode/settings.json` or `.vscode/extensions.json` exist:

- Merge the recommended settings into the existing file.
- Preserve any custom settings the user already has.
- Only add extension IDs missing from `extensions.json`.
- Do not remove existing extension recommendations.

### Existing monorepo config

If any monorepo config already exists (`turbo.json`, `pnpm-workspace.yaml`,
`workspaces` in root `package.json`, `nx.json`, `lerna.json`, `rush.json`,
`moon.json`):

- Add the new tasks (`lint`, `lint:fix`, `typecheck`, `format`, `knip`) to
  `turbo.json` if it exists.
- Ensure the workspace config covers the packages that need tooling.
- Do not restructure the existing workspace layout.

### Existing .prettierrc / .editorconfig

If `.prettierrc.json` (or `.prettierrc` / `.prettierrc.yaml`) exists, compare
with the skill's recommended settings and add missing options, keeping the
user's existing preferences. Same for `.editorconfig` — add any missing rules.

## File-by-file instructions

### Read the reference docs

Read the relevant `references/` files for deeper rationale on plugin choices,
rule decisions, and config trade-offs:

- `eslint.md` — plugin rationale, rule details, framework tuning
- `prettier.md` — Prettier config details, Tailwind variant
- `knip.md` — usage patterns and customization
- `editorconfig.md` — settings rationale
- `typescript.md` — strictness philosophy, config hierarchy, variants
- `vscode.md` — settings and extension recommendations

### 1. .editorconfig

Copy `assets/editorconfig/.editorconfig` to `<project-root>/.editorconfig`.

### 2. .gitignore

Ensure `.agents` is ignored by git:

- If `.gitignore` exists, merge — add `.agents` if missing, never replace the
  existing file or remove other entries.
- If absent, create `<project-root>/.gitignore` containing `.agents`.

### 3. VS Code

Copy the `.vscode/` directory:

- `assets/vscode/settings.json` → `<project-root>/.vscode/settings.json`
- `assets/vscode/extensions.json` → `<project-root>/.vscode/extensions.json`

Then apply these **per-detection** modifications:

**Tailwind CSS** — If Tailwind is detected:

- Merge `"*.css": "tailwindcss"` into `files.associations`
- Add `"tailwindCSS.experimental.configFile"` pointing to the project's CSS
  entry file (scan for `@import "tailwindcss"`).

**Package manager lockfile** — add the detected package manager's lock file to
`search.exclude`:

| Package manager | Lock file              |
| --------------- | ---------------------- |
| pnpm            | `**/pnpm-lock.yaml`    |
| npm             | `**/package-lock.json` |
| yarn            | `**/yarn.lock`         |
| bun             | `**/bun.lock`          |

**Next.js** — If `next` is detected, add `"**/.next": true` to `search.exclude`.

**TanStack Start** — If `@tanstack/react-start` is detected, ignore the
generated route file:

```json
{
  "search.exclude": { "**/routeTree.gen.ts": true },
  "files.watcherExclude": { "**/routeTree.gen.ts": true },
  "files.readonlyInclude": { "**/routeTree.gen.ts": true }
}
```

### 4. TypeScript configs

**Single-package:** create one root `tsconfig.json` with a merged
`compilerOptions` block. Merge the relevant tsconfig asset files'
`compilerOptions` (later layers override earlier ones), grouping each layer's
options under a comment:

```jsonc
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    // ---- Base ----      (from assets/typescript/base.json)
    "strict": true,
    "noUnusedLocals": true,
    // ...all other base flags
    // ---- React ----     (from assets/typescript/react.json)
    "jsx": "react-jsx",
    "module": "ESNext",
    // ...all other react flags
    // ---- Next.js ----   (from assets/typescript/nextjs.json)
    "plugins": [{ "name": "next" }],
  },
  "include": ["src/**/*.{ts,tsx}"], // from the framework variant
  "exclude": ["node_modules"],
}
```

- `include`/`exclude` come from the framework-specific asset file. If no
  framework layer: React-based → `src/**/*.{ts,tsx}`, non-React → `src/**/*.ts`.
- Preserve existing `paths`, `outDir`, `rootDir` in an existing project.

**Monorepo:** create `packages/typescript-config/` with shared tsconfig files —
copy the relevant asset files there. Each app's `tsconfig.json` extends the
shared variant via workspace protocol:

```json
{
  "extends": "@workspace/typescript-config/nextjs.json",
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] },
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.{ts,tsx}"]
}
```

Do **not** create root-level `tsconfig.json` for monorepos — Turborepo
recommends against it (causes cache misses).

**Both layouts:**

- **TypeScript version**: install the latest published version as a caret range
  (e.g. `"typescript": "^5"`), never a pinned full version.
- **Config file extension**: use `.js` for all config files when
  `"type": "module"` is set — never `.mjs`.
- **Non-React include**: without React, `include` must be only `src/**/*.ts` —
  no `.tsx` or `.jsx`.

### 5. ESLint config

**Single-package:** create one root `eslint.config.js` with all layers inline.
Read the relevant ESLint asset files and merge their content into one file.
Each layer is a separate const, grouped by a comment header, copied verbatim
from its asset file:

```js
// @ts-check
// imports combined from every selected layer's asset file
import js from "@eslint/js";
import * as tseslint from "typescript-eslint";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { globalIgnores } from "eslint/config";
// ...plus the other plugins referenced by the layers

// ---- Base config ----    (content from assets/eslint/base.js)
const baseConfig = [
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  // ...full base.js content: plugins, rules, settings
  prettier,
  globalIgnores(["dist/**", ".agents/**"]),
];

// ---- Next.js config ---- (content from assets/eslint/nextjs.js)
const nextjsConfig = [
  ...nextVitals,
  ...nextTs,
  // ...full nextjs.js content
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
];

/** @type {import("eslint").Linter.Config[]} */
export default [...baseConfig, ...nextjsConfig];
```

Combine imports from all layers at the top; always spread `baseConfig` first.
If Tailwind is detected, add a `// ---- Tailwind config ----` section from
`assets/eslint/tailwind.js`.

**Typed linting (`allowDefaultProject`)** — base layer's `parserOptions` uses
`projectService: true`. Populate `allowDefaultProject` (base layer only; all
others inherit) with the linted config files not covered by any tsconfig, so
they still get type-aware rules:

- **Single-package** → `["eslint.config.js"]`
- **Monorepo** → the shared config filenames created in `packages/eslint-config/`
  (e.g. `["base.js", "react.js", "nextjs.js"]`) plus `"eslint.config.js"`

Constraints: entries are globs resolved relative to `tsconfigRootDir`, `**` is
not allowed, at most 8 files may match.

**Per-detection `globalIgnores`** — merge these into the existing
`globalIgnores()` call (or add one):

| Detection       | `globalIgnores` entries                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| Next.js         | `".next/**"`, `"out/**"`, `"build/**"`, `"next-env.d.ts"`                                                  |
| TanStack Start  | `"**/routeTree.gen.ts"`, `".netlify/**"`, `".output/**"`, `".tanstack/**"`, `".vinxi/**"`, `"dist-ssr/**"` |
| Package manager | Lockfile from [detection table](#2-package-manager-detection)                                              |

(`base.js` already includes universal entries `dist/**`, `.agents/**`;
framework assets include their own.)

**Monorepo:** create `packages/eslint-config/` with shared config files —
copy the relevant asset files there (exporting `base.js`, `react.js`,
`node.js`, etc.), keeping their `// @ts-check` +
`/** @type {import("eslint").Linter.Config[]} */` headers. Each app's
`eslint.config.js` imports from the shared package:

```js
// @ts-check
import base from "@workspace/eslint-config/base.js";
import nextjs from "@workspace/eslint-config/nextjs.js";

/** @type {import("eslint").Linter.Config[]} */
export default [...base, ...nextjs];
```

Do **not** create root-level `eslint.config.js` for monorepos — Turborepo
recommends against it (causes cache misses).

### 6. Prettier

Copy `assets/prettier/.prettierrc.json` to `<project-root>/.prettierrc.json`.
If Tailwind is detected, merge `assets/prettier/tailwind.json`'s fields into
it (adds `prettier-plugin-tailwindcss` and `tailwindFunctions`), and add a
`tailwindStylesheet` field set to the CSS entry file's path relative to the
project/package root (see [Tailwind check](#4-tailwind-check)). Always use the
`.json` extension — do NOT omit it.

Also create a `.prettierignore`:

**Universal** (always include):

```
.agents
dist
coverage
```

**Per-detection** (add based on the detected framework and package manager):

| Detection       | `.prettierignore` entries                                     |
| --------------- | ------------------------------------------------------------- |
| Next.js         | `.next`, `out`, `build`                                       |
| TanStack Start  | `**/routeTree.gen.ts`                                         |
| Package manager | Lockfile from [detection table](#2-package-manager-detection) |

### 7. Knip

Run `<package-manager> create @knip/config` to generate a `knip.json`
tailored to the detected frameworks and structure. Then merge `".agents/**"`
into `ignore` — at root level for single-package, or under
`workspaces["."].ignore` for monorepos (the `"."` workspace is the root).

### 8. Add dependencies

Install the packages matching the detected layers — `references/eslint.md`
lists every package by layer. Install only what's needed.

**Single-package:** everything as devDependencies in the root `package.json` —
`typescript`, `eslint`, `@types/node`, `prettier`, `knip`, plus all detected
ESLint plugins (and `prettier-plugin-tailwindcss` if Tailwind).

**Monorepo:** spread across three tiers, do **not** duplicate:

- **Root `package.json` devDependencies** — the CLI tooling that runs from
  root: `typescript`, `eslint`, `@types/node`, `prettier`, `knip`, and
  `prettier-plugin-tailwindcss` (if Tailwind).
- **`packages/eslint-config/package.json` dependencies** — every ESLint plugin
  the shared config imports, matching the detected layers (typescript-eslint,
  eslint-config-prettier, eslint-config-next, import-x, perfectionist, etc.).
  Plugins must be declared here, not at root, so they resolve for consumers.
- **Individual app packages** — only their runtime dependencies plus
  `workspace:*` references to the shared config packages. No tooling or ESLint
  plugins.

**Version policy**: every package as a caret range of the latest published
version — e.g. `typescript: "^5"`, `eslint: "^9"`, `@types/node: "^22"`,
`prettier: "^3"`, `knip: "^6"`, `typescript-eslint: "^8"` (whichever major is
latest). Never pin an exact version or a minor/patch caret range.

### 9. Add scripts to package.json

**Always** create or update the target project's `package.json` with scripts —
every project needs them for the tooling to be usable.

For single-package projects, add scripts to the root `package.json`:

```json
{
  "scripts": {
    "lint": "eslint --max-warnings=0 .",
    "lint:fix": "eslint --max-warnings=0 --fix .",
    "format": "prettier --check .",
    "format:fix": "prettier --write .",
    "typecheck": "tsc --noEmit",
    "knip": "knip"
  }
}
```

For monorepos, add scripts to each package's `package.json` AND to the root
`package.json` using `turbo run` for lint/typecheck and direct commands for
format/knip.

### 10. Add CI workflow (optional, suggest to user)

Suggest adding a `.github/workflows/ci.yaml` running lint, format, typecheck,
and knip on push/PR. Do NOT create it without asking — some users have
existing CI pipelines.

## Example scenarios

### Plain TS library (single-package)

- Detection: no framework deps, no tailwind
- Configs: single `eslint.config.js` (base + node), single `tsconfig.json`
  (base + node compilerOptions merged by layer)
- Installed (root devDeps): typescript, eslint, @types/node, prettier, knip,
  - node eslint plugins — all with caret ranges of the latest versions

### Next.js app with Tailwind (single-package)

- Detection: next, tailwindcss
- Configs: single `eslint.config.js` (base + nextjs + tailwind), single
  `tsconfig.json` (base + react + nextjs merged), `.prettierrc.json` (tailwind
  plugin merged)
- Installed (root devDeps): typescript, eslint, @types/node, prettier, knip,
  - react/next/tailwind eslint plugins — all with caret ranges of the latest
    versions

### TanStack Start monorepo frontend + Fastify backend

- Root: no root configs (Turborepo guidance)
- Frontend pkg (react + tanstack-start + tailwind):
  shared eslint-config (base + react + tanstack-start + tailwind),
  shared typescript-config (tanstack-start),
  `.prettierrc.json` (with tailwind plugin merged)
- Backend pkg (fastify):
  shared eslint-config (base + node + fastify),
  shared typescript-config (fastify)
- Shared config packages: `packages/eslint-config/` and
  `packages/typescript-config/`
- Installed — root devDeps (caret, latest): typescript, eslint, @types/node,
  prettier, knip, prettier-plugin-tailwindcss; `packages/eslint-config`
  deps: all react + node + tailwind eslint plugins; apps: only runtime
  deps + `workspace:*` config refs
