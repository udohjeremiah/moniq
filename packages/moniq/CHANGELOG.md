# moniq

## 0.5.0

### Minor Changes

- a8ad8a7: feat: return structured Report from resolve() with summary and exit codes
  feat: add JSON and SARIF output formatters
  feat: add findWorkspaceRoot utility for workspace detection
  feat: scope loadConfig to workspace root only, with ConfigNotFoundError
  feat: add prepack script to bundle root README and LICENSE at publish time
  docs: update script-policies docs with first-match-wins semantics

## 0.4.0

### Minor Changes

- 098b9a7: Detect `deno` as a package manager. Supports lock-file (`deno.lock`), config-file (`deno.json`, `deno.jsonc`), and `package.json` `packageManager` field detection. Workspace discovery reads `deno.json` workspace field (array or `{ members: [...] }` form) and globs patterns. `moniq init` uses `deno add -D npm:@udohjeremiah/moniq` for installation and handles Deno-native projects without a `package.json` by defaulting to `moniq.config.mts`.

## 0.3.4

### Patch Changes

- 81db11c: Include root workspace package in init detection output, shown as `.` matching pnpm's convention.

  Align console output: remove indent on check scan line and doctor header, color severity icons to match badge colors, color package name in cyan in init install messages.

## 0.3.3

### Patch Changes

- c71fbb0: Replace Jiti with native import() to fix config loading failure when consumed as a bundled dependency. Add 'type': 'module' detection to init — generate .ts/.js when already set. Fix doctor output order (header first, INFO/WARN/ERROR sorted) and reclassify 'config found' from warn to info. Replace emoji with Unicode icons (✔ ✘ ⚠ ℹ).

## 0.3.2

### Patch Changes

- ef33081: Pin devDependency install to the running CLI version in moniq init, preventing version mismatches caused by npm propagation delays

## 0.3.1

### Patch Changes

- debe249: Add pnpm `-w` flag for workspace root installs, capture stderr on install failure, throw on unknown package manager instead of defaulting to pnpm, and bypass husky hooks in CI for changesets action

## 0.3.0

### Minor Changes

- 55a21ce: feat: add bun package manager support

  - Detect bun via `bun.lock`/`bun.lockb` lock files, `packageManager` field, and `npm_config_user_agent`
  - Discover bun workspaces by resolving globs from `package.json` workspaces field using Node 22+ native `fs.glob`
  - Install package with `bun add --dev` during `moniq init`
  - `bunx` already supported in `bin()` wrapper stripping

### Patch Changes

- bc27b93: fix workspace detection priority and install package during init

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
