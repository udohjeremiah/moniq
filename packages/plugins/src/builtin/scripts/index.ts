import { definePlugin } from "@moniq/config/plugins";

import { scriptPolicy } from "./validate.js";

export const scriptsPlugin = definePlugin({
  name: "scripts",
  policy: scriptPolicy,
});
