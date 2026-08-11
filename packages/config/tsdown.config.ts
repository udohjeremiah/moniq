import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/plugins.ts"],
  outExtensions: () => ({ js: ".js" }),
});
