# Getting Started

## Prerequisites

- Node.js 24+ (or Deno)
- A JavaScript or TypeScript workspace

## Quick Start

The easiest way to get started is with `init`, which installs Moniq and creates
a starter configuration.

::: code-group

```bash [npm]
npx @udohjeremiah/moniq init
```

```bash [pnpm]
pnpm dlx @udohjeremiah/moniq init
```

```bash [yarn]
yarn dlx @udohjeremiah/moniq init
```

```bash [bun]
bun x @udohjeremiah/moniq init
```

```bash [deno]
deno run -A npm:@udohjeremiah/moniq init
```

:::

## Manual Installation

Install Moniq in your workspace root.

::: code-group

```bash [npm]
npm install -D @udohjeremiah/moniq
```

```bash [pnpm]
pnpm add -D -w @udohjeremiah/moniq
```

```bash [yarn]
yarn add -D @udohjeremiah/moniq
```

```bash [bun]
bun add -D @udohjeremiah/moniq
```

```bash [deno]
deno add -D npm:@udohjeremiah/moniq
```

:::

Create a `moniq.config.{ts,js,mjs,cjs,mts,cts}` file in the workspace root.

```ts
import { defineConfig } from "@udohjeremiah/moniq";

export default defineConfig({
  scripts: {
    build: { command: "tsdown" },
    lint: { command: "eslint ." },
  },
});
```

## Run Moniq

Run Moniq from the workspace root.

::: code-group

```bash [npm]
npx moniq check
```

```bash [pnpm]
pnpm moniq check
```

```bash [yarn]
yarn moniq check
```

```bash [bun]
bun run moniq check
```

```bash [deno]
deno run -A npm:@udohjeremiah/moniq check
```

:::

If every policy passes, Moniq exits successfully.

Otherwise, it reports every policy violation found in your workspace.

## Next Steps

- Learn how to write policies in the [Configuration](./configuration) guide.
- Explore all available [CLI commands](./cli).
- Set up Moniq in [CI](./ci-integration).
