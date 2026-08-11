# File Policies

The `files` policy domain validates workspace-relative files, directories, and
symlinks across your workspace.

Each key under `files` is a workspace-relative file path. Its value is either a
`FilePolicy` or an array of `FilePolicy`s.

## `FilePolicy`

`FilePolicy` extends the shared [`Policy`](/guide/configuration#policy),
so it inherits its options.

| Option    | Type                                 | Default | Description                                                                             |
| --------- | ------------------------------------ | ------- | --------------------------------------------------------------------------------------- |
| `kind`    | `"file" \| "directory" \| "symlink"` | —       | Expected filesystem item kind. When omitted, any filesystem item kind is accepted.      |
| `content` | `string \| RegExp`                   | —       | Expected file contents (exact string or `RegExp`)                                       |
| `autofix` | `boolean`                            | `false` | Automatically create, remove, or overwrite files with `moniq fix` (string content only) |

## Examples

### `presence`

Control whether a file must exist, may exist, or must not exist.

- `"required"` — the file must exist.
- `"optional"` — the file may exist.
- `"forbidden"` — the file must not exist.

```ts
export default defineConfig({
  files: {
    "README.md": {
      presence: "required",
    },
  },
});
```

### `include`

Apply a policy only to selected packages.

```ts
export default defineConfig({
  files: {
    "README.md": {
      include: ["packages/*"],
    },
  },
});
```

### `exclude`

Exclude specific packages after matching `include`.

```ts
export default defineConfig({
  files: {
    "tsconfig.json": {
      include: ["*"],
      exclude: ["packages/legacy"],
    },
  },
});
```

### `content` (string)

Require file contents to exactly match a string.

```ts
export default defineConfig({
  files: {
    ".nvmrc": {
      kind: "file",
      content: "24",
    },
  },
});
```

### `content` (`RegExp`)

Match file contents using a regular expression.

```ts
export default defineConfig({
  files: {
    "README.md": {
      kind: "file",
      content: /^# /,
    },
  },
});
```

### `autofix`

Autofixes are limited to the following operations:

- create missing `presence: "required"` files or directories (only when `kind`
  is explicitly set to `"file"` or `"directory"`)
- remove `presence: "forbidden"` items
- overwrite files whose `content` is an exact string when their contents differ

> [!tip]
> Run `moniq fix` to apply available autofixes.

```ts
export default defineConfig({
  files: {
    ".env": {
      presence: "forbidden",
      autofix: true,
    },
    ".nvmrc": {
      kind: "file",
      content: "24",
      autofix: true,
    },
  },
});
```

### `severity`

Use `"warn"` to report violations without failing the process.

```ts
export default defineConfig({
  files: {
    ".editorconfig": {
      include: ["."],
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
  files: {
    ".editorconfig": {
      include: ["."],
      description:
        "The workspace should use a single shared EditorConfig file.",
    },
  },
});
```
