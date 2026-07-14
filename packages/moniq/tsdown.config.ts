import { defineConfig } from "tsdown";

export default defineConfig({
  deps: {
    alwaysBundle: [/^@moniq\//],
  },
  entry: ["src/cli.ts", "src/index.ts"],
  outExtensions: () => ({ js: ".js" }),
});
