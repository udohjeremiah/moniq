# TypeScript Configuration Reference

## Version

Always use the latest available version of TypeScript. Do not pin to a
specific major release — install whatever is current. The skill's configs
target the latest TypeScript features (`noUncheckedSideEffectImports`,
improved `isolatedModules` handling, etc.).

## Philosophy

The tsconfig assets follow a "maximum strictness by default" philosophy. Every safety-check compiler option is enabled. Projects can relax individual settings as needed, but starting strict prevents entire categories of bugs.

## Config hierarchy

```
base.json
├── node.json
│   ├── fastify.json
│   └── express.json
└── react.json
    ├── nextjs.json
    └── tanstack-start.json
```

## Base config (`base.json`)

All strict flags enabled:

- `strict: true` — Enables all `--strict*` family options.
- `strictNullChecks: true` — Explicit null handling.
- `noUncheckedIndexedAccess: true` — Accessing an index signature returns `T | undefined`.
- `noUncheckedSideEffectImports: true` — Ensures all side-effect imports are intentional.
- `noUnusedLocals: true` — Catches dead code.
- `noUnusedParameters: true` — Catches unused function parameters.
- `noFallthroughCasesInSwitch: true` — Exhaustive switch handling.
- `noImplicitOverride: true` — Requires `override` keyword when extending methods.
- `noImplicitReturns: true` — Every code path must return.
- `noPropertyAccessFromIndexSignature: true` — Forces `obj["key"]` over `obj.key` for index signatures.
- `isolatedModules: true` — Required for build tools like esbuild, SWC, Babel with `isolatedModules`.

## React variant (`react.json`)

- `jsx: "react-jsx"` — React 19 automatic JSX transform (no need to `import React`).
- `moduleResolution: "bundler"` — Required by bundlers (Vite, webpack, Turbopack).
- `noEmit: true` — The bundler handles output.

## Next.js variant (`nextjs.json`)

- Extends `react.json`.
- Adds `plugins: [{ name: "next" }]` for VS Code IntelliSense.
- Adds `incremental: true` for faster builds.
- Includes `next-env.d.ts` and `.next/types/**/*.ts`.

## TanStack Start variant (`tanstack-start.json`)

- Extends `react.json`.
- Adds `types: ["vite/client"]` for Vite-specific types.
- Adds `allowImportingTsExtensions: true` — TanStack Start uses `.ts` imports in source.

## Node variant (`node.json`)

- `module: "NodeNext"` / `moduleResolution: "NodeNext"` — For direct Node.js execution.
- `types: ["node"]` — Node.js type definitions.

## Per-package composition

Each package/application in a monorepo extends the appropriate variant and adds:

- `paths` — Path aliases matching the runtime/eslint resolver
- `outDir` / `rootDir` — Build output configuration
- `include` / `exclude` — Source file scoping
