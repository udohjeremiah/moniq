import { defineConfig } from "vitepress";
import { version } from "../../moniq/package.json";
import {
  groupIconMdPlugin,
  groupIconVitePlugin,
} from "vitepress-plugin-group-icons";

export default defineConfig({
  base: "/moniq/",
  title: "Moniq",
  description:
    "Policy-driven workspace linter for JavaScript/TypeScript monorepos.",
  head: [["link", { rel: "icon", href: "/moniq/favicon.svg" }]],
  cleanUrls: true,
  lastUpdated: true,
  sitemap: {
    hostname: "https://udohjeremiah.github.io/moniq",
  },
  vite: {
    plugins: [groupIconVitePlugin()],
  },
  markdown: {
    config(md) {
      md.use(groupIconMdPlugin);
    },
  },
  themeConfig: {
    logo: "/favicon.svg",
    nav: [
      { text: "Guide", link: "/guide/why-moniq" },
      {
        text: `v${version}`,
        items: [
          {
            text: "Changelog",
            link: "https://github.com/udohjeremiah/moniq/releases",
          },
          {
            text: "Contributing",
            link: "https://github.com/udohjeremiah/moniq/blob/main/CONTRIBUTING.md",
          },
        ],
      },
    ],
    sidebar: [
      {
        text: "Introduction",
        items: [
          { text: "Why Moniq?", link: "/guide/why-moniq" },
          { text: "Getting Started", link: "/guide/getting-started" },
          { text: "CLI Commands", link: "/guide/cli" },
          { text: "CI Integration", link: "/guide/ci-integration" },
        ],
      },
      {
        text: "Configuration",
        items: [
          { text: "Overview", link: "/guide/configuration" },
          { text: "Script Policies", link: "/guide/script-policies" },
        ],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/udohjeremiah/moniq" },
      {
        icon: "npm",
        link: "https://npmjs.com/package/@udohjeremiah/moniq",
      },
      {
        icon: "x",
        link: "https://x.com/udohjeremiah_",
      },
    ],
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2026-present Udoh Jeremiah",
    },
    search: {
      provider: "local",
    },
  },
});
