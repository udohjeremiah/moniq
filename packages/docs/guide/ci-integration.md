# CI Integration

Moniq is designed to run as part of your continuous integration pipeline.

If any policy fails, Moniq exits with a non-zero status code.

## GitHub Actions

::: code-group

```yaml [npm]
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  moniq:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: ">=24"
          cache: npm
      - run: npm ci
      - run: npx moniq check
```

```yaml [pnpm]
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  moniq:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: ">=24"
          cache: pnpm
      - uses: pnpm/action-setup@v6
        with:
          version: 11 # omit version input to use the version in the `packageManager` field in the `package.json`
      - run: pnpm install
      - run: pnpm moniq check
```

```yaml [Yarn]
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  moniq:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: ">=24"
          cache: yarn
      - run: yarn install
      - run: yarn moniq check
```

```yaml [Bun]
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  moniq:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: oven-sh/setup-bun@v2
      - run: bun ci
      - run: bun moniq check
```

```yaml [Deno]
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  moniq:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: denoland/setup-deno@v2
      - run: deno install
      - run: deno run -A npm:@udohjeremiah/moniq check
```

:::

## JSON Output

Use the `json` format to integrate Moniq with other tools or automation.

```bash
npx moniq check --format json
```

The output contains tool metadata, a run summary, and the list of diagnostics.

```json
{
  "tool": {
    "name": "moniq"
  },
  "summary": {
    "passed": false,
    "errors": 2,
    "warnings": 1,
    "total": 3
  },
  "results": [
    {
      "ruleId": "scripts/missing",
      "ruleName": "Missing required script",
      "domain": "scripts",
      "message": "Missing required script \"build\"",
      "severity": "error",
      "packageName": "packages/ui",
      "packagePath": "/workspace/packages/ui"
    }
  ]
}
```

Diagnostics may also include fields such as `expected`, `actual`, `fix`, `file`,
`line`, `column`, and other policy-specific properties.

## SARIF Output

Moniq can also produce [SARIF 2.1.0](https://sarifweb.azurewebsites.net) output
for integration with GitHub Advanced Security and other SARIF-compatible tools.

```bash
npx moniq check --format sarif
```

## Exit Codes

| Code | Meaning                                               |
| ---: | ----------------------------------------------------- |
|  `0` | All policies passed.                                  |
|  `1` | One or more policy violations were found.             |
|  `2` | Moniq failed to run (configuration or runtime error). |
