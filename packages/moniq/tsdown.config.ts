import { defineConfig } from "tsdown";

export default defineConfig({
  deps: {
    alwaysBundle: [/^@moniq\//],
  },
  entry: ["src/cli.ts", "src/index.ts", "src/plugins.ts"],
  outExtensions: () => ({ js: ".js" }),
});
