# Knip Configuration Reference

## What Knip does

Knip is a dead-code analysis tool. It finds:

- Unused files, exports, and classes
- Unused dependencies in `package.json`
- Unlisted dependencies that are actually used
- Duplicate exports

## Generating the config

Run `<package-manager> create @knip/config` at the project root. This detects the
project's frameworks, tooling, and structure based on `package.json` and
generates a `knip.json` with appropriate entry and project patterns.

## Customization patterns

### Tags for selective analysis

Use tags to mark entry points or exports for analysis:

```json
{
  "tags": ["-lintignore"]
}
```

### Ignoring dependencies

Dependencies that are loaded dynamically (e.g., database adapters) need manual ignoring:

```json
{
  "ignoreDependencies": ["@better-auth/mongo-adapter"]
}
```

## Integration

Add a script to `package.json`:

```json
{
  "scripts": {
    "knip": "knip"
  }
}
```

## Knip works well with monorepos

Knip natively supports monorepo workspaces. Run `knip` from the root to analyze all packages, or per-package with `--workspace`.
