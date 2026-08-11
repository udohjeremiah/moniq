import { definePlugin } from "@moniq/config/plugins";

import { filePolicy } from "./validate.js";

export type { FileDiagnosticFields, FixAction } from "./constants.js";

export const filesPlugin = definePlugin({
  name: "files",
  policy: filePolicy,
});
