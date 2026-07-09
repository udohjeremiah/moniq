# VS Code Configuration Reference

## Settings (`assets/vscode/settings.json`)

| Setting                                           | Value                                   | Rationale                                                                                 |
| ------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------- |
| `editor.defaultFormatter`                         | `esbenp.prettier-vscode`                | Prettier handles all formatting.                                                          |
| `editor.formatOnSave`                             | `true`                                  | Auto-format on save to prevent formatting drift.                                          |
| `editor.codeActionsOnSave.source.fixAll`          | `"explicit"`                            | Run ESLint auto-fix on save.                                                              |
| `editor.codeActionsOnSave.source.organizeImports` | `"never"`                               | Disabled because `eslint-plugin-perfectionist` handles import ordering with richer rules. |
| `eslint.validate`                                 | JS, TS, JSX, TSX, Markdown, JSON, JSONC | Broad coverage.                                                                           |
| `files.associations`                              | `*.css` → `tailwindcss`                 | Tailwind CSS IntelliSense for all CSS files.                                              |

### Dynamic settings (added per-detection)

| Setting                               | When added              | Value                                                               |
| ------------------------------------- | ----------------------- | ------------------------------------------------------------------- |
| `tailwindCSS.experimental.configFile` | Tailwind detected       | Path to CSS entry file (detected from project, e.g., `globals.css`) |
| `files.watcherExclude`                | TanStack Start detected | `{ "**/routeTree.gen.ts": true }`                                   |
| `search.exclude` (routeTree entry)    | Always in base          | Already included in `assets/vscode/settings.json`                   |
| `files.readonlyInclude`               | TanStack Start detected | `{ "**/routeTree.gen.ts": true }`                                   |

## Extension recommendations (`assets/vscode/extensions.json`)

| Extension                 | ID                                      | Purpose                                                            |
| ------------------------- | --------------------------------------- | ------------------------------------------------------------------ |
| ESLint                    | `dbaeumer.vscode-eslint`                | Inline linting and auto-fix.                                       |
| Prettier                  | `esbenp.prettier-vscode`                | Format on save.                                                    |
| Tailwind CSS IntelliSense | `bradlc.vscode-tailwindcss`             | Class autocompletion, hover previews.                              |
| EditorConfig              | `editorconfig.editorconfig`             | Applies .editorconfig settings.                                    |
| Code Spell Checker        | `streetsidesoftware.code-spell-checker` | Catch typos in identifiers and comments.                           |
| MDX                       | `unifiedjs.vscode-mdx`                  | MDX syntax highlighting (useful in TanStack Start / Next.js docs). |
| Knip                      | `webpro.vscode-knip`                    | Inline diagnostics for unused files, deps, and exports.            |

## Note

The `.vscode/` folder is project-local and should be committed to version control so all contributors share the same settings. If a contributor uses a different editor (WebStorm, Neovim, etc.), the `.editorconfig` and ESLint/Prettier CLI commands provide equivalent functionality.
