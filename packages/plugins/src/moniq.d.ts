/**
 * Local ambient view of the published `@udohjeremiah/moniq` module.
 *
 * This exists so the built-in plugins can augment `UserConfig` from their own
 * files even though the published package is not an importable dependency of
 * `@moniq/plugins` (it is the consumer of the bundled plugins).
 *
 * Built-in domains augment `UserConfig` directly on the main entry so they
 * surface for consumers that import only `@udohjeremiah/moniq` (main-only
 * programs never load the `/plugins` subpath). Third-party plugin packages
 * augment `MoniqPluginPolicies` on the `/plugins` subpath instead, which
 * exports the seam that `UserConfig` extends.
 */
declare module "@udohjeremiah/moniq" {
  export type { UserConfig } from "@moniq/core";
}
