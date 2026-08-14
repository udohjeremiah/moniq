# Lefthook Configuration Reference

## Version policy

Always install the latest published version of lefthook as a caret range — e.g.
`"lefthook": "^2"` (whichever major is latest). Never pin an exact version or a
minor/patch caret range.

## What lefthook does

Lefthook manages git hooks from a single `lefthook.yml`. It runs quality gates
locally before commits and pushes: Prettier + ESLint on staged files, Commitizen
for interactive commit messages, commitlint for validation, and Knip + typecheck
before pushing.

## Installing and activating hooks

Install with `<package-manager> add -D lefthook`. The npm package installs the
hooks automatically via its `postinstall` script, so no `prepare` script is
needed.

**pnpm caveat** — pnpm blocks lifecycle scripts by default, so the postinstall
never runs and hooks are never installed unless `lefthook` is added to
`onlyBuiltDependencies`:

- In `pnpm-workspace.yaml` (if present):

  ```yaml
  onlyBuiltDependencies:
    - lefthook
  ```

- In the root `package.json` (if not using `pnpm-workspace.yaml`):

  ```json
  {
    "pnpm": {
      "onlyBuiltDependencies": ["lefthook"]
    }
  }
  ```

If hooks are ever missing (e.g. a fresh clone before install), run
`lefthook install` manually. Re-running `install` is not required after editing
`lefthook.yml` — the config is read on every hook run.

## Package manager substitution

The `lefthook.yml` asset uses the `<package-manager>` placeholder. Replace it
with the detected package manager. Bin invocations differ per manager:

| Package manager | Prettier / ESLint / Commitizen / commitlint |
| --------------- | ------------------------------------------- |
| pnpm            | `pnpm prettier ...`                         |
| yarn            | `yarn prettier ...`                         |
| bun             | `bunx prettier ...`                         |
| npm             | `npx prettier ...`                          |

Script invocations (`<package-manager> run knip`, `<package-manager> run
typecheck`) work unchanged for all managers (`npm run`, `pnpm run`, `yarn run`,
`bun run`).

## Structure

- **`pre-commit`** — `format` runs Prettier on staged files first, then `lint`
  runs ESLint with `--fix --max-warnings=0`. `priority` keeps the order when the
  hook runs commands in parallel; `stage_fixed: true` re-stages any fixes.
  The `glob` on `lint` filters which staged files are passed to ESLint, so
  non-JS/TS files never hit the "file ignored" warning (which would fail with
  `--max-warnings=0`).
- **`prepare-commit-msg`** — `commitizen` launches the interactive prompt
  (`cz --hook`) with `interactive: true`. `env: LEFTHOOK: 0` prevents the prompt
  from re-triggering hooks.
- **`commit-msg`** — `commitlint --edit {1}` validates the message file
  (`{1}` is the first git hook argument: the commit message file).
- **`pre-push`** — `knip` and `typecheck` run via their package.json scripts.

Templates: `{staged_files}` (staged files, filtered by the command's `glob`),
`{all_files}`, `{push_files}`, and `{1}`-`{n}` (git hook arguments).

## Verifying

- `lefthook validate` — check the config is well-formed.
- `lefthook run pre-commit` — run a hook's commands without committing.
- `lefthook install` — (re)install git hooks.
