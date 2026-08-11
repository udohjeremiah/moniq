---
"@udohjeremiah/moniq": minor
---

Introduce the plugin architecture. A public plugin contract is now available from `@udohjeremiah/moniq/plugins` (via `@moniq/config/plugins`), letting third parties define custom policy domains with TypeBox schemas and custom validators. The built-in `files` and `scripts` domains are reimplemented as plugins using the same contract. `moniq check` and `moniq fix` are wired to plugin reports, including post-fix exit codes and packages without a `scripts` field.
