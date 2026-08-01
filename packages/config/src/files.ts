import { Type } from "typebox";
import { Check, Errors } from "typebox/value";

import { type BasePolicy, BasePolicyType } from "./base.js";

/**
 * Expected filesystem item kind.
 *
 * - `"file"` - a regular file
 * - `"directory"` - a directory
 * - `"symlink"` - a symbolic link
 */
export type FileKind = "directory" | "file" | "symlink";

/**
 * Policy for validating a workspace-relative file, directory, or symlink.
 *
 * Used by the `files` policy domain in `UserConfig`.
 *
 * Inherits the policy options from {@link BasePolicy}.
 */
export interface FilePolicy extends BasePolicy {
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
  autofix?: boolean;

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
  content?: RegExp | string;

  /**
   * Expected filesystem item kind.
   *
   * - `"file"` - a regular file
   * - `"directory"` - a directory
   * - `"symlink"` - a symbolic link
   *
   * When omitted, any filesystem item kind is accepted.
   */
  kind?: FileKind;
}

const kindType = Type.Union([
  Type.Literal("directory"),
  Type.Literal("file"),
  Type.Literal("symlink"),
]);

export const FilePolicyType = Type.Object({
  ...BasePolicyType.properties,
  autofix: Type.Optional(Type.Boolean()),
  content: Type.Optional(Type.Unknown()),
  kind: Type.Optional(kindType),
});

export function parseFilePolicy(data: unknown) {
  if (!Check(FilePolicyType, data)) {
    const errors = Errors(FilePolicyType, data);
    const first = errors[0];

    throw new TypeError(first?.message ?? "Invalid FilePolicy value");
  }

  const record = data as Record<string, unknown>;

  if (!isContent(record["content"])) {
    throw new TypeError("Invalid content: must be a RegExp or string");
  }

  if (record["kind"] === "directory" && record["content"] !== undefined) {
    throw new TypeError(
      'Invalid FilePolicy: content cannot be combined with kind "directory"',
    );
  }

  if (record["kind"] === "symlink" && record["content"] !== undefined) {
    throw new TypeError(
      'Invalid FilePolicy: content cannot be combined with kind "symlink"',
    );
  }

  return data as FilePolicy;
}

export function parseFilePolicyOrArray(data: unknown) {
  return Array.isArray(data)
    ? data.map((policy) => parseFilePolicy(policy))
    : parseFilePolicy(data);
}

function isContent(value: unknown) {
  return (
    value === undefined || value instanceof RegExp || typeof value === "string"
  );
}
