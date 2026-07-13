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

Sets up best-in-class ESLint, Prettier, TypeScript, EditorConfig, and Knip
configuration for TypeScript projects, plus matching VS Code settings and
extension recommendations.

## Detection logic (run first)

Run detection per **package** (each workspace in a monorepo, or once for a
single-repo project). Read the target project's `package.json`(s) and workspace
config first.

### 1. Is this a monorepo?

Check these in order:

1. Does the root `package.json` have a `workspaces` array? (pnpm, npm, yarn, bun)
2. Does `pnpm-workspace.yaml` have a `packages` field?
3. Does any common monorepo config file exist?
   (`turbo.json`, `nx.json`, `lerna.json`, `rush.json`, `moon.json`)

If any indicates multiple packages:

- Per-package detection runs for each workspace to choose the right
  ESLint + tsconfig variant.
- Create shared config packages (`packages/eslint-config/`,
  `packages/typescript-config/`) instead of using root-level configs.
- Do **not** create root-level `tsconfig.json` or `eslint.config.js` —
  Turborepo recommends against them as they cause cache misses.

### 2. Package manager detection

The project is already set up, so the package manager can be detected by
checking for lock files or the `packageManager` field in `package.json`:

| Lock file           | Package manager |
| ------------------- | --------------- |
| `pnpm-lock.yaml`    | pnpm            |
| `package-lock.json` | npm             |
| `yarn.lock`         | yarn            |
| `bun.lock`          | bun             |

If none is found, also check `package.json` for the `packageManager` field
(e.g., `"packageManager": "pnpm@10.8.0"`). Use the detected package manager
in all commands.

### 3. Per-package framework detection

Read `package.json`, `dependencies` and `devDependencies`:

| If dep found                 | ESLint layer           | TypeScript config              |
| ---------------------------- | ---------------------- | ------------------------------ |
| `next`                       | base + nextjs          | `nextjs.json`         |
| `@tanstack/react-start`      | react + tanstack-start | `tanstack-start.json` |
| `fastify`                    | node + fastify         | `fastify.json`        |
| `express`                    | node + express         | `express.json`        |
| `react` (none of above)      | react only             | `react.json`          |
| none, but `"type": "module"` | node only              | `node.json`           |
| otherwise                    | base only              | `base.json`           |

> **Important:** `next` already bundles React + React Hooks rules via `eslint-config-next`.
> Do **not** add the `react` layer for Next.js projects — only `base + nextjs`.

### 4. Tailwind check

If `tailwindcss` is in deps:

- Merge `assets/eslint/tailwind.js`
- Merge `assets/prettier/tailwind.json`'s fields into the
  base `.prettierrc.json` (adds `prettier-plugin-tailwindcss` and `tailwindFunctions`)
- Detect the project's CSS entry file — scan CSS files for
  `@import "tailwindcss"` to find it. Set the relative path in
  `tailwindStylesheet` for the Prettier config and
  `tailwindCSS.experimental.configFile` for VS Code.

## Composition model

Config composition differs between monorepo and single-package projects:

**Monorepo:**
Create shared config packages (`packages/eslint-config/` and
`packages/typescript-config/`) that each app references. Each app's
`eslint.config.js` imports from the shared package, and each app's
`tsconfig.json` extends the shared tsconfig. This avoids duplication and
cache misses. (See existing `packages/` convention in the project.)

**Single-package** (standalone project):
All config lives inline in root files — no `eslint/` or `tsconfig/`
subdirectory. The root `eslint.config.js` defines each layer as a separate
const and merges them. The root `tsconfig.json` has a single
`compilerOptions` block where options are grouped and labeled with comments
showing which layer they come from.

In both cases, use the `assets/` files as the source of truth for config
content.

## Existing projects

When the target project already has config files (e.g., an existing monorepo
or a project that already has some tooling), do not blindly overwrite them.

### Existing eslint.config.js

The project may already have an ESLint flat config. **Replace it** with the
layered approach (base + framework) from this skill — this is a replacement,
not a merge. The old config's custom rules should be reviewed and ported if
still relevant. If the user has custom rules they want to keep, add them to
the appropriate layer config or as a separate config object in
`eslint.config.js`.

### Existing tsconfig.json

If the project already has a `tsconfig.json` with custom `compilerOptions`:

- For **single-package**: Merge the existing compilerOptions into the inline
  `tsconfig.json`, preserving the project's existing `paths`, `outDir`, etc.
  Add missing strictness flags from the relevant layer.
- For **monorepo**: Copy the relevant tsconfig variants to `packages/typescript-config/`
  as described below. Update each app's `tsconfig.json` to extend its variant,
  preserving existing `compilerOptions`.

### Existing package.json

Only add the code quality scripts and devDependencies listed below. Do **not**
remove or modify existing scripts or dependencies. Merge the new scripts into
the existing `scripts` block.

### Existing .vscode/

If `.vscode/settings.json` or `.vscode/extensions.json` already exist:

- Merge the recommended settings into the existing file.
- Preserve any custom settings the user already has.
- Only add the extension IDs that are missing from `extensions.json`.
- Do not remove any existing extension recommendations.

### Existing monorepo config

If any monorepo config already exists (`turbo.json`, `pnpm-workspace.yaml`,
`workspaces` in root `package.json`, `nx.json`, `lerna.json`, `rush.json`,
`moon.json`):

- Add the new tasks (`lint`, `lint:fix`, `typecheck`, `format`, `knip`) to
  `turbo.json` if it exists.
- Ensure the workspace config covers the packages that need tooling.
- Do not restructure the existing workspace layout.

### Existing .prettierrc / .editorconfig

If `.prettierrc.json` (or `.prettierrc` / `.prettierrc.yaml`) already exists:

- Compare the existing settings with the skill's recommended settings.
- Add missing options, but keep the user's existing preferences.

If `.editorconfig` already exists, compare and add any missing rules from
the skill's `.editorconfig`.

## File-by-file instructions

### Read the reference docs

Read the relevant reference files in `references/` for deeper rationale on
plugin choices, rule decisions, and config trade-offs:

- `references/eslint.md` — Plugin selection rationale, rule details,
  framework-specific tuning
- `references/prettier.md` — Prettier config details, Tailwind variant
- `references/knip.md` — Knip usage patterns and customization
- `references/editorconfig.md` — EditorConfig settings rationale
- `references/typescript.md` — TypeScript strictness philosophy, config
  hierarchy, per-variant details
- `references/vscode.md` — VS Code settings and extension recommendations

### 1. .editorconfig

Copy `assets/editorconfig/.editorconfig` to `<project-root>/.editorconfig`.

### 2. VS Code

Copy the `.vscode/` directory:

- `assets/vscode/settings.json` → `<project-root>/.vscode/settings.json`
- `assets/vscode/extensions.json` → `<project-root>/.vscode/extensions.json`

Then apply these **per-detection** modifications:

**Tailwind CSS** — If Tailwind is detected:

- Merge `"*.css": "tailwindcss"` into `files.associations`
- Add `"tailwindCSS.experimental.configFile"` pointing to the project's CSS
  entry file. Scan CSS files for `@import "tailwindcss"` to locate it.

**Package manager lockfile** — Detect the actual package manager (read
`packageManager` field or check for lock files) and add the correct entry
to `search.exclude`:

| Package manager | Lock file              |
| --------------- | ---------------------- |
| pnpm            | `**/pnpm-lock.yaml`    |
| npm             | `**/package-lock.json` |
| yarn            | `**/yarn.lock`         |
| bun             | `**/bun.lock`          |

**Next.js** — If `next` is detected, add `"**/.next": true` to
`search.exclude`.

**TanStack Start** — If `@tanstack/react-start` is detected, merge these
entries to ignore the generated route file:

```json
{
  "search.exclude": { "**/routeTree.gen.ts": true },
  "files.watcherExclude": { "**/routeTree.gen.ts": true },
  "files.readonlyInclude": { "**/routeTree.gen.ts": true }
}
```

### 3. TypeScript configs

**For single-package projects:**

Create a single root `tsconfig.json` with a merged `compilerOptions` block.
Read the relevant tsconfig asset files and merge their `compilerOptions`
together (later layers override earlier ones). Group options by layer with
comments:

```jsonc
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    // ---- Base ----
    "declaration": true,
    "declarationMap": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "incremental": false,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noPropertyAccessFromIndexSignature": true,
    "noUncheckedIndexedAccess": true,
    "noUncheckedSideEffectImports": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "strict": true,
    "strictNullChecks": true,

    // ---- React ----
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "noEmit": true,
    "target": "ES2022",

    // ---- Next.js ----
    "incremental": true,
    "plugins": [{ "name": "next" }],
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"],
}
```

- `include` and `exclude` come from the framework-specific asset file.
- If no framework layer, use the table below for `include`:
  - React-based (react / nextjs / tanstack-start): `src/**/*.{ts,tsx}`
  - Non-React (base / node / fastify / express): `src/**/*.ts`
- Add the project's existing `paths`, `outDir`, `rootDir` from the original
  `tsconfig.json` if this is an existing project.

**For monorepos:**
Create `packages/typescript-config/` with shared tsconfig files. Copy the
relevant asset files there. Each app's `tsconfig.json` then extends the
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

**For both layouts:**

- **TypeScript version**: Always install the latest. Do not pin to a specific
  major — use whatever is current.
- **File extension convention**: Use `.js` for all config files when
  `"type": "module"` is set. Do NOT use `.mjs` extension.
- **No jsx/tsx in non-React projects**: For projects without React, the
  `include` pattern must be only `src/**/*.ts` — no `.tsx` or `.jsx`.

### 4. ESLint config

**For single-package projects:**

Create a single root `eslint.config.js` with all layers defined inline.
Read the relevant ESLint asset files and merge their content into one file.
Each layer is a separate const, grouped by a comment header:

```js
import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import * as depend from "eslint-plugin-depend";
import { importX } from "eslint-plugin-import-x";
import onlyWarn from "eslint-plugin-only-warn";
import * as perfectionist from "eslint-plugin-perfectionist";
import promise from "eslint-plugin-promise";
import regexp from "eslint-plugin-regexp";
import security from "eslint-plugin-security";
import * as sonarjs from "eslint-plugin-sonarjs";
import unicorn from "eslint-plugin-unicorn";
import unusedImports from "eslint-plugin-unused-imports";
import { globalIgnores } from "eslint/config";
import * as tseslint from "typescript-eslint";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// ---- Base config ----
const baseConfig = [
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  depend.configs["flat/recommended"],
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  perfectionist.configs["recommended-natural"],
  security.configs.recommended,
  promise.configs["flat/recommended"],
  regexp.configs.recommended,
  sonarjs.configs.recommended,
  unicorn.configs.recommended,
  {
    languageOptions: {
      parserOptions: { projectService: true },
    },
    plugins: { onlyWarn, "unused-imports": unusedImports },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "import-x/no-default-export": "error",
      "import-x/order": "off",
      "promise/no-multiple-resolved": "error",
      "promise/prefer-await-to-callbacks": "error",
      "promise/prefer-await-to-then": "error",
      "promise/prefer-catch": "error",
      "promise/spec-only": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          vars: "all",
          varsIgnorePattern: "^_",
        },
      ],
    },
    settings: {
      "import-x/resolver": {
        node: true,
        typescript: { project: ["**/tsconfig.json"] },
      },
    },
  },
  prettier,
  globalIgnores(["dist/**", ".agents/**"]),
];

// ---- Next.js config ----
const nextjsConfig = [
  ...nextVitals,
  ...nextTs,
  {
    files: [
      "**/page.tsx",
      "**/layout.tsx",
      "**/not-found.tsx",
      "**/error.tsx",
      "**/loading.tsx",
      "next.config.*",
      "eslint.config.*",
    ],
    rules: { "import-x/no-default-export": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
];

export default [...baseConfig, ...nextjsConfig];
```

Combine imports from all needed layers at the top. Always spread
`baseConfig` first. The specific framework/exports vary by detection (see
framework detection table in the [Detection logic](#2-per-package-framework-detection) section).

If Tailwind is detected alongside a React-based framework, add a
`// ---- Tailwind config ----` section with the same content as
`assets/eslint/tailwind.js`.

**Add per-detection `globalIgnores` entries** based on the detected
framework and package manager:

| Detection          | `globalIgnores` entries                                                   |
| ------------------ | ------------------------------------------------------------------------- |
| Next.js            | `".next/**"`, `"out/**"`, `"build/**"`, `"next-env.d.ts"`                 |
| TanStack Start     | `"**/routeTree.gen.ts"`, `".netlify/**"`, `".output/**"`, `".tanstack/**"`, `".vinxi/**"`, `"dist-ssr/**"` |
| Package manager    | Lockfile from [detection table](#2-package-manager-detection)             |

Merge these into the existing `globalIgnores()` call (or add a separate one).
The `base.js` asset already includes universal entries (`dist/**`,
`.agents/**`), and framework-specific asset files already include their own
entries when composed as separate config objects.

**For monorepos:**
Create `packages/eslint-config/` with shared config files. Copy the relevant
asset files there (exporting `base.js`, `react.js`, `node.js`, etc.).
Each app's `eslint.config.js` imports from the shared package:

```js
import base from "@workspace/eslint-config/base.js";
import nextjs from "@workspace/eslint-config/nextjs.js";

export default [...base, ...nextjs];
```

Do **not** create root-level `eslint.config.js` for monorepos — Turborepo
recommends against it (causes cache misses).

### 5. Prettier

Copy `assets/prettier/.prettierrc.json` to `<project-root>/.prettierrc.json`.
If Tailwind is detected, merge the fields from
`assets/prettier/tailwind.json` into the base config so the
final file includes `"plugins": ["prettier-plugin-tailwindcss"]` and
`"tailwindFunctions"`. Also add a `tailwindStylesheet` field with the
correct path to the project's main CSS entry — detect the actual CSS
entry file in the project (look for `globals.css`, `index.css`, `styles.css` in
common locations) and use its path relative to the project/package root. Always
use the `.json` extension — do NOT omit it.

Also create a `.prettierignore` with **universal** entries and
**per-detection** additions:

**Universal** (always include):
```
.agents
dist
coverage
```

**Per-detection** (add based on detected framework and package manager):

| Detection          | `.prettierignore` entries                                                    |
| ------------------ | ---------------------------------------------------------------------------- |
| Next.js            | `.next`, `out`, `build`                                                      |
| TanStack Start     | `**/routeTree.gen.ts`                                                        |
| Package manager    | Lockfile from [detection table](#2-package-manager-detection)                |

### 6. Knip

Run `<package-manager> create @knip/config` to generate a `knip.json`
tailored to the project's detected frameworks and structure. Then merge
`".agents/**"` into the `ignore` field — at root level for single-package
projects, or under `workspaces["."].ignore` for monorepos (the `"."`
workspace is the root).

### 7. Add dependencies

Run `<package-manager> add -D` to install the packages matching the detected layers. The
reference doc `eslint.md` lists every package grouped by layer. Install only
what's needed based on detection.

**Version policy**: Always install the latest version of every package. Do
not pin to specific versions unless the user explicitly requests a particular
version.

### 8. Add scripts to package.json

**Always create or update** the target project's `package.json` with scripts.
Do not skip this step — every project needs a `package.json` with scripts for
the code quality tooling to be usable.

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

### 9. Add CI workflow (optional, suggest to user)

Suggest adding a `.github/workflows/ci.yaml` that runs lint, format,
typecheck, and knip on push/PR. Do NOT create this file without asking —
some users have existing CI pipelines.

## Example scenarios

### Plain TS library (single-package)

- Detection: no framework deps, no tailwind
- Configs: single `eslint.config.js` with base + node sections, single
  `tsconfig.json` with base + node compilerOptions merged by layer
- Installed packages: core 9 + node plugins

### Next.js app with Tailwind (single-package)

- Detection: next, tailwindcss
- Configs: single `eslint.config.js` with base + nextjs + tailwind sections,
  single `tsconfig.json` with base + react + nextjs compilerOptions merged,
  `.prettierrc.json` (with tailwind plugin merged)
- Installed packages: core 9 + react/next + tailwind

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
- Installed packages: core 9 + all react + all node + tailwind
