# Script Policies

The `scripts` policy domain validates the `scripts` field of `package.json`
files across your workspace.

Each key under `scripts` is the name of a package script (for example, `"build"`
or `"lint"`). Its value is either a `ScriptPolicy` or an array of
`ScriptPolicy`s.

## `ScriptPolicy`

| Option                | Type                                      | Default      | Description                                                              |
| --------------------- | ----------------------------------------- | ------------ | ------------------------------------------------------------------------ |
| `presence`            | `"required" \| "optional" \| "forbidden"` | `"required"` | Whether the script must exist, may exist, or must not exist              |
| `include`             | `string[]`                                | `["*"]`      | Workspace packages this policy applies to                                |
| `exclude`             | `string[]`                                | `[]`         | Workspace packages excluded from this policy (evaluated after `include`) |
| `command`             | `string \| RegExp \| function`            | —            | Expected command (exact string, `RegExp`, or predicate)                  |
| `allowCustomCommands` | `string[]`                                | `[]`         | Workspace packages allowed to use a different command                    |
| `autofix`             | `boolean`                                 | `false`      | Apply safe fixes with `moniq fix` (string commands only)                 |
| `severity`            | `"error" \| "warn" \| "off"`              | `"error"`    | Violation severity                                                       |
| `description`         | `string`                                  | —            | Additional context shown in diagnostics                                  |

## Examples

### `presence`

Control whether a script must exist, may exist, or must not exist.

- `"required"` — the script must exist.
- `"optional"` — the script may exist.
- `"forbidden"` — the script must not exist.

```ts
export default defineConfig({
  scripts: {
    build: {
      presence: "required",
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

> [!tip]
> Remember to anchor your expression so the binary is matched rather than
> appearing somewhere later in the command.

```ts
export default defineConfig({
  scripts: {
    lint: {
      command: /^eslint\b/,
    },
  },
});
```

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

> [!tip]
> Run `moniq fix` to apply available autofixes.

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

### `severity`

Use `"warn"` to report violations without failing the process.

```ts
export default defineConfig({
  scripts: {
    test: {
      presence: "required",
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
