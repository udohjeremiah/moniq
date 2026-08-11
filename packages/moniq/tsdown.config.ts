import { defineConfig } from "tsdown";

export default defineConfig({
  deps: {
    alwaysBundle: [/^@moniq\//],
    dts: {
      neverBundle: [/^typebox$/],
    },
  },
  entry: ["src/cli.ts", "src/index.ts", "src/plugins.ts"],
  outExtensions: () => ({ js: ".js" }),
});
