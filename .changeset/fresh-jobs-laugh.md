---
"@udohjeremiah/moniq": minor
---

feat: add bun package manager support

- Detect bun via `bun.lock`/`bun.lockb` lock files, `packageManager` field, and `npm_config_user_agent`
- Discover bun workspaces by resolving globs from `package.json` workspaces field using Node 22+ native `fs.glob`
- Install package with `bun add --dev` during `moniq init`
- `bunx` already supported in `bin()` wrapper stripping
