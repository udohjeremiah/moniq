<div align="center">

<p align="center">
  <img src="https://raw.githubusercontent.com/udohjeremiah/moniq/main/assets/banner.png" alt="moniq">
</p>

**Define workspace policies once. Keep every package consistent.**

<img alt="NPM Version" src="https://img.shields.io/npm/v/%40udohjeremiah%2Fmoniq?style=for-the-badge&logo=npm&logoColor=white" height="25">
<img alt="NPM Downloads" src="https://img.shields.io/npm/dm/%40udohjeremiah%2Fmoniq?style=for-the-badge&logo=npm&logoColor=white" height="25">
<img alt="GitHub Actions Workflow Status" src="https://img.shields.io/github/actions/workflow/status/udohjeremiah/moniq/ci.yaml?style=for-the-badge&logo=githubactions&logoColor=white" height="25">
<img alt="GitHub License" src="https://img.shields.io/github/license/udohjeremiah/moniq?style=for-the-badge&logo=github&logoColor=white" height="25">

</div>

## Install

```bash
# npm
npm install --save-dev @udohjeremiah/moniq

# pnpm
pnpm add -D -w @udohjeremiah/moniq

# yarn
yarn add --dev @udohjeremiah/moniq

# bun
bun add --dev @udohjeremiah/moniq

# deno
deno add -D npm:@udohjeremiah/moniq
```

## Quick Start

Create a `moniq.config.{ts,js,mjs,cjs,mts,cts}` at the root of your monorepo and
configure your policies:

```ts
import { defineConfig, bin } from "@udohjeremiah/moniq";

export default defineConfig({
  scripts: {
    build: { command: bin("tsdown"), severity: "error" },
    lint: { required: false, severity: "warn" },
  },
});
```

Then run the check:

```bash
# npm
npx moniq check

# pnpm
pnpm moniq check

# yarn
yarn moniq check

# bun
bun run moniq check

# deno
deno run -A npm:@udohjeremiah/moniq check
```

## CLI

| Command        | Description                                | Options                       |
| -------------- | ------------------------------------------ | ----------------------------- |
| `moniq init`   | Install and scaffold a `moniq.config` file | `--lang <type>`               |
| `moniq check`  | Run policy checks                          | `--format <fmt>`              |
| `moniq fix`    | Run policy checks and apply autofixes      | `--dry-run`, `--format <fmt>` |
| `moniq doctor` | Detect configuration mistakes              | —                             |

## Configuration

Configuration is done via a `moniq.config.{ts,js,mjs,cjs,mts,cts}` file at your
workspace root.

```ts
import { defineConfig, bin } from "@udohjeremiah/moniq";

export default defineConfig({
  scripts: {
    build: { command: bin("tsdown"), severity: "error" },
    lint: { required: false, command: /^eslint/, severity: "warn" },
    typecheck: { command: "tsc --noEmit", severity: "error" },
  },
});
```

See the [configuration guide](https://udohjeremiah.github.io/moniq/guide/configuration)
for a full list of policy types and configuration options.

## Docs

Full documentation is available at [udohjeremiah.github.io/moniq](https://udohjeremiah.github.io/moniq).

## Contributing

See [CONTRIBUTING.md](https://github.com/udohjeremiah/moniq/blob/main/CONTRIBUTING.md) for detailed instructions on setting up
the project, development workflow, pull request process, and release process.

## License

MIT © [Udoh Jeremiah](https://github.com/udohjeremiah)
