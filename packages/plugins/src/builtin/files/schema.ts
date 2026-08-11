import { Type } from "@moniq/config/plugins";

const contentType = Type.Unsafe<RegExp | string>(Type.Unknown());

export const fileKind = Type.Union([
  Type.Literal("directory"),
  Type.Literal("file"),
  Type.Literal("symlink"),
]);

export const filePolicySchema = Type.Object({
  autofix: Type.Optional(Type.Boolean()),
  content: Type.Optional(contentType),
  kind: Type.Optional(fileKind),
});
