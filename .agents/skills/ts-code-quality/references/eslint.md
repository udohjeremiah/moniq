# ESLint Configuration Reference

## Version policy

Install the latest version of every ESLint package. Do not pin to specific
versions. The examples in this reference show `^x` as a reminder to always
get the latest.

## Package choices

### Core stack

- **@eslint/js** — ESLint's built-in recommended rules (`js.configs.recommended`).
- **typescript-eslint** — The unified package replacing the old `@typescript-eslint/eslint-plugin` + `@typescript-eslint/parser` split. Uses `strictTypeChecked` + `stylisticTypeChecked` configs with `projectService: true` for type-aware linting.
- **eslint-config-prettier** — Disables all ESLint rules that conflict with Prettier. Must be last in the flat config array.
- **eslint-plugin-only-warn** — Downgrades all errors to warnings, useful during migration or as a safety net.
- **eslint-plugin-unused-imports** — Detects and auto-fixes unused imports. `@typescript-eslint/no-unused-vars` is disabled in favor of this plugin's finer-grained control.

### Import analysis

- **eslint-plugin-import-x** — The maintained fork of `eslint-plugin-import`. Provides import resolution, no-extraneous-dependencies enforcement. Used with `eslint-import-resolver-typescript` for `tsconfig.json` path resolution.
- **eslint-import-resolver-typescript** — Resolves TypeScript paths in import resolution.

### Code quality & correctness

- **eslint-plugin-depend** — Detects problematic dependency usage (e.g., deprecated packages, mismatched versions).
- **eslint-plugin-perfectionist** — Natural sorting for imports, object keys, enums, etc. The `recommended-natural` config is used. `import-x/order` is disabled because perfectionist handles this more comprehensively.
- **eslint-plugin-sonarjs** — Code quality rules (cognitive complexity, duplicated code, etc.).
- **eslint-plugin-security** — Detects potential security vulnerabilities (regex DoS, path traversal, etc.).
- **eslint-plugin-unicorn** — Modern best practices (better-regex, explicit-length-check, no-array-for-each, etc.).

### React / JSX layer

- **@eslint-react/eslint-plugin** — React-specific linting from the eslint-react project. Provides `configs["strict-type-checked"]`.
- **eslint-plugin-jsx-a11y** — Accessibility rules for JSX. Uses `flatConfigs.recommended`.
- **eslint-plugin-react-hooks** — Rules of Hooks and exhaustive-deps checks.

### Next.js layer

- **eslint-config-next** — Next.js-specific config (pages router, App Router, data fetching, image optimization). Spreads its exported array into the flat config.

### Node / backend layer

- **eslint-plugin-n** — Node.js rules (correct `require`/`import`, supported features, file extensions).
- **eslint-plugin-promise** — Promise best practices (prefer-await-to-then, catch-or-return).
- **eslint-plugin-regexp** — Regex correctness and style rules.

### Tailwind CSS layer (frontend only)

- **eslint-plugin-tailwindcss** — Class ordering, no-custom-classname, no-contradicting-classname, no-unnecessary-arbitrary-value. Uses `flat/recommended` config. The v4 release supports Tailwind CSS v4 syntax.
- **prettier-plugin-tailwindcss** — Prettier plugin that auto-sorts Tailwind classes in JSX/HTML.

### Monorepo layer

- Added **eslint-plugin-package-json** (by michaelfaith) — Validates `package.json` integrity across workspace packages. Recommended config checks fields, scripts, dependencies, exports, and repository metadata.

### What is NOT included (handled by a separate commit hooks skill)

- `husky`, `lint-staged`, `commitlint`, `commitizen` — These are out of scope.

## Flat config composition model

The skill composes configs by spreading arrays. The order matters:

1. **base.js** — @eslint/js + typescript-eslint + all shared plugins
2. **framework layer** (one of): react / nextjs / tanstack-start / node / fastify / express
3. **tailwind.js** — only if Tailwind detected AND react-based framework
4. **eslint-config-prettier** — always last to disable conflicting rules

### Type-checked configs

The base config uses `strictTypeChecked` and `stylisticTypeChecked`. `strictTypeChecked` is a superset of `recommendedTypeChecked` that adds stricter rules for projects with strong TypeScript expertise. Combined with `projectService: true`, the parser delegates to TypeScript's project service for type information without needing manual `tsconfig.json` paths.

## Rule rationale

### Typed linting (`projectService: true`)

The base config uses `tseslint.configs.strictTypeChecked` and `tseslint.configs.stylisticTypeChecked` with `languageOptions.parserOptions.projectService: true`. This enables TypeScript's type checker during linting, unlocking rules that can catch real bugs type-checking alone might miss (e.g., `@typescript-eslint/no-floating-promises`, `@typescript-eslint/no-misused-promises`). See [typescript-eslint typed linting docs](https://typescript-eslint.io/getting-started/typed-linting).

## Express-specific tuning

Express middleware and route handlers follow patterns that differ from general Node:

- `security/detect-non-literal-fs-filename` and `security/detect-non-literal-require` are warned (not errored) to allow dynamic middleware loading patterns while still flagging them for review.
- `security/detect-object-injection` is re-enabled at warn level for Express (request body/params access).
- No separate Express ESLint plugin exists; tuning is done via eslint-plugin-n + eslint-plugin-security rule options.

## Fastify-specific tuning

Fastify uses async route handlers naturally:

- `promise/prefer-await-to-then` and `promise/prefer-await-to-callbacks` are errors instead of warnings for Fastify projects.
- `import-x/no-default-export` is disabled (Fastify plugins and app entry points conventionally use default exports, though named exports are preferred for shared utilities).
- No dedicated Fastify ESLint plugin exists; tuning is done via existing plugin rule options.
