import { definePlugin } from "@moniq/config/plugins";

import { scriptPolicy } from "./validate.js";

export type { ScriptDiagnosticFields } from "./constants.js";

export const scriptsPlugin = definePlugin({
  name: "scripts",
  policy: scriptPolicy,
});
