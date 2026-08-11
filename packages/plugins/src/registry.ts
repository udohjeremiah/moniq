import type { UserConfig } from "@moniq/config";
import type {
  MoniqPlugin,
  PluginPolicyDefinition,
} from "@moniq/config/plugins";

import { builtinPlugins } from "./builtin/index.js";

export interface RegisteredPluginDomain {
  definition: PluginPolicyDefinition;
  domain: string;
  pluginName: string;
  policyName: string;
}

export class PluginRegistry {
  get domains() {
    return this.domainsByName.values();
  }

  // eslint-disable-next-line unicorn/consistent-class-member-order
  private readonly domainsByName = new Map<string, RegisteredPluginDomain>();

  private readonly pluginNames = new Set<string>();

  getDomain(domain: string) {
    return this.domainsByName.get(domain);
  }

  register(plugin: MoniqPlugin) {
    if (this.pluginNames.has(plugin.name)) {
      throw new Error(`Duplicate plugin registered: "${plugin.name}"`);
    }

    this.pluginNames.add(plugin.name);

    if (this.domainsByName.has(plugin.name)) {
      throw new Error(
        `Duplicate policy domain "${plugin.name}" registered by plugin "${plugin.name}"`,
      );
    }

    this.domainsByName.set(plugin.name, {
      definition: plugin.policy,
      domain: plugin.name,
      pluginName: plugin.name,
      policyName: plugin.name,
    });
  }
}

export function createRegistry(config: UserConfig) {
  const registry = new PluginRegistry();

  for (const plugin of builtinPlugins) {
    registry.register(plugin);
  }

  const userPlugins = config.plugins ?? [];

  for (const plugin of userPlugins) {
    registry.register(plugin);
  }

  return registry;
}
