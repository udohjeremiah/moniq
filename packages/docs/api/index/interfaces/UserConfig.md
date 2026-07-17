[@udohjeremiah/moniq](../../modules.md) / [index](../index.md) / UserConfig

# Interface: UserConfig

Defined in: config/dist/index.d.ts:51

Moniq configuration.

## Properties

### scripts?

> `optional` **scripts?**: `Record`\<`string`, [`ScriptPolicy`](ScriptPolicy.md) \| [`ScriptPolicy`](ScriptPolicy.md)[]\>

Defined in: config/dist/index.d.ts:53

Policies keyed by script name. Maps script names to one or more policies (first match wins).
