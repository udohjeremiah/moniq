---
"@udohjeremiah/moniq": minor
---

Rework the plugin fix API around self-contained diagnostic fixes. `fix` is now a self-contained `() => Promise<void> | void` on the diagnostic instead of a separate plugin fix hook (`FixContext`, `PluginPolicyDefinition.fix`, and plugin `fix.ts` files are removed). The engine applies fixes when `autofix` is enabled and no longer re-validates; resolution is verified on the next `check` run. `PolicySubject.key` and the base `Diagnostic` `actual`/`expected` fields are removed; plugin data now lives in `metadata`, typed via `DiagnosticMetadata` augmentation. The `@udohjeremiah/moniq/plugins` subpath no longer exports `Diagnostic`.