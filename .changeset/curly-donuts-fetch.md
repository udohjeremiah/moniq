---
"@udohjeremiah/moniq": minor
---

Rework the plugin engine into the new `@moniq/core` package, consolidating the previous `@moniq/config` and `@moniq/workspace` packages. `@moniq/plugins` now ships only the built-in `files` and `scripts` plugin pack, registered on import.

The plugin authoring API on `@udohjeremiah/moniq/plugins` is updated: `PolicyType` is replaced by the `Policy` type, and `Policy` is no longer exported from the main `@udohjeremiah/moniq` entry — import it from `@udohjeremiah/moniq/plugins` instead. Built-in policy options now carry JSDoc that surfaces in editor hover docs for config files.
