# Why Moniq

## The Problem

Software projects don't stay small.

A project becomes a package.  
A package becomes a workspace.  
A workspace becomes a monorepo.

As teams grow, so do conventions.

Some packages should expose certain scripts. Some files should always exist.
Some tools become the team standard. Others are gradually phased out.

At first, these conventions live in people's heads.

Then they move into a `README.md`.

Eventually someone writes a shell script to enforce them.

Before long, every organization has its own collection of CI jobs, custom
scripts, and documentation trying to answer the same question:

> **"Is this workspace still following the way we've agreed to build software?"**

Moniq exists because that question shouldn't require custom infrastructure.

## Workspace Drift

Workspaces naturally drift.

A new package misses a required script.

A package still uses a deprecated tool after the rest of the workspace migrated.

A legacy configuration survives long after a migration.

Nothing is broken—but the workspace becomes less predictable.

Every exception makes the repository a little harder to understand, maintain,
and evolve.

## Existing Tools

The JavaScript ecosystem already has incredible tools.

- [ESLint](https://eslint.org) lints code.
- [Prettier](https://prettier.io) formats it.
- [TypeScript](https://www.typescriptlang.org) validates types.
- [Turbo](https://turborepo.dev)/[Nx](https://nx.dev) orchestrate tasks.

Each focuses on a different aspect of a project.

**Moniq focuses on the workspace around those projects.**

It answers questions like:

- What should exist?
- What shouldn't?
- Which conventions should every package follow?
- Where are exceptions allowed?
- Are we still aligned with our engineering standards?

## Policies

Moniq isn't built around scripts, files, or any single kind of check.

It's built around **policies**.

A policy describes an expectation about your workspace.

As Moniq grows, new capabilities don't introduce new configuration styles—they
become new kinds of policies.

One configuration.  
One mental model.  
One place to define your workspace standards.

## Extensibility

Every engineering team has standards.

Some are documented.

Many exist only because someone remembers them.

Moniq gives those standards a permanent home.

The core provides common workspace policies, while plugins let organizations,
frameworks, and tool vendors publish reusable policy packs.

## The Vision

A healthy workspace isn't defined only by the quality of its code.

It's defined by the consistency of the workspace around that code.

Moniq exists to make that consistency easy to define and effortless to enforce.

- Define your policies once.
- Keep your workspace aligned.
- Ship software with confidence.
