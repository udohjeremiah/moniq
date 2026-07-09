# EditorConfig Reference

## Purpose

EditorConfig helps maintain consistent coding styles across different editors and IDEs. It's not a linter or formatter — it's a baseline that tells editors how to handle whitespace.

## Config (`assets/editorconfig/.editorconfig`)

```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
```

## Rationale per setting

| Setting                    | Value   | Rationale                                                                                                   |
| -------------------------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| `indent_style`             | `space` | Tabs are ambiguous in diff tools and copy-paste.                                                            |
| `indent_size`              | `2`     | Standard TypeScript convention; aligns with Prettier.                                                       |
| `end_of_line`              | `lf`    | Prevents `\r\n` from appearing on Windows commits.                                                          |
| `charset`                  | `utf-8` | Universal.                                                                                                  |
| `trim_trailing_whitespace` | `true`  | Prevents noise diffs. Exception for `.md` files where trailing whitespace has semantic meaning in Markdown. |
| `insert_final_newline`     | `true`  | POSIX standard; many tools expect files to end with a newline.                                              |

## VS Code integration

The VS Code `editorconfig.editorconfig` extension is recommended in `extensions.json` to automatically apply these settings.
