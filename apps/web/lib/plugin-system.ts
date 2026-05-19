/**
 * Plugin system (Issue #541).
 * Plugin interface with lifecycle hooks, registration/discovery,
 * dependency resolution, config schema, enable/disable.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface PluginConfigField {
  key: string;
  type: "string" | "number" | "boolean" | "select";
  label: string;
  description?: string;
  defaultValue: string | number | boolean;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  validate?: (value: unknown) => string | null;
}

export interface PluginConfigSchema {
  fields: PluginConfigField[];
}

export interface PluginMeta {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  /** Plugin IDs this plugin depends on. */
  dependencies?: string[];
  /** Plugin IDs this is incompatible with. */
  incompatibleWith?: string[];
  configSchema?: PluginConfigSchema;
}

export interface PluginLifecycleHooks {
  /** Called when the plugin is first registered. */
  onRegister?: (ctx: PluginContext) => void | Promise<void>;
  /** Called when the plugin is enabled. */
  onEnable?: (ctx: PluginContext) => void | Promise<void>;
  /** Called when the plugin is disabled. */
  onDisable?: (ctx: PluginContext) => void | Promise<void>;
  /** Called when the plugin is unregistered/removed. */
  onUnregister?: (ctx: PluginContext) => void | Promise<void>;
  /** Called when any plugin config changes. */
  onConfigChange?: (ctx: PluginContext, config: Record<string, unknown>) => void | Promise<void>;
}

export interface Plugin extends PluginMeta {
  hooks: PluginLifecycleHooks;
  /** Plugin's main initialization — receives the host API. */
  init?: (api: PluginHostAPI) => void | Promise<void>;
}

export interface PluginContext {
  pluginId: string;
  config: Record<string, unknown>;
  logger: PluginLogger;
}

export interface PluginLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export interface PluginHostAPI {
  /** Register a custom probe set. */
  registerProbes?: (probes: unknown[]) => void;
  /** Register a custom visualization. */
  registerVisualization?: (id: string, component: unknown) => void;
  /** Access the event bus. */
  emit?: (event: string, data: unknown) => void;
  on?: (event: string, handler: (data: unknown) => void) => () => void;
}

export type PluginState = "registered" | "enabled" | "disabled" | "error";

export interface PluginRecord {
  plugin: Plugin;
  state: PluginState;
  config: Record<string, unknown>;
  enabledAt: string | null;
  error: string | null;
}

export interface PluginDiscoveryResult {
  available: PluginMeta[];
  installed: Array<{ meta: PluginMeta; state: PluginState }>;
}

/* ------------------------------------------------------------------ */
/*  Dependency resolution                                             */
/* ------------------------------------------------------------------ */

function resolveDependencyOrder(plugins: Plugin[]): Plugin[] {
  const byId = new Map<string, Plugin>();
  for (const p of plugins) byId.set(p.id, p);

  const visited = new Set<string>();
  const sorted: Plugin[] = [];

  function visit(id: string, stack: Set<string>): void {
    if (visited.has(id)) return;
    if (stack.has(id)) {
      throw new Error(`Circular plugin dependency detected: ${id}`);
    }
    const plugin = byId.get(id);
    if (!plugin) {
      throw new Error(`Missing plugin dependency: ${id}`);
    }
    stack.add(id);
    for (const dep of plugin.dependencies ?? []) {
      visit(dep, stack);
    }
    stack.delete(id);
    visited.add(id);
    sorted.push(plugin);
  }

  for (const p of plugins) {
    visit(p.id, new Set());
  }

  return sorted;
}

/* ------------------------------------------------------------------ */
/*  Plugin Manager                                                    */
/* ------------------------------------------------------------------ */

export class PluginManager {
  private registry: Map<string, PluginRecord> = new Map();
  private eventHandlers: Map<string, Array<(data: unknown) => void>> = new Map();
  private logs: Array<{ pluginId: string; level: string; message: string; timestamp: string }> = [];

  /** The host API provided to plugins during init. */
  private hostAPI: PluginHostAPI;

  constructor(hostAPI?: Partial<PluginHostAPI>) {
    this.hostAPI = {
      registerProbes: hostAPI?.registerProbes,
      registerVisualization: hostAPI?.registerVisualization,
      emit: (event: string, data: unknown) => {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
          for (const h of handlers) h(data);
        }
      },
      on: (event: string, handler: (data: unknown) => void) => {
        if (!this.eventHandlers.has(event)) {
          this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event)!.push(handler);
        return () => {
          const arr = this.eventHandlers.get(event);
          if (arr) {
            const idx = arr.indexOf(handler);
            if (idx >= 0) arr.splice(idx, 1);
          }
        };
      },
    };
  }

  private createLogger(pluginId: string): PluginLogger {
    const pushLog = (level: string, message: string) => {
      this.logs.push({ pluginId, level, message, timestamp: new Date().toISOString() });
    };
    return {
      info: (msg) => pushLog("info", msg),
      warn: (msg) => pushLog("warn", msg),
      error: (msg) => pushLog("error", msg),
    };
  }

  private createContext(pluginId: string): PluginContext {
    const record = this.registry.get(pluginId);
    return {
      pluginId,
      config: record?.config ?? {},
      logger: this.createLogger(pluginId),
    };
  }

  /** Register a plugin (does not enable it). */
  async register(plugin: Plugin): Promise<void> {
    if (this.registry.has(plugin.id)) {
      throw new Error(`Plugin "${plugin.id}" is already registered`);
    }

    // Validate config defaults
    const config: Record<string, unknown> = {};
    if (plugin.configSchema) {
      for (const field of plugin.configSchema.fields) {
        config[field.key] = field.defaultValue;
      }
    }

    this.registry.set(plugin.id, {
      plugin,
      state: "registered",
      config,
      enabledAt: null,
      error: null,
    });

    const ctx = this.createContext(plugin.id);
    await plugin.hooks.onRegister?.(ctx);
  }

  /** Enable a plugin (resolves dependencies first). */
  async enable(pluginId: string): Promise<void> {
    const record = this.registry.get(pluginId);
    if (!record) throw new Error(`Plugin "${pluginId}" not found`);
    if (record.state === "enabled") return;

    const plugin = record.plugin;

    // Check incompatibilities
    for (const incompatible of plugin.incompatibleWith ?? []) {
      const other = this.registry.get(incompatible);
      if (other?.state === "enabled") {
        throw new Error(
          `Cannot enable "${pluginId}": incompatible with enabled plugin "${incompatible}"`
        );
      }
    }

    // Check dependencies are enabled
    for (const dep of plugin.dependencies ?? []) {
      const depRecord = this.registry.get(dep);
      if (!depRecord) {
        throw new Error(`Cannot enable "${pluginId}": dependency "${dep}" not registered`);
      }
      if (depRecord.state !== "enabled") {
        // Auto-enable dependency
        await this.enable(dep);
      }
    }

    try {
      const ctx = this.createContext(pluginId);
      await plugin.hooks.onEnable?.(ctx);
      await plugin.init?.(this.hostAPI);

      record.state = "enabled";
      record.enabledAt = new Date().toISOString();
      record.error = null;
    } catch (err) {
      record.state = "error";
      record.error = err instanceof Error ? err.message : String(err);
      throw err;
    }
  }

  /** Disable a plugin. */
  async disable(pluginId: string): Promise<void> {
    const record = this.registry.get(pluginId);
    if (!record) throw new Error(`Plugin "${pluginId}" not found`);
    if (record.state === "disabled" || record.state === "registered") return;

    // Check if any enabled plugin depends on this one
    for (const [id, r] of this.registry) {
      if (r.state === "enabled" && r.plugin.dependencies?.includes(pluginId)) {
        throw new Error(
          `Cannot disable "${pluginId}": plugin "${id}" depends on it`
        );
      }
    }

    const ctx = this.createContext(pluginId);
    await record.plugin.hooks.onDisable?.(ctx);
    record.state = "disabled";
  }

  /** Unregister a plugin (disables first if needed). */
  async unregister(pluginId: string): Promise<void> {
    const record = this.registry.get(pluginId);
    if (!record) return;

    if (record.state === "enabled") {
      await this.disable(pluginId);
    }

    const ctx = this.createContext(pluginId);
    await record.plugin.hooks.onUnregister?.(ctx);
    this.registry.delete(pluginId);
  }

  /** Update plugin configuration. */
  async updateConfig(pluginId: string, config: Record<string, unknown>): Promise<void> {
    const record = this.registry.get(pluginId);
    if (!record) throw new Error(`Plugin "${pluginId}" not found`);

    // Validate
    const schema = record.plugin.configSchema;
    if (schema) {
      for (const field of schema.fields) {
        const value = config[field.key] ?? record.config[field.key];
        if (field.required && (value === undefined || value === null || value === "")) {
          throw new Error(`Config field "${field.key}" is required for plugin "${pluginId}"`);
        }
        if (field.validate) {
          const err = field.validate(value);
          if (err) throw new Error(`Config validation error for "${field.key}": ${err}`);
        }
      }
    }

    record.config = { ...record.config, ...config };

    const ctx = this.createContext(pluginId);
    await record.plugin.hooks.onConfigChange?.(ctx, record.config);
  }

  /** Get the state of a specific plugin. */
  getPlugin(pluginId: string): PluginRecord | undefined {
    return this.registry.get(pluginId);
  }

  /** List all registered plugins. */
  listPlugins(): PluginRecord[] {
    return Array.from(this.registry.values());
  }

  /** Discover available and installed plugins. */
  discover(availablePlugins: Plugin[]): PluginDiscoveryResult {
    const installed = this.listPlugins().map((r) => ({
      meta: {
        id: r.plugin.id,
        name: r.plugin.name,
        version: r.plugin.version,
        description: r.plugin.description,
        author: r.plugin.author,
        dependencies: r.plugin.dependencies,
      },
      state: r.state,
    }));

    const installedIds = new Set(installed.map((i) => i.meta.id));

    const available = availablePlugins
      .filter((p) => !installedIds.has(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        version: p.version,
        description: p.description,
        author: p.author,
        dependencies: p.dependencies,
      }));

    return { available, installed };
  }

  /** Enable all registered plugins in dependency order. */
  async enableAll(): Promise<{ enabled: string[]; errors: Array<{ id: string; error: string }> }> {
    const plugins = Array.from(this.registry.values())
      .filter((r) => r.state !== "enabled")
      .map((r) => r.plugin);

    let sorted: Plugin[];
    try {
      sorted = resolveDependencyOrder(plugins);
    } catch (err) {
      return {
        enabled: [],
        errors: [{ id: "*", error: err instanceof Error ? err.message : String(err) }],
      };
    }

    const enabled: string[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const plugin of sorted) {
      try {
        await this.enable(plugin.id);
        enabled.push(plugin.id);
      } catch (err) {
        errors.push({
          id: plugin.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { enabled, errors };
  }

  /** Get plugin logs. */
  getLogs(pluginId?: string): typeof this.logs {
    if (pluginId) return this.logs.filter((l) => l.pluginId === pluginId);
    return [...this.logs];
  }
}
