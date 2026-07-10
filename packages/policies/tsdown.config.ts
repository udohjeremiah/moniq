import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  entry: ["src/scripts.ts"],
  format: ["esm"],
  outExtensions: () => ({ js: ".js" }),
});
