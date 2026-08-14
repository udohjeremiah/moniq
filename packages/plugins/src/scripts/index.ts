import { definePlugin } from "@moniq/core";

import { scriptPolicy } from "./validate.js";

export const scriptsPlugin = definePlugin({
  name: "scripts",
  policy: scriptPolicy,
});
