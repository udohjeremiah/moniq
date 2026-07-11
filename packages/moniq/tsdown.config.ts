import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  deps: {
    alwaysBundle: [/^@moniq\//],
    onlyBundle: false,
  },
  entry: ["src/cli.ts", "src/index.ts"],
  format: ["esm"],
  outExtensions: () => ({ js: ".js" }),
});
