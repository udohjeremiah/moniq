# Configuration

## Config File

Moniq expects a single `moniq.config.*` file at the workspace root.

Supported extensions:

- `ts`
- `js`
- `mts`
- `cts`
- `mjs`
- `cjs`

## Basic Structure

```ts
import { defineConfig } from "@udohjeremiah/moniq";

export default defineConfig({
  // Policy domains
});
```

## `defineConfig()`

`defineConfig()` provides type inference and editor autocompletion.

It returns the configuration unchanged at runtime.

Using it is recommended, but not required.

```ts
import { defineConfig } from "@udohjeremiah/moniq";

export default defineConfig({
  // ...
});
```
