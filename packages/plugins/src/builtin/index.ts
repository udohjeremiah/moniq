import type { MoniqPlugin } from "@moniq/config/plugins";

import { filesPlugin } from "./files/index.js";
import { scriptsPlugin } from "./scripts/index.js";

export const builtinPlugins: MoniqPlugin[] = [filesPlugin, scriptsPlugin];
