# Configuration

## Config File

Moniq loads a single `moniq.config.*` file from the workspace root.

Supported extensions:

- `ts`
- `js`
- `mts`
- `cts`
- `mjs`
- `cjs`

## Basic Structure

```ts
export default {
  // Policy domains
};
```

## `defineConfig()`

`defineConfig()` provides type inference and editor autocompletion.

It returns the configuration unchanged at runtime, so using it is optional but
recommended.

```ts
import { defineConfig } from "@udohjeremiah/moniq";

export default defineConfig({
  // ...
});
```

## Policy Matching

Package paths are always relative to the workspace root.

Each policy accepts either a single policy object or an array of policy objects.

When using the array form, Moniq evaluates policy objects **top-to-bottom** and
uses the **first matching policy**.

Think of it like a `switch` statement: list the most specific policies first and
the catch-all last.

Special glob values:

| Value | Matches                           |
| ----- | --------------------------------- |
| `"."` | Workspace root only               |
| `"*"` | Every package, including the root |

For example:

```ts
export default defineConfig({
  scripts: {
    build: [
      // Checked first
      {
        include: ["packages/legacy"],
        command: "rollup",
      },
      // Fallback for everything else
      {
        include: ["*"],
        command: "tsup",
      },
    ],
  },
});
```

If the order were reversed, the `packages/legacy` policy is never evaluated
because `include: ["*"]` matches first:

```ts
export default defineConfig({
  scripts: {
    build: [
      // Matches every package
      {
        include: ["*"],
        command: "tsup",
      },
      // Never reached
      {
        include: ["packages/legacy"],
        command: "rollup",
      },
    ],
  },
});
```

If no policy matches, Moniq skips validation for that package.

```ts
export default defineConfig({
  scripts: {
    build: [
      // Only packages under packages/ are validated.
      {
        include: ["packages/*"],
        command: "tsup",
      },

      // Packages outside packages/ match no policy,
      // so Moniq skips validation for their build script.
    ],
  },
});
```
