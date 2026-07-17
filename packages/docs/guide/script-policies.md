# Script Policies

The `scripts` policy domain validates the `scripts` field of `package.json`
files across your workspace.

Each key under `scripts` is the name of a package script (for example, `"build"`
or `"lint"`). Its value is either a `ScriptPolicy` or an array of
`ScriptPolicy`s.

## `ScriptPolicy`

| Option                | Type                           | Default   | Description                                                              |
| --------------------- | ------------------------------ | --------- | ------------------------------------------------------------------------ |
| `required`            | `boolean`                      | `true`    | Whether the script must exist                                            |
| `include`             | `string[]`                     | `["*"]`   | Workspace packages this policy applies to                                |
| `exclude`             | `string[]`                     | `[]`      | Workspace packages excluded from this policy (evaluated after `include`) |
| `command`             | `string \| RegExp \| function` | —         | Expected command (exact string, `RegExp`, or predicate)                  |
| `allowCustomCommands` | `string[]`                     | `[]`      | Workspace packages allowed to use a different command                    |
| `autofix`             | `boolean`                      | `false`   | Apply safe fixes with `moniq fix` (string commands only)                 |
| `severity`            | `"error" \| "warn" \| "off"`   | `"error"` | Violation severity                                                       |
| `description`         | `string`                       | —         | Additional context shown in diagnostics                                  |

## Policy Matching

Package paths are relative to the workspace root.

When multiple policies are defined for the same script:

- Policies are evaluated **in order**.
- The **first matching policy** is used.
- Think of it like a `switch` statement—place the most specific policies first
  and the catch-all last.

Special glob values:

| Value | Matches                           |
| ----- | --------------------------------- |
| `"."` | Workspace root only               |
| `"*"` | Every package, including the root |

## Examples

### `required`

Require every package to expose a `build` script.

```ts
export default defineConfig({
  scripts: {
    build: {
      required: true,
    },
  },
});
```

### `include`

Apply a policy only to selected packages.

```ts
export default defineConfig({
  scripts: {
    build: {
      include: ["packages/*"],
      command: "tsup",
    },
  },
});
```

### `exclude`

Exclude specific packages after matching `include`.

```ts
export default defineConfig({
  scripts: {
    build: {
      include: ["*"],
      exclude: ["packages/legacy"],
      command: "tsup",
    },
  },
});
```

### `command` (string)

Require an exact command.

```ts
export default defineConfig({
  scripts: {
    build: {
      command: "tsup",
    },
  },
});
```

### `command` (`RegExp`)

Match commands using a regular expression.

```ts
export default defineConfig({
  scripts: {
    lint: {
      command: /^eslint\b/,
    },
  },
});
```

Remember to anchor your expression so the binary is matched rather than
appearing somewhere later in the command.

### `command` (`bin()`)

Match only the executable instead of the entire command. Arguments and flags may
vary as long as the same binary is used.

```ts
import { defineConfig, bin } from "@udohjeremiah/moniq";

export default defineConfig({
  scripts: {
    lint: {
      command: bin("eslint"),
    },
  },
});
```

For example:

```bash
eslint .
eslint src --fix
eslint "src/**/*.ts"
```

would all satisfy:

```ts
command: bin("eslint");
```

### `allowCustomCommands`

Allow selected packages to use a different command.

```ts
export default defineConfig({
  scripts: {
    build: {
      command: "tsup",
      allowCustomCommands: ["packages/legacy"],
    },
  },
});
```

### `autofix`

Autofixes are only available when `command` is an exact string.

```ts
export default defineConfig({
  scripts: {
    build: {
      command: "tsup",
      autofix: true,
    },
  },
});
```

Run `moniq fix` to apply available autofixes.

### `severity`

Use `"warn"` to report violations without failing the process.

```ts
export default defineConfig({
  scripts: {
    test: {
      required: true,
      severity: "warn",
    },
  },
});
```

### `description`

Displayed alongside diagnostics to explain why the policy exists.

```ts
export default defineConfig({
  scripts: {
    build: {
      command: "tsup",
      description: "All packages are built with tsup.",
    },
  },
});
```

### Multiple policies

Apply different commands to different package groups.

> [!warning]
> **Policies are matched top-to-bottom.**
> A catch-all (`include: ["*"]`) placed first prevents later policies from ever
> matching. Put the most specific policies first and the catch-all last.

```ts
export default defineConfig({
  scripts: {
    build: [
      // 1. Legacy packages use rollup (checked first)
      {
        include: ["packages/legacy"],
        command: "rollup",
      },
      // 2. Everything else uses tsup
      {
        include: ["*"],
        command: "tsup",
      },
    ],
  },
});
```

If a package matches no policy, that script is not validated.

```ts
export default defineConfig({
  scripts: {
    build: [
      // Only packages under packages/ are validated.
      { include: ["packages/*"], command: "tsup" },

      // Packages outside packages/ match no policy,
      // so their build script is not validated.
    ],
  },
});
```
