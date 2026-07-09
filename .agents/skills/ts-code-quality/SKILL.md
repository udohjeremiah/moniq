---
name: ts-code-quality
description: >-
  Sets up and enforces ESLint, Prettier, and TypeScript configuration for
  TypeScript projects, including VS Code settings and extension
  recommendations. Use this when the user wants to configure linting,
  formatting, or type-checking rules, set up a .vscode folder, add or
  recommend ESLint plugins, or improve code quality tooling in a TypeScript
  project. Does not handle commit hooks, commitlint, or lint-staged — that's
  a separate skill.
---

# TS Code Quality Skill

Sets up best-in-class ESLint, Prettier, TypeScript, EditorConfig, and Knip
configuration for TypeScript projects, plus matching VS Code
settings and extension recommendations.

## Detection logic (run first)

Run detection per **package** (each workspace in a monorepo, or once for a
single-repo project). Read the target project's `package.json`(s) and
workspace config first.

### 1. Is this a monorepo?

Check if `pnpm-workspace.yaml` has a `packages` field listing multiple
workspace directories, or if `turbo.json` defines workspace tasks via a
`pipeline` or `tasks` block. If either has workspace definitions:

- Per-package detection runs for each workspace to choose the right
  ESLint + tsconfig variant.
- Create shared config packages (`packages/eslint-config/`,
  `packages/typescript-config/`) instead of using root-level configs.
- Do **not** create root-level `tsconfig.json` or `eslint.config.js` —
  Turborepo recommends against them as they cause cache misses.

### 2. Per-package framework detection

Read `package.json` `dependencies` and `devDependencies`:

| If dep found                 | ESLint layer           | TypeScript config              |
| ---------------------------- | ---------------------- | ------------------------------ |
| `next`                       | base + nextjs          | `tsconfig.nextjs.json`         |
| `@tanstack/react-start`      | react + tanstack-start | `tsconfig.tanstack-start.json` |
| `fastify`                    | node + fastify         | `tsconfig.fastify.json`        |
| `express`                    | node + express         | `tsconfig.express.json`        |
| `react` (none of above)      | react only             | `tsconfig.react.json`          |
| none, but `"type": "module"` | node only              | `tsconfig.node.json`           |
| otherwise                    | base only              | `tsconfig.base.json`           |

> **Important:** `next` already bundles React + React Hooks rules via `eslint-config-next`.
> Do **not** add the `react` layer for Next.js projects — only `base + nextjs`.

### 3. Tailwind check

If `tailwindcss` is in deps AND the framework layer is react-based (react /
nextjs / tanstack-start):

- Merge `assets/eslint/tailwind.config.js`
- Merge `assets/prettier/.prettierrc.tailwind.json`'s fields into the
  base `.prettierrc.json` (adds `prettier-plugin-tailwindcss` and
  `tailwindFunctions`). Also add `tailwindStylesheet` pointing to the
  project's main CSS entry — detect the actual CSS entry file in the
  project (look for files like `globals.css`, `index.css`, `styles.css` in
  common locations) and use its path relative to the project/package root.

### 4. Package manager detection

**Default to pnpm** unless the user explicitly states they use npm or yarn.
Read `packageManager` field or check for lock files to confirm. Use the
detected manager in all install commands and script examples.

## Composition model

Config composition differs between monorepo and single-package projects:

**Monorepo** (Turborepo + pnpm workspaces):
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

If `turbo.json` or `pnpm-workspace.yaml` already exist:

- Add the new tasks (`lint`, `lint:fix`, `typecheck`, `format`, `knip`) to
  the existing `turbo.json` pipeline.
- Ensure `pnpm-workspace.yaml` includes the packages that need tooling.
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

**Tailwind CSS** — If Tailwind is detected, add `tailwindCSS.experimental.configFile`
pointing to the project's main CSS entry point. Detect the actual CSS entry
file in the project (look for `globals.css`, `global.css`, `index.css`,
`styles.css` in common locations) and use its path relative to the project
or package root.

**TanStack Start** — If `@tanstack/react-start` is detected, merge these
entries to ignore the generated route file (`search.exclude` already
covered by base settings):

```json
{
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
  globalIgnores(["dist/**", "build/**", ".next/**", "out/**"]),
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
`baseConfig` first. The specific framework/exports vary by detection:

Detection table for ESLint layers:

| If dep found                 | Layers                        |
| ---------------------------- | ----------------------------- |
| `next`                       | base + nextjs                 |
| `@tanstack/react-start`      | base + react + tanstack-start |
| `fastify`                    | base + node + fastify         |
| `express`                    | base + node + express         |
| `react` (none of above)      | base + react                  |
| none, but `"type": "module"` | base + node                   |
| otherwise                    | base                          |

If Tailwind is detected alongside a React-based framework, add a
`// ---- Tailwind config ----` section with the same content as
`assets/eslint/tailwind.config.js`.

> **Next.js note:** `eslint-config-next` already bundles React + React Hooks
> rules, so Next.js gets `base + nextjs` only — no separate react layer.
> TanStack Start IS NOT Next.js and still needs the react layer.

> **Important**: Now that there's no `eslint/` subdirectory, generated config
> files won't be picked up by the project's own ESLint. No need to add
> `eslint/` to `globalIgnores()`.

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
`assets/prettier/.prettierrc.tailwind.json` into the base config so the
final file includes `"plugins": ["prettier-plugin-tailwindcss"]` and
`"tailwindFunctions"`. Also add a `tailwindStylesheet` field with the
correct path to the project's main CSS entry — detect the actual CSS
entry file in the project (look for `globals.css`, `index.css`, `styles.css` in
common locations) and use its path relative to the project/package root. Always
use the `.json` extension — do NOT omit it.

Also create a `.prettierignore`:

```
dist
build
.next
out
pnpm-lock.yaml
**/routeTree.gen.ts
coverage
```

### 6. Knip

Run `pnpm create @knip/config` to generate a `knip.json` tailored to the
project's detected frameworks and structure. Add the script:

```json
"scripts": { "knip": "knip" }
```

### 7. Add dependencies

Run `pnpm add -D` to install the packages matching the detected layers. The
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
