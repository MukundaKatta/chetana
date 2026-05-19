/**
 * Probe prompt template engine (Issue #447).
 * Supports Mustache-style {{var}} placeholders, conditional sections,
 * template inheritance, validation, preview, and a typed variable registry.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type VariableType = "string" | "number" | "boolean" | "enum" | "array";

export interface VariableDefinition {
  /** Variable name (used in {{name}}). */
  name: string;
  /** Type of the variable. */
  type: VariableType;
  /** Human-readable description. */
  description: string;
  /** Whether the variable is required (default true). */
  required?: boolean;
  /** Default value. */
  defaultValue?: string | number | boolean | string[];
  /** Allowed values for enum type. */
  enumValues?: string[];
  /** Validation regex pattern (for string type). */
  pattern?: string;
}

export interface TemplateDefinition {
  /** Unique template identifier. */
  id: string;
  /** Template name. */
  name: string;
  /** The template body with {{var}} placeholders. */
  body: string;
  /** Variable definitions. */
  variables: VariableDefinition[];
  /** Parent template ID for inheritance (optional). */
  parentId?: string;
  /** Sections that override parent sections. */
  sections?: Record<string, string>;
  /** Metadata. */
  metadata?: Record<string, string>;
}

export interface TemplateValidationResult {
  valid: boolean;
  errors: TemplateError[];
  warnings: TemplateWarning[];
  /** Variables found in the template body. */
  referencedVariables: string[];
  /** Variables defined but not referenced. */
  unusedVariables: string[];
  /** Variables referenced but not defined. */
  undefinedVariables: string[];
}

export interface TemplateError {
  type: "undefined_variable" | "type_mismatch" | "missing_required" | "invalid_syntax" | "circular_inheritance";
  message: string;
  /** Position in the template string. */
  position?: number;
  variable?: string;
}

export interface TemplateWarning {
  type: "unused_variable" | "empty_section" | "deep_inheritance";
  message: string;
  variable?: string;
}

export interface RenderResult {
  /** The rendered output. */
  output: string;
  /** Variables that were substituted. */
  substitutedVariables: string[];
  /** Variables that used default values. */
  defaultedVariables: string[];
}

export type VariableValues = Record<string, string | number | boolean | string[]>;

/* ------------------------------------------------------------------ */
/*  Variable registry                                                 */
/* ------------------------------------------------------------------ */

export class VariableRegistry {
  private definitions = new Map<string, VariableDefinition>();

  /**
   * Register a variable definition.
   */
  register(def: VariableDefinition): void {
    this.definitions.set(def.name, def);
  }

  /**
   * Register multiple variable definitions.
   */
  registerAll(defs: VariableDefinition[]): void {
    for (const def of defs) {
      this.register(def);
    }
  }

  /**
   * Get a variable definition.
   */
  get(name: string): VariableDefinition | undefined {
    return this.definitions.get(name);
  }

  /**
   * Get all registered definitions.
   */
  getAll(): VariableDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * Check if a variable is registered.
   */
  has(name: string): boolean {
    return this.definitions.has(name);
  }

  /**
   * Validate a value against a variable definition.
   */
  validateValue(
    name: string,
    value: unknown,
  ): { valid: boolean; error?: string } {
    const def = this.definitions.get(name);
    if (!def) return { valid: false, error: `Unknown variable: ${name}` };

    if (value === undefined || value === null) {
      if (def.required !== false && def.defaultValue === undefined) {
        return { valid: false, error: `Required variable "${name}" is missing.` };
      }
      return { valid: true };
    }

    switch (def.type) {
      case "string":
        if (typeof value !== "string") {
          return { valid: false, error: `"${name}" must be a string.` };
        }
        if (def.pattern && !new RegExp(def.pattern).test(value)) {
          return {
            valid: false,
            error: `"${name}" does not match pattern ${def.pattern}.`,
          };
        }
        break;
      case "number":
        if (typeof value !== "number" || isNaN(value)) {
          return { valid: false, error: `"${name}" must be a number.` };
        }
        break;
      case "boolean":
        if (typeof value !== "boolean") {
          return { valid: false, error: `"${name}" must be a boolean.` };
        }
        break;
      case "enum":
        if (
          typeof value !== "string" ||
          !(def.enumValues ?? []).includes(value)
        ) {
          return {
            valid: false,
            error: `"${name}" must be one of: ${(def.enumValues ?? []).join(", ")}.`,
          };
        }
        break;
      case "array":
        if (!Array.isArray(value)) {
          return { valid: false, error: `"${name}" must be an array.` };
        }
        break;
    }

    return { valid: true };
  }
}

/* ------------------------------------------------------------------ */
/*  Parsing                                                           */
/* ------------------------------------------------------------------ */

/** Regex for {{variable}} placeholders. */
const VAR_REGEX = /\{\{([^{}]+?)\}\}/g;

/** Regex for conditional sections: {{#condition}}...{{/condition}} */
const SECTION_START_REGEX = /\{\{#(\w+)\}\}/g;
const SECTION_END_REGEX = /\{\{\/(\w+)\}\}/g;

/** Regex for inverted sections: {{^condition}}...{{/condition}} */
const INVERTED_SECTION_REGEX = /\{\{\^(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;

/** Regex for section blocks: {{#name}}content{{/name}} */
const SECTION_BLOCK_REGEX = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;

/**
 * Extract all variable names referenced in a template body.
 */
export function extractVariables(body: string): string[] {
  const vars = new Set<string>();

  // Simple variables
  let match: RegExpExecArray | null;
  const varRe = new RegExp(VAR_REGEX.source, "g");
  while ((match = varRe.exec(body)) !== null) {
    const name = match[1].trim();
    // Skip section markers (# and / and ^ prefixes)
    if (!name.startsWith("#") && !name.startsWith("/") && !name.startsWith("^")) {
      vars.add(name);
    }
  }

  // Section condition names
  const sectionRe = new RegExp(SECTION_START_REGEX.source, "g");
  while ((match = sectionRe.exec(body)) !== null) {
    vars.add(match[1]);
  }

  const invertedRe = /\{\{\^(\w+)\}\}/g;
  while ((match = invertedRe.exec(body)) !== null) {
    vars.add(match[1]);
  }

  return [...vars];
}

/* ------------------------------------------------------------------ */
/*  Template engine                                                   */
/* ------------------------------------------------------------------ */

export class PromptTemplateEngine {
  private templates = new Map<string, TemplateDefinition>();
  private registry: VariableRegistry;

  constructor(registry?: VariableRegistry) {
    this.registry = registry ?? new VariableRegistry();
  }

  /**
   * Get the variable registry.
   */
  getRegistry(): VariableRegistry {
    return this.registry;
  }

  /**
   * Register a template.
   */
  registerTemplate(template: TemplateDefinition): void {
    this.templates.set(template.id, template);
    // Auto-register variables from the template
    this.registry.registerAll(template.variables);
  }

  /**
   * Get a registered template.
   */
  getTemplate(id: string): TemplateDefinition | undefined {
    return this.templates.get(id);
  }

  /**
   * Resolve template inheritance and return the final body.
   */
  resolveInheritance(templateId: string, maxDepth: number = 10): string {
    const visited = new Set<string>();
    let currentId: string | undefined = templateId;
    const chain: TemplateDefinition[] = [];

    while (currentId) {
      if (visited.has(currentId)) {
        throw new Error(`Circular inheritance detected: ${currentId}`);
      }
      visited.add(currentId);

      const tmpl = this.templates.get(currentId);
      if (!tmpl) break;

      chain.unshift(tmpl); // parent first
      currentId = tmpl.parentId;

      if (chain.length > maxDepth) {
        throw new Error(`Template inheritance exceeds max depth of ${maxDepth}.`);
      }
    }

    if (chain.length === 0) return "";

    // Start from the root parent body and apply section overrides
    let body = chain[0].body;

    for (let i = 1; i < chain.length; i++) {
      const child = chain[i];
      if (child.sections) {
        for (const [sectionName, sectionContent] of Object.entries(child.sections)) {
          // Replace {{#section_name}}...{{/section_name}} blocks
          const sectionRegex = new RegExp(
            `\\{\\{#${sectionName}\\}\\}[\\s\\S]*?\\{\\{\\/${sectionName}\\}\\}`,
            "g",
          );
          body = body.replace(
            sectionRegex,
            `{{#${sectionName}}}${sectionContent}{{/${sectionName}}}`,
          );
        }
      }
      // If child has its own body that overrides entirely
      if (child.body && !child.parentId) {
        body = child.body;
      }
    }

    return body;
  }

  /**
   * Render a template with the given variable values.
   */
  render(
    templateId: string,
    values: VariableValues = {},
  ): RenderResult {
    const body = this.resolveInheritance(templateId);
    return this.renderString(body, values);
  }

  /**
   * Render a raw template string (not registered).
   */
  renderString(
    body: string,
    values: VariableValues = {},
  ): RenderResult {
    const substituted: string[] = [];
    const defaulted: string[] = [];

    let result = body;

    // Process conditional sections: {{#name}}content{{/name}}
    result = result.replace(
      new RegExp(SECTION_BLOCK_REGEX.source, "g"),
      (_, name: string, content: string) => {
        const val = values[name];
        if (isTruthy(val)) {
          // If it's an array, repeat for each element
          if (Array.isArray(val)) {
            return val
              .map((item) =>
                content.replace(/\{\{\.\}\}/g, String(item)),
              )
              .join("");
          }
          return content;
        }
        return "";
      },
    );

    // Process inverted sections: {{^name}}content{{/name}}
    result = result.replace(
      new RegExp(INVERTED_SECTION_REGEX.source, "g"),
      (_, name: string, content: string) => {
        const val = values[name];
        return isTruthy(val) ? "" : content;
      },
    );

    // Substitute simple variables: {{name}}
    result = result.replace(
      new RegExp(VAR_REGEX.source, "g"),
      (_, name: string) => {
        const trimmed = name.trim();
        const val = values[trimmed];

        if (val !== undefined && val !== null) {
          substituted.push(trimmed);
          return Array.isArray(val) ? val.join(", ") : String(val);
        }

        // Check for default in registry
        const def = this.registry.get(trimmed);
        if (def?.defaultValue !== undefined) {
          defaulted.push(trimmed);
          return Array.isArray(def.defaultValue)
            ? def.defaultValue.join(", ")
            : String(def.defaultValue);
        }

        // Leave placeholder as-is if no value
        return `{{${trimmed}}}`;
      },
    );

    return {
      output: result,
      substitutedVariables: substituted,
      defaultedVariables: defaulted,
    };
  }

  /**
   * Validate a template for correctness.
   */
  validate(templateId: string): TemplateValidationResult {
    const template = this.templates.get(templateId);
    if (!template) {
      return {
        valid: false,
        errors: [
          {
            type: "invalid_syntax",
            message: `Template "${templateId}" not found.`,
          },
        ],
        warnings: [],
        referencedVariables: [],
        unusedVariables: [],
        undefinedVariables: [],
      };
    }

    const errors: TemplateError[] = [];
    const warnings: TemplateWarning[] = [];

    // Check for circular inheritance
    try {
      this.resolveInheritance(templateId);
    } catch (e) {
      errors.push({
        type: "circular_inheritance",
        message: e instanceof Error ? e.message : String(e),
      });
    }

    // Check inheritance depth
    let depth = 0;
    let current: string | undefined = templateId;
    const visited = new Set<string>();
    while (current) {
      if (visited.has(current)) break;
      visited.add(current);
      depth++;
      current = this.templates.get(current)?.parentId;
    }
    if (depth > 5) {
      warnings.push({
        type: "deep_inheritance",
        message: `Template inheritance depth is ${depth}. Consider flattening.`,
      });
    }

    // Extract referenced and defined variables
    const body = template.body;
    const referenced = extractVariables(body);
    const defined = new Set(template.variables.map((v) => v.name));

    const undefinedVars = referenced.filter((v) => !defined.has(v));
    const unusedVars = template.variables
      .filter((v) => !referenced.includes(v.name))
      .map((v) => v.name);

    for (const v of undefinedVars) {
      errors.push({
        type: "undefined_variable",
        message: `Variable "{{${v}}}" is referenced but not defined.`,
        variable: v,
      });
    }

    for (const v of unusedVars) {
      warnings.push({
        type: "unused_variable",
        message: `Variable "${v}" is defined but never referenced.`,
        variable: v,
      });
    }

    // Check balanced sections
    const openSections: string[] = [];
    const sectionStartRe = /\{\{[#^](\w+)\}\}/g;
    const sectionEndRe = /\{\{\/(\w+)\}\}/g;

    let m: RegExpExecArray | null;
    while ((m = sectionStartRe.exec(body)) !== null) {
      openSections.push(m[1]);
    }
    const closedSections: string[] = [];
    while ((m = sectionEndRe.exec(body)) !== null) {
      closedSections.push(m[1]);
    }

    for (const sec of openSections) {
      if (!closedSections.includes(sec)) {
        errors.push({
          type: "invalid_syntax",
          message: `Section "{{#${sec}}}" is opened but never closed.`,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      referencedVariables: referenced,
      unusedVariables: unusedVars,
      undefinedVariables: undefinedVars,
    };
  }

  /**
   * Preview a template with sample values.
   */
  preview(
    templateId: string,
    sampleValues?: VariableValues,
  ): RenderResult {
    const template = this.templates.get(templateId);
    if (!template) {
      return {
        output: "",
        substitutedVariables: [],
        defaultedVariables: [],
      };
    }

    // Generate sample values from definitions if not provided
    const values: VariableValues = { ...sampleValues };
    for (const def of template.variables) {
      if (values[def.name] === undefined) {
        if (def.defaultValue !== undefined) {
          values[def.name] = def.defaultValue;
        } else {
          switch (def.type) {
            case "string":
              values[def.name] = `[sample_${def.name}]`;
              break;
            case "number":
              values[def.name] = 42;
              break;
            case "boolean":
              values[def.name] = true;
              break;
            case "enum":
              values[def.name] = def.enumValues?.[0] ?? "";
              break;
            case "array":
              values[def.name] = ["item1", "item2"];
              break;
          }
        }
      }
    }

    return this.render(templateId, values);
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function isTruthy(value: unknown): boolean {
  if (value === undefined || value === null || value === false) return false;
  if (value === 0 || value === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

/**
 * Create a pre-configured template engine with common variables.
 */
export function createDefaultEngine(): PromptTemplateEngine {
  const registry = new VariableRegistry();

  registry.registerAll([
    {
      name: "model_name",
      type: "string",
      description: "Name of the AI model being tested.",
      required: true,
    },
    {
      name: "theory",
      type: "enum",
      description: "Consciousness theory being probed.",
      enumValues: ["gwt", "iit", "hot", "rpt", "pp", "ast"],
      required: true,
    },
    {
      name: "probe_context",
      type: "string",
      description: "Additional context for the probe.",
      required: false,
      defaultValue: "",
    },
    {
      name: "difficulty",
      type: "enum",
      description: "Probe difficulty level.",
      enumValues: ["easy", "medium", "hard", "expert"],
      required: false,
      defaultValue: "medium",
    },
    {
      name: "temperature",
      type: "number",
      description: "Sampling temperature for the model.",
      required: false,
      defaultValue: 0.7,
    },
    {
      name: "include_examples",
      type: "boolean",
      description: "Whether to include few-shot examples.",
      required: false,
      defaultValue: false,
    },
  ]);

  return new PromptTemplateEngine(registry);
}
