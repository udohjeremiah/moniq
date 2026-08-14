import { definePlugin } from "@moniq/core";

import { filePolicy } from "./validate.js";

export const filesPlugin = definePlugin({
  name: "files",
  policy: filePolicy,
});
