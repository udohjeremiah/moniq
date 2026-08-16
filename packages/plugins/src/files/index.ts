import { definePlugin } from "@moniq/core";

import { filePolicySchema } from "./schema.js";
import { filesSubjects } from "./subjects.js";
import { fileValidator } from "./validate.js";

export const filesPlugin = definePlugin({
  name: "files",
  policy: {
    schema: filePolicySchema,
    subjects: filesSubjects,
    validate: fileValidator,
  },
});
