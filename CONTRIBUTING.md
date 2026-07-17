# Contributing to Moniq

Thank you for your interest in contributing! Whether it's a bug report, feature
request, or pull request — all contributions are welcome.

Please note that this project is governed by a [Code of Conduct](CODE_OF_CONDUCT.md).
By participating, you are expected to uphold it.

## Table of Contents

- [Feature Requests & Bug Reports](#feature-requests--bug-reports)
- [Setting Up the Project Locally](#setting-up-the-project-locally)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## Feature Requests & Bug Reports

- **Feature requests**: Open a [GitHub Issue](https://github.com/udohjeremiah/moniq/issues/new)
  with the `enhancement` label. Describe the use case and the problem it solves.

- **Bug reports**: Open a [GitHub Issue](https://github.com/udohjeremiah/moniq/issues/new)
  with the `bug` label. Include steps to reproduce, expected behaviour, and
  actual behaviour.

- For quick questions or discussions, start a [GitHub Discussion](https://github.com/udohjeremiah/moniq/discussions).

## Setting Up the Project Locally

### Prerequisites

- **Node.js** 24+
- **pnpm** 11+
- **Git**

### Clone and Install

```bash
# Clone the repository
git clone https://github.com/udohjeremiah/moniq.git
cd moniq

# Install all dependencies (uses pnpm workspaces)
pnpm install

# Build all packages
pnpm run build
```

> **Note**: The project uses [pnpm workspaces](https://pnpm.io/workspaces) with
> [Turborepo](https://turborepo.dev). All dependencies are installed from the
> root — use the `-w` flag to add a root dependency (`pnpm add -D -w <pkg>`) and
> `--filter` to add a dependency to a specific package (`pnpm add --filter @moniq/core <pkg>`).
> You should never need to run `pnpm install` inside individual packages.

## Project Structure

```
moniq/
├── packages/
│   ├── cli/               # Command-line interface
│   ├── config/            # Configuration loading and validation
│   ├── core/              # Policy engine and diagnostics
│   ├── docs/              # VitePress documentation site
│   ├── eslint-config/     # Shared ESLint configuration preset
│   ├── moniq/             # Public-facing entry point
│   ├── typescript-config/ # Shared TypeScript configuration presets
│   └── workspace/         # Workspace and monorepo utilities
└── package.json           # Root workspace configuration
```

## Development Workflow

### Linting

```bash
# Lint all packages
pnpm run lint

# Auto-fix lint issues
pnpm run lint:fix
```

### Formatting

```bash
# Check formatting
pnpm run format

# Auto-fix format issues
pnpm run format:fix
```

### Type Checking

```bash
# Check all packages
pnpm run typecheck

# Check a specific package
pnpm --filter @moniq/core run typecheck
```

### Build

```bash
# Build all packages
pnpm run build

# Watch mode for a specific package
pnpm --filter @moniq/core run dev
```

### Run Tests

```bash
# Run all tests across all packages
pnpm run test

# Run tests for a specific package
pnpm --filter @moniq/core run test
```

### Documentation

The docs site is in `packages/docs/` and uses VitePress.

```bash
# Start the dev server
pnpm --filter @moniq/docs run dev

# Generate API docs from source
pnpm --filter @moniq/docs run predocs

# Build for production
pnpm --filter @moniq/docs run build
```

## Pull Request Process

1. **Create a branch** from `main` with a descriptive name:

   ```bash
   git checkout -b feat/my-feature
   ```

   Branch naming conventions:
   - `feat/` — new features
   - `fix/` — bug fixes
   - `docs/` — documentation
   - `refactor/` — refactoring
   - `chore/` — maintenance

2. **Make your changes** — write tests for new functionality, then run through
   the [development workflow](#development-workflow) to make sure everything
   passes.

3. **Commit your changes** following [Conventional Commits](https://www.conventionalcommits.org):

   ```bash
   git add .
   git commit -m "feat(core): add new policy type"
   ```

4. **Add a changeset** if your change affects the published package:

   ```bash
   pnpm changeset
   ```

   Follow the prompts to select `@udohjeremiah/moniq` as the changed package
   (it is the only published package — internal packages like `@moniq/cli`,
   `@moniq/core`, etc. are bundled into it) and write a brief description of
   the change. This generates a markdown file in `.changeset/` that the release
   workflow uses to create changelogs.

   > **When to add a changeset**: Any change that affects the behaviour of
   > `@udohjeremiah/moniq`. Documentation-only changes don't need a changeset.

5. **Push your branch and open a pull request** against `main` on GitHub. The PR
   title should follow [Conventional Commits](https://www.conventionalcommits.org/).
   CI will run automatically — all checks must pass before merging.

## Release Process

Releases are automated via [Changesets](https://changesets.dev) GitHub Action.

1. When a PR with a changeset is merged to `main`, the `release.yaml` workflow
   creates a "Version Packages" PR.

2. Merging that PR publishes the updated packages to [npm](https://npmjs.com)
   and updates the changelog.

---

Thank you for contributing!
