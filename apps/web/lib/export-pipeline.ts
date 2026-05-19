/**
 * Data export pipeline (Issue #453).
 * Implements a pipeline: select -> filter -> transform -> format -> output.
 * Supports reusable transformation modules, preview with sample data,
 * saved configurations, and scheduled execution.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface PipelineStage<TIn = unknown, TOut = unknown> {
  /** Stage name. */
  name: string;
  /** Stage type. */
  type: "select" | "filter" | "transform" | "format" | "output";
  /** Process function. */
  process: (input: TIn) => TOut | Promise<TOut>;
  /** Description for display. */
  description?: string;
}

export interface PipelineConfig {
  /** Unique pipeline ID. */
  id: string;
  /** Human-readable pipeline name. */
  name: string;
  /** Description. */
  description?: string;
  /** Ordered list of stage configurations. */
  stages: StageConfig[];
  /** ISO timestamp of creation. */
  createdAt: string;
  /** ISO timestamp of last update. */
  updatedAt: string;
  /** Scheduled execution cron expression (optional). */
  schedule?: string;
  /** Whether the pipeline is enabled for scheduling. */
  enabled: boolean;
}

export interface StageConfig {
  /** Stage type. */
  type: "select" | "filter" | "transform" | "format" | "output";
  /** Module ID (references a registered module). */
  moduleId: string;
  /** Stage-specific parameters. */
  params: Record<string, unknown>;
}

export interface PipelineResult {
  /** Pipeline ID. */
  pipelineId: string;
  /** Whether the execution succeeded. */
  success: boolean;
  /** Output data. */
  data: unknown;
  /** Timing for each stage. */
  stageTiming: Array<{
    name: string;
    type: string;
    durationMs: number;
    inputCount?: number;
    outputCount?: number;
  }>;
  /** Total execution time in ms. */
  totalDurationMs: number;
  /** Error message if failed. */
  error?: string;
  /** Which stage failed (if any). */
  failedStage?: string;
  /** ISO timestamp. */
  executedAt: string;
}

export interface PreviewResult {
  /** Sample output data. */
  sampleOutput: unknown;
  /** Number of records in preview. */
  recordCount: number;
  /** Stage-by-stage intermediate results. */
  stageResults: Array<{
    name: string;
    type: string;
    sampleOutput: unknown;
    recordCount: number;
  }>;
}

export type OutputFormat = "json" | "csv" | "tsv" | "markdown" | "yaml";

/* ------------------------------------------------------------------ */
/*  Built-in transformation modules                                   */
/* ------------------------------------------------------------------ */

export interface TransformModule {
  id: string;
  name: string;
  type: "select" | "filter" | "transform" | "format" | "output";
  description: string;
  paramSchema: Record<string, { type: string; description: string; required?: boolean }>;
  execute: (input: unknown, params: Record<string, unknown>) => unknown | Promise<unknown>;
}

const builtinModules: TransformModule[] = [
  // Select modules
  {
    id: "select-fields",
    name: "Select Fields",
    type: "select",
    description: "Pick specific fields from records.",
    paramSchema: {
      fields: { type: "string[]", description: "Field names to keep.", required: true },
    },
    execute: (input: unknown, params: Record<string, unknown>) => {
      const fields = params.fields as string[];
      const records = Array.isArray(input) ? input : [input];
      return records.map((record: Record<string, unknown>) => {
        const selected: Record<string, unknown> = {};
        for (const field of fields) {
          if (field in record) selected[field] = record[field];
        }
        return selected;
      });
    },
  },
  {
    id: "select-all",
    name: "Select All",
    type: "select",
    description: "Pass through all data unchanged.",
    paramSchema: {},
    execute: (input: unknown) => input,
  },

  // Filter modules
  {
    id: "filter-threshold",
    name: "Filter by Threshold",
    type: "filter",
    description: "Keep records where a field meets a numeric threshold.",
    paramSchema: {
      field: { type: "string", description: "Field to compare.", required: true },
      operator: { type: "string", description: "Comparison operator (gt, gte, lt, lte, eq).", required: true },
      value: { type: "number", description: "Threshold value.", required: true },
    },
    execute: (input: unknown, params: Record<string, unknown>) => {
      const records = Array.isArray(input) ? input : [input];
      const field = params.field as string;
      const op = params.operator as string;
      const threshold = params.value as number;

      return records.filter((r: Record<string, unknown>) => {
        const val = Number(r[field]);
        switch (op) {
          case "gt": return val > threshold;
          case "gte": return val >= threshold;
          case "lt": return val < threshold;
          case "lte": return val <= threshold;
          case "eq": return val === threshold;
          default: return true;
        }
      });
    },
  },
  {
    id: "filter-search",
    name: "Filter by Text",
    type: "filter",
    description: "Keep records containing a search term.",
    paramSchema: {
      field: { type: "string", description: "Field to search.", required: true },
      query: { type: "string", description: "Search term.", required: true },
      caseSensitive: { type: "boolean", description: "Case-sensitive search." },
    },
    execute: (input: unknown, params: Record<string, unknown>) => {
      const records = Array.isArray(input) ? input : [input];
      const field = params.field as string;
      const query = params.query as string;
      const caseSensitive = params.caseSensitive as boolean ?? false;

      return records.filter((r: Record<string, unknown>) => {
        const val = String(r[field] ?? "");
        return caseSensitive
          ? val.includes(query)
          : val.toLowerCase().includes(query.toLowerCase());
      });
    },
  },

  // Transform modules
  {
    id: "transform-rename",
    name: "Rename Fields",
    type: "transform",
    description: "Rename record fields.",
    paramSchema: {
      mapping: { type: "Record<string,string>", description: "Old name -> new name mapping.", required: true },
    },
    execute: (input: unknown, params: Record<string, unknown>) => {
      const records = Array.isArray(input) ? input : [input];
      const mapping = params.mapping as Record<string, string>;

      return records.map((record: Record<string, unknown>) => {
        const renamed: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(record)) {
          renamed[mapping[key] ?? key] = value;
        }
        return renamed;
      });
    },
  },
  {
    id: "transform-compute",
    name: "Compute Field",
    type: "transform",
    description: "Add a computed field from existing fields.",
    paramSchema: {
      outputField: { type: "string", description: "Name of the new field.", required: true },
      operation: { type: "string", description: "Operation: sum, average, multiply, concat.", required: true },
      sourceFields: { type: "string[]", description: "Fields to use in computation.", required: true },
    },
    execute: (input: unknown, params: Record<string, unknown>) => {
      const records = Array.isArray(input) ? input : [input];
      const outputField = params.outputField as string;
      const operation = params.operation as string;
      const sourceFields = params.sourceFields as string[];

      return records.map((record: Record<string, unknown>) => {
        const values = sourceFields.map((f) => record[f]);
        let computed: unknown;

        switch (operation) {
          case "sum":
            computed = values.reduce((s: number, v) => s + Number(v), 0);
            break;
          case "average": {
            const sum = values.reduce((s: number, v) => s + Number(v), 0);
            computed = values.length > 0 ? sum / values.length : 0;
            break;
          }
          case "multiply":
            computed = values.reduce((p: number, v) => p * Number(v), 1);
            break;
          case "concat":
            computed = values.map(String).join(" ");
            break;
          default:
            computed = null;
        }

        return { ...record, [outputField]: computed };
      });
    },
  },
  {
    id: "transform-sort",
    name: "Sort Records",
    type: "transform",
    description: "Sort records by a field.",
    paramSchema: {
      field: { type: "string", description: "Sort field.", required: true },
      direction: { type: "string", description: "asc or desc." },
    },
    execute: (input: unknown, params: Record<string, unknown>) => {
      const records = Array.isArray(input) ? input : [input];
      const field = params.field as string;
      const dir = (params.direction as string) === "desc" ? -1 : 1;

      return [...records].sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const va = a[field];
        const vb = b[field];
        if (typeof va === "number" && typeof vb === "number") {
          return (va - vb) * dir;
        }
        return String(va ?? "").localeCompare(String(vb ?? "")) * dir;
      });
    },
  },

  // Format modules
  {
    id: "format-json",
    name: "JSON Format",
    type: "format",
    description: "Format output as JSON.",
    paramSchema: {
      pretty: { type: "boolean", description: "Pretty-print JSON." },
    },
    execute: (input: unknown, params: Record<string, unknown>) => {
      const pretty = params.pretty as boolean ?? true;
      return pretty ? JSON.stringify(input, null, 2) : JSON.stringify(input);
    },
  },
  {
    id: "format-csv",
    name: "CSV Format",
    type: "format",
    description: "Format output as CSV.",
    paramSchema: {
      delimiter: { type: "string", description: "Delimiter character." },
      includeHeaders: { type: "boolean", description: "Include header row." },
    },
    execute: (input: unknown, params: Record<string, unknown>) => {
      const records = Array.isArray(input) ? input : [input];
      if (records.length === 0) return "";

      const delimiter = (params.delimiter as string) ?? ",";
      const includeHeaders = (params.includeHeaders as boolean) ?? true;

      const headers = Object.keys(records[0] as Record<string, unknown>);
      const lines: string[] = [];

      if (includeHeaders) {
        lines.push(headers.join(delimiter));
      }

      for (const record of records) {
        const row = headers.map((h) => {
          const val = (record as Record<string, unknown>)[h];
          const str = val === null || val === undefined ? "" : String(val);
          // Escape values containing delimiter or quotes
          if (str.includes(delimiter) || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        });
        lines.push(row.join(delimiter));
      }

      return lines.join("\n");
    },
  },
  {
    id: "format-markdown",
    name: "Markdown Table",
    type: "format",
    description: "Format output as a Markdown table.",
    paramSchema: {},
    execute: (input: unknown) => {
      const records = Array.isArray(input) ? input : [input];
      if (records.length === 0) return "";

      const headers = Object.keys(records[0] as Record<string, unknown>);
      const lines: string[] = [];

      lines.push(`| ${headers.join(" | ")} |`);
      lines.push(`| ${headers.map(() => "---").join(" | ")} |`);

      for (const record of records) {
        const cells = headers.map((h) =>
          String((record as Record<string, unknown>)[h] ?? ""),
        );
        lines.push(`| ${cells.join(" | ")} |`);
      }

      return lines.join("\n");
    },
  },
];

/* ------------------------------------------------------------------ */
/*  Module registry                                                   */
/* ------------------------------------------------------------------ */

export class ModuleRegistry {
  private modules = new Map<string, TransformModule>();

  constructor() {
    // Register built-in modules
    for (const mod of builtinModules) {
      this.modules.set(mod.id, mod);
    }
  }

  register(module: TransformModule): void {
    this.modules.set(module.id, module);
  }

  get(id: string): TransformModule | undefined {
    return this.modules.get(id);
  }

  getByType(type: TransformModule["type"]): TransformModule[] {
    return Array.from(this.modules.values()).filter(
      (m) => m.type === type,
    );
  }

  getAll(): TransformModule[] {
    return Array.from(this.modules.values());
  }
}

/* ------------------------------------------------------------------ */
/*  Pipeline executor                                                 */
/* ------------------------------------------------------------------ */

export class ExportPipeline {
  private configs = new Map<string, PipelineConfig>();
  private registry: ModuleRegistry;

  constructor(registry?: ModuleRegistry) {
    this.registry = registry ?? new ModuleRegistry();
  }

  getRegistry(): ModuleRegistry {
    return this.registry;
  }

  /**
   * Save a pipeline configuration.
   */
  saveConfig(config: PipelineConfig): void {
    config.updatedAt = new Date().toISOString();
    this.configs.set(config.id, config);
  }

  /**
   * Get a saved pipeline configuration.
   */
  getConfig(id: string): PipelineConfig | undefined {
    return this.configs.get(id);
  }

  /**
   * List all saved pipeline configurations.
   */
  listConfigs(): PipelineConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Delete a pipeline configuration.
   */
  deleteConfig(id: string): boolean {
    return this.configs.delete(id);
  }

  /**
   * Execute a pipeline with the given input data.
   */
  async execute(
    pipelineId: string,
    inputData: unknown,
  ): Promise<PipelineResult> {
    const config = this.configs.get(pipelineId);
    if (!config) {
      return {
        pipelineId,
        success: false,
        data: null,
        stageTiming: [],
        totalDurationMs: 0,
        error: `Pipeline "${pipelineId}" not found.`,
        executedAt: new Date().toISOString(),
      };
    }

    return this.executeStages(config, inputData);
  }

  /**
   * Execute a pipeline from an inline config (not saved).
   */
  async executeInline(
    stages: StageConfig[],
    inputData: unknown,
  ): Promise<PipelineResult> {
    const config: PipelineConfig = {
      id: `inline_${Date.now()}`,
      name: "Inline Pipeline",
      stages,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      enabled: true,
    };

    return this.executeStages(config, inputData);
  }

  /**
   * Preview pipeline output with sample data.
   */
  async preview(
    pipelineId: string,
    inputData: unknown,
    sampleSize: number = 5,
  ): Promise<PreviewResult> {
    const config = this.configs.get(pipelineId);
    if (!config) {
      return {
        sampleOutput: null,
        recordCount: 0,
        stageResults: [],
      };
    }

    // Limit input to sample size
    let data: unknown = Array.isArray(inputData)
      ? inputData.slice(0, sampleSize)
      : inputData;

    const stageResults: PreviewResult["stageResults"] = [];

    for (const stageConfig of config.stages) {
      const module = this.registry.get(stageConfig.moduleId);
      if (!module) continue;

      data = await module.execute(data, stageConfig.params);
      const count = Array.isArray(data) ? data.length : 1;

      stageResults.push({
        name: module.name,
        type: module.type,
        sampleOutput: Array.isArray(data) ? data.slice(0, 3) : data,
        recordCount: count,
      });
    }

    return {
      sampleOutput: data,
      recordCount: Array.isArray(data) ? data.length : 1,
      stageResults,
    };
  }

  /**
   * Execute pipeline stages sequentially.
   */
  private async executeStages(
    config: PipelineConfig,
    inputData: unknown,
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const stageTiming: PipelineResult["stageTiming"] = [];
    let data: unknown = inputData;

    for (const stageConfig of config.stages) {
      const module = this.registry.get(stageConfig.moduleId);
      if (!module) {
        return {
          pipelineId: config.id,
          success: false,
          data: null,
          stageTiming,
          totalDurationMs: Date.now() - startTime,
          error: `Module "${stageConfig.moduleId}" not found.`,
          failedStage: stageConfig.moduleId,
          executedAt: new Date().toISOString(),
        };
      }

      const stageStart = Date.now();
      const inputCount = Array.isArray(data) ? data.length : 1;

      try {
        data = await module.execute(data, stageConfig.params);
      } catch (error) {
        return {
          pipelineId: config.id,
          success: false,
          data: null,
          stageTiming,
          totalDurationMs: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error),
          failedStage: module.name,
          executedAt: new Date().toISOString(),
        };
      }

      const outputCount = Array.isArray(data) ? data.length : 1;

      stageTiming.push({
        name: module.name,
        type: module.type,
        durationMs: Date.now() - stageStart,
        inputCount,
        outputCount,
      });
    }

    return {
      pipelineId: config.id,
      success: true,
      data,
      stageTiming,
      totalDurationMs: Date.now() - startTime,
      executedAt: new Date().toISOString(),
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Factory                                                           */
/* ------------------------------------------------------------------ */

let _pipeline: ExportPipeline | null = null;

export function getExportPipeline(): ExportPipeline {
  if (!_pipeline) {
    _pipeline = new ExportPipeline();
  }
  return _pipeline;
}
