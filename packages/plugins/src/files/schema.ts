import { Type } from "@moniq/core";

const contentType = Type.Unsafe<RegExp | string>(Type.Unknown());

const fileKind = Type.Union([
  Type.Literal("directory"),
  Type.Literal("file"),
  Type.Literal("symlink"),
]);

export const filePolicySchema = Type.Object({
  /**
   * Whether Moniq may automatically apply safe fixes when running `moniq fix`.
   *
   * Only safe fixes are applied:
   *
   * - create a missing required file or directory (only when `kind` is set to
   *   `"file"` or `"directory"`)
   * - remove a forbidden file, directory, or symlink
   * - overwrite a regular file whose contents differ from an exact string
   *
   * @default false
   */
  autofix: Type.Optional(Type.Boolean()),

  /**
   * Expected contents of a regular file.
   *
   * Only applies when the target is a regular file.
   *
   * - a string requires an exact match
   * - a `RegExp` requires the contents to match the pattern
   *
   * Cannot be combined with `kind: "directory"` or `kind: "symlink"`.
   */
  content: Type.Optional(contentType),

  /**
   * Expected filesystem item kind.
   *
   * - `"file"` - a regular file
   * - `"directory"` - a directory
   * - `"symlink"` - a symbolic link
   *
   * When omitted, any filesystem item kind is accepted.
   */
  kind: Type.Optional(fileKind),
});
