---
"@udohjeremiah/moniq": minor
---

Detect `deno` as a package manager. Supports lock-file (`deno.lock`), config-file (`deno.json`, `deno.jsonc`), and `package.json` `packageManager` field detection. Workspace discovery reads `deno.json` workspace field (array or `{ members: [...] }` form) and globs patterns. `moniq init` uses `deno add -D npm:@udohjeremiah/moniq` for installation and handles Deno-native projects without a `package.json` by defaulting to `moniq.config.mts`.
