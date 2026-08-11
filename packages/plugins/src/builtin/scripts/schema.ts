import { Type } from "@moniq/config/plugins";

const customCommandSchema = Type.Array(Type.String());

const commandType = Type.Unsafe<
  ((command: string) => boolean) | RegExp | string
>(Type.Unknown());

export const scriptPolicySchema = Type.Object({
  allowCustomCommands: Type.Optional(customCommandSchema),
  autofix: Type.Optional(Type.Boolean()),
  command: Type.Optional(commandType),
});
