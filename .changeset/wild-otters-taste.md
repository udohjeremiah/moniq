---
"@udohjeremiah/moniq": patch
---

Fix `moniq init` failing on Windows with `spawn pnpm ENOENT` by spawning package manager commands through a shell.
