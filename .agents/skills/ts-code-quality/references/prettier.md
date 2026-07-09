# Prettier Configuration Reference

## Why Prettier

Prettier is an opinionated code formatter that eliminates all stylistic debates. ESLint focuses on code quality rules; Prettier handles formatting. They are complementary, not alternatives.

## File naming

Always use the `.prettierrc.json` extension (not bare `.prettierrc`). The
`.json` extension ensures correct editor syntax highlighting and validation.

## Core config (`assets/prettier/.prettierrc.json`)

| Option          | Value    | Rationale                                                                                   |
| --------------- | -------- | ------------------------------------------------------------------------------------------- |
| `semi`          | `true`   | Required by ASI-averse code; TypeScript-ESLint recommended.                                 |
| `singleQuote`   | `false`  | Double quotes are standard for TypeScript projects; avoids confusion with JSX string props. |
| `trailingComma` | `all`    | Cleaner diffs: adding a new property doesn't add a comma to the previous line.              |
| `printWidth`    | `80`     | Standard readability limit; works well with side-by-side editors and PR reviews.            |
| `tabWidth`      | `2`      | Universal TypeScript convention.                                                            |
| `endOfLine`     | `lf`     | Cross-platform consistency.                                                                 |
| `arrowParens`   | `always` | Required by TypeScript-ESLint for type annotations on arrow params.                         |

## Tailwind variant (`assets/prettier/.prettierrc.tailwind.json`)

Merged into the base config when Tailwind is detected:

- `plugins: ["prettier-plugin-tailwindcss"]` — auto-sorts Tailwind utility classes following the official order.
- `tailwindFunctions: ["cn", "clsx", "twMerge", "cva"]` — Recognizes common Tailwind utility functions for class extraction.

Additionally, a `tailwindStylesheet` field is added dynamically with the
path to the project's main CSS entry. The agent detects the actual CSS
entry file (looking for `globals.css`, `index.css`, `styles.css` in common
locations) and sets the path relative to the project/package root.

## Prettier ignore

The skill also generates a `.prettierignore` file excluding:

- Build output directories (`dist`, `build`, `.next`, `out`)
- Lock files
- Generated route files (e.g., TanStack Start `routeTree.gen.ts`)

## ESLint + Prettier integration

`eslint-config-prettier` is included in the ESLint flat config (always last) to turn off ESLint rules that would conflict with Prettier. This is the standard approach — no `eslint-plugin-prettier` needed, which would run Prettier as an ESLint rule and duplicate work.
