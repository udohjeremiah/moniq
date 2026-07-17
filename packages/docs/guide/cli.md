# CLI Commands

## `moniq init`

Install Moniq and scaffold a starter configuration.

```bash
moniq init [options]
```

### Options

| Option          | Description                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| `--lang <type>` | Configuration language: `ts`, `js`, `mjs`, `cjs`, `mts`, or `cts`. Defaults to the detected workspace type. |

### Notes

`init` automatically:

- Detects your package manager.
- Detects workspace packages.
- Installs Moniq as a development dependency.
- Creates a starter configuration.

## `moniq check`

Validate the workspace against all configured policies.

```bash
moniq check [options]
```

### Options

| Option              | Description                                            |
| ------------------- | ------------------------------------------------------ |
| `--format <format>` | Output format: `pretty` (default), `json`, or `sarif`. |

## `moniq fix`

Validate the workspace and apply safe autofixes.

```bash
moniq fix [options]
```

Only policies with `autofix: true` are modified.

### Options

| Option              | Description                                            |
| ------------------- | ------------------------------------------------------ |
| `--dry-run`         | Preview changes without writing files.                 |
| `--format <format>` | Output format: `pretty` (default), `json`, or `sarif`. |

## `moniq doctor`

Verify that Moniq can detect and load your workspace correctly.

```bash
moniq doctor
```

Reports issues related to:

- Workspace detection
- Configuration loading
- Environment setup

## Global Flags

| Flag        | Description                 |
| ----------- | --------------------------- |
| `--help`    | Show help information.      |
| `--version` | Show the installed version. |
