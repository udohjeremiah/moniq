# Configuration

## Config File

Moniq loads a single `moniq.config.*` file from the workspace root.

Supported extensions:

- `js`
- `cjs`
- `mjs`
- `ts`
- `cts`
- `mts`

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

## `Policy`

Every policy uses the shared `Policy` options below. Plugin authors import
`Policy` from `@udohjeremiah/moniq/plugins` and extend it with their schema (see
[Plugins](/guide/plugins)) to inherit the same matching and diagnostic behavior.

| Option        | Type                                      | Default      | Description                                                              |
| ------------- | ----------------------------------------- | ------------ | ------------------------------------------------------------------------ |
| `presence`    | `"required" \| "optional" \| "forbidden"` | `"required"` | Whether the item must exist, may exist, or must not exist                |
| `include`     | `string[]`                                | `["*"]`      | Workspace packages this policy applies to                                |
| `exclude`     | `string[]`                                | `[]`         | Workspace packages excluded from this policy (evaluated after `include`) |
| `severity`    | `"error" \| "warn" \| "off"`              | `"error"`    | Controls how violations are reported                                     |
| `description` | `string`                                  | —            | Human-readable explanation displayed alongside diagnostics               |

## Policy Matching

Domain keys are resolved relative to each matched package. Package paths used
for `include` and `exclude` are always relative to the workspace root.

Each policy accepts either a single policy object or an array of policy objects.

When an array is used, Moniq evaluates policies **top-to-bottom** and uses the
**first matching policy**.

Think of it like a `switch` statement: put the most specific policies first and
the catch-all last.

Special glob values:

| Value  | Matches                                     |
| ------ | ------------------------------------------- |
| `"."`  | Workspace root only                         |
| `"*"`  | Every package, including the workspace root |
| `"**"` | Every package, excluding the workspace root |

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

If the order is reversed, the specific policy is never reached because
`include: ["*"]` matches first:

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
      // so Moniq skips validation for their `build` script.
    ],
  },
});
```
