import { definePlugin } from "@moniq/config/plugins";

import { filePolicy } from "./validate.js";

export const filesPlugin = definePlugin({
  name: "files",
  policy: filePolicy,
});
