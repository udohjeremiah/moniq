import { registerPluginPack } from "@moniq/core";

import { filesPlugin } from "./files/index.js";
import { scriptsPlugin } from "./scripts/index.js";

export type { FilePolicy } from "./files/constants.js";
export { filesPlugin } from "./files/index.js";

export type { ScriptPolicy } from "./scripts/constants.js";
export { scriptsPlugin } from "./scripts/index.js";

export const builtinPlugins = [filesPlugin, scriptsPlugin];

// Registering the builtin plugin pack on import is required so the engine
// resolves the builtin policy domains without extra setup.
// eslint-disable-next-line unicorn/no-top-level-side-effects
registerPluginPack(...builtinPlugins);
