# moniq

## 0.2.0

### Minor Changes

- de95aa3: Add version display to banner, `--version` flag, and auto-detect TypeScript vs JavaScript for `moniq init`

## 0.1.1

### Patch Changes

- 922028a: feat: include MIT license in published package

## 0.1.0

### Minor Changes

- Initial release of moniq — a policy-driven workspace linter for JS/TS monorepos.

  - `moniq check` — validate workspace scripts against configured policies
  - `moniq fix` — autofix mismatched scripts with `--dry-run` preview
  - `moniq doctor` — detect configuration mistakes
  - `moniq init` — scaffold moniq.config.ts with `--lang` support
  - `defineConfig()` — type-safe config helper with full TypeScript inference
  - `bin("eslint")` — script policy matcher (strips wrappers, flags, env vars)
  - Workspace discovery via pnpm, npm, and yarn
  - Config resolution walks up from cwd (6 extensions supported)
  - Glob-based policy matching with `wildcard-match`
  - Pretty and JSON diagnostic formatters
  - Zero runtime dependencies — everything bundled inline
