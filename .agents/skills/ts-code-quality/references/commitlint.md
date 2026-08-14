# Commitlint Configuration Reference

## Version policy

Always install the latest published version of commitlint as caret ranges — e.g.
`"@commitlint/cli": "^19"` and `"@commitlint/config-conventional": "^19"`
(whichever major is latest). Never pin an exact version or a minor/patch caret
range.

## What commitlint does

Commitlint lints commit messages against the
[Conventional Commits](https://www.conventionalcommits.org/) convention
(`feat:`, `fix:`, `chore:`, etc.). Combined with lefthook's `commit-msg` hook
it enforces message format on every commit, and in CI it enforces it on every
push and pull request.

## Configuration

Copy `assets/commitlint/.commitlintrc.json` to
`<project-root>/.commitlintrc.json`:

```json
{
  "extends": ["@commitlint/config-conventional"]
}
```

Place it at the repository root — even in a monorepo, since commit messages are
a repository-level concern.

Commitizen (the interactive commit prompt) needs a block in the root
`package.json`:

```json
{
  "config": {
    "commitizen": {
      "path": "cz-conventional-changelog"
    }
  }
}
```

## Rules

The `config-conventional` preset is the baseline. Extend or override rules in
the config file when needed — e.g. to allow additional scopes or custom types:

```json
{
  "extends": ["@commitlint/config-conventional"],
  "rules": {
    "scope-enum": [2, "always", ["ui", "api", "db", "cli"]]
  }
}
```

See commitlint's rules reference for the full rule list and severities.

## Integration

- **Lefthook** — the `commit-msg` hook runs `commitlint --edit {1}` where `{1}`
  is the file holding the proposed commit message
  (see `assets/lefthook/lefthook.yml`).
- **CI** — `wagoid/commitlint-github-action` validates all PR commit messages
  against `configFile` (see the suggested `ci.yaml`). It lints commits over a
  `--from`/`--to` range, which requires a full clone, so check out with
  `fetch-depth: 0`.
