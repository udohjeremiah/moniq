import { definePlugin } from "@moniq/core";

import { scriptPolicySchema } from "./schema.js";
import { scriptsSubjects } from "./subjects.js";
import { scriptValidator } from "./validate.js";

export const scriptsPlugin = definePlugin({
  name: "scripts",
  policy: {
    schema: scriptPolicySchema,
    subjects: scriptsSubjects,
    validate: scriptValidator,
  },
});
