[@udohjeremiah/moniq](../../modules.md) / [index](../index.md) / ScriptPolicy

# Interface: ScriptPolicy

Defined in: config/dist/index.d.ts:8

A single script policy configuration.

See the `scripts` field of `UserConfig` for usage.

## Properties

### allowCustomCommands?

> `optional` **allowCustomCommands?**: `string`[]

Defined in: config/dist/index.d.ts:13

Package globs that may define their own command for this script (no-op unless `command` is set).
Special values: `"."` for root only, `"*"` for all packages. Defaults to `[]`.

---

### autofix?

> `optional` **autofix?**: `boolean`

Defined in: config/dist/index.d.ts:18

Whether to autofix mismatched or missing scripts when running `moniq fix`.
Only applies when `command` is a plain string. Defaults to `false`.

---

### command?

> `optional` **command?**: `string` \| `RegExp` \| ((`command`) => `boolean`)

Defined in: config/dist/index.d.ts:23

The expected command — exact string, RegExp, or predicate like `bin("eslint")`.
When omitted, only existence is validated (subject to `required`).

---

### description?

> `optional` **description?**: `string`

Defined in: config/dist/index.d.ts:25

Human-readable explanation displayed alongside diagnostics.

---

### exclude?

> `optional` **exclude?**: `string`[]

Defined in: config/dist/index.d.ts:30

Package globs to exclude, evaluated after `include`.
Defaults to `[]`.

---

### include?

> `optional` **include?**: `string`[]

Defined in: config/dist/index.d.ts:36

Package globs this policy applies to.
Special values: `"."` for root only, `"*"` for all packages.
Defaults to `["*"]`.

---

### required?

> `optional` **required?**: `boolean`

Defined in: config/dist/index.d.ts:41

Whether the script must exist. If `false`, the script is optional.
Defaults to `true`.

---

### severity?

> `optional` **severity?**: `"error"` \| `"off"` \| `"warn"`

Defined in: config/dist/index.d.ts:46

Severity of violations: `"off"` (disabled), `"warn"`, or `"error"`.
Defaults to `"error"`.
