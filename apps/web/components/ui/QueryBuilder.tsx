"use client";

import {
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  Upload,
  Copy,
  ChevronDown,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type FieldType = "string" | "number" | "boolean" | "date" | "enum";

export interface FieldDefinition {
  name: string;
  label: string;
  type: FieldType;
  /** For enum fields: list of allowed values. */
  enumValues?: string[];
}

export type Operator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "in"
  | "not_in"
  | "is_null"
  | "is_not_null"
  | "is_true"
  | "is_false"
  | "before"
  | "after";

export interface FilterCondition {
  id: string;
  field: string;
  operator: Operator;
  value: unknown;
  /** Second value for "between" operator. */
  value2?: unknown;
}

export interface FilterGroup {
  id: string;
  logic: "AND" | "OR";
  conditions: FilterCondition[];
  groups: FilterGroup[];
}

export interface QueryPreset {
  id: string;
  name: string;
  description?: string;
  query: FilterGroup;
  createdAt: string;
}

export interface QueryBuilderProps {
  fields: FieldDefinition[];
  /** Initial query state. */
  initialQuery?: FilterGroup;
  /** Saved presets. */
  presets?: QueryPreset[];
  /** Called whenever the query changes. */
  onChange?: (query: FilterGroup) => void;
  /** Called to save a preset. */
  onSavePreset?: (preset: QueryPreset) => void;
  /** Called to load a preset. */
  onLoadPreset?: (preset: QueryPreset) => void;
  /** Live count preview. */
  resultCount?: number | null;
  /** Whether the count is currently loading. */
  countLoading?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

let _idCounter = 0;
function uid(): string {
  return `qb_${Date.now().toString(36)}_${(++_idCounter).toString(36)}`;
}

const OPERATORS_BY_TYPE: Record<FieldType, Operator[]> = {
  string: [
    "equals",
    "not_equals",
    "contains",
    "not_contains",
    "starts_with",
    "ends_with",
    "is_null",
    "is_not_null",
  ],
  number: [
    "equals",
    "not_equals",
    "gt",
    "gte",
    "lt",
    "lte",
    "between",
    "is_null",
    "is_not_null",
  ],
  boolean: ["is_true", "is_false"],
  date: [
    "equals",
    "before",
    "after",
    "between",
    "is_null",
    "is_not_null",
  ],
  enum: ["equals", "not_equals", "in", "not_in"],
};

const OPERATOR_LABELS: Record<Operator, string> = {
  equals: "equals",
  not_equals: "does not equal",
  contains: "contains",
  not_contains: "does not contain",
  starts_with: "starts with",
  ends_with: "ends with",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  between: "between",
  in: "is one of",
  not_in: "is not one of",
  is_null: "is empty",
  is_not_null: "is not empty",
  is_true: "is true",
  is_false: "is false",
  before: "before",
  after: "after",
};

function createEmptyCondition(fields: FieldDefinition[]): FilterCondition {
  return {
    id: uid(),
    field: fields[0]?.name ?? "",
    operator: "equals",
    value: "",
  };
}

function createEmptyGroup(): FilterGroup {
  return {
    id: uid(),
    logic: "AND",
    conditions: [],
    groups: [],
  };
}

/* ------------------------------------------------------------------ */
/*  Deep clone / update helpers for immutable state                   */
/* ------------------------------------------------------------------ */

function updateGroupRecursive(
  group: FilterGroup,
  targetId: string,
  updater: (g: FilterGroup) => FilterGroup,
): FilterGroup {
  if (group.id === targetId) return updater(group);
  return {
    ...group,
    groups: group.groups.map((g) =>
      updateGroupRecursive(g, targetId, updater),
    ),
  };
}

function removeGroupRecursive(
  group: FilterGroup,
  targetId: string,
): FilterGroup {
  return {
    ...group,
    groups: group.groups
      .filter((g) => g.id !== targetId)
      .map((g) => removeGroupRecursive(g, targetId)),
  };
}

/* ------------------------------------------------------------------ */
/*  Condition row                                                     */
/* ------------------------------------------------------------------ */

function ConditionRow({
  condition,
  fields,
  onUpdate,
  onRemove,
}: {
  condition: FilterCondition;
  fields: FieldDefinition[];
  onUpdate: (c: FilterCondition) => void;
  onRemove: () => void;
}) {
  const fieldDef = fields.find((f) => f.name === condition.field);
  const fieldType: FieldType = fieldDef?.type ?? "string";
  const operators = OPERATORS_BY_TYPE[fieldType];
  const needsValue = !["is_null", "is_not_null", "is_true", "is_false"].includes(
    condition.operator,
  );
  const needsSecondValue = condition.operator === "between";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900">
      <GripVertical className="h-4 w-4 cursor-grab text-gray-400" />

      {/* Field select */}
      <select
        value={condition.field}
        onChange={(e) =>
          onUpdate({
            ...condition,
            field: e.target.value,
            operator: "equals",
            value: "",
          })
        }
        className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
      >
        {fields.map((f) => (
          <option key={f.name} value={f.name}>
            {f.label}
          </option>
        ))}
      </select>

      {/* Operator select */}
      <select
        value={condition.operator}
        onChange={(e) =>
          onUpdate({ ...condition, operator: e.target.value as Operator })
        }
        className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
      >
        {operators.map((op) => (
          <option key={op} value={op}>
            {OPERATOR_LABELS[op]}
          </option>
        ))}
      </select>

      {/* Value input */}
      {needsValue && fieldType === "enum" && fieldDef?.enumValues ? (
        <select
          value={String(condition.value ?? "")}
          onChange={(e) => onUpdate({ ...condition, value: e.target.value })}
          className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
        >
          <option value="">Select...</option>
          {fieldDef.enumValues.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      ) : needsValue && fieldType === "boolean" ? null : needsValue ? (
        <input
          type={fieldType === "number" ? "number" : fieldType === "date" ? "date" : "text"}
          value={String(condition.value ?? "")}
          onChange={(e) => onUpdate({ ...condition, value: e.target.value })}
          placeholder="Value"
          className="w-32 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
        />
      ) : null}

      {/* Second value for between */}
      {needsSecondValue && (
        <>
          <span className="text-xs text-gray-500">and</span>
          <input
            type={fieldType === "number" ? "number" : "date"}
            value={String(condition.value2 ?? "")}
            onChange={(e) => onUpdate({ ...condition, value2: e.target.value })}
            placeholder="Value"
            className="w-32 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
          />
        </>
      )}

      <button
        onClick={onRemove}
        className="ml-auto rounded p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
        title="Remove condition"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Group component (recursive)                                       */
/* ------------------------------------------------------------------ */

function GroupBlock({
  group,
  fields,
  depth,
  onUpdateGroup,
  onRemoveGroup,
}: {
  group: FilterGroup;
  fields: FieldDefinition[];
  depth: number;
  onUpdateGroup: (updated: FilterGroup) => void;
  onRemoveGroup?: () => void;
}) {
  const toggleLogic = () => {
    onUpdateGroup({ ...group, logic: group.logic === "AND" ? "OR" : "AND" });
  };

  const addCondition = () => {
    onUpdateGroup({
      ...group,
      conditions: [...group.conditions, createEmptyCondition(fields)],
    });
  };

  const addSubgroup = () => {
    const newGroup = createEmptyGroup();
    newGroup.conditions = [createEmptyCondition(fields)];
    onUpdateGroup({ ...group, groups: [...group.groups, newGroup] });
  };

  const updateCondition = (idx: number, updated: FilterCondition) => {
    const conditions = [...group.conditions];
    conditions[idx] = updated;
    onUpdateGroup({ ...group, conditions });
  };

  const removeCondition = (idx: number) => {
    onUpdateGroup({
      ...group,
      conditions: group.conditions.filter((_, i) => i !== idx),
    });
  };

  const updateSubgroup = (subId: string, updated: FilterGroup) => {
    onUpdateGroup({
      ...group,
      groups: group.groups.map((g) => (g.id === subId ? updated : g)),
    });
  };

  const removeSubgroup = (subId: string) => {
    onUpdateGroup({
      ...group,
      groups: group.groups.filter((g) => g.id !== subId),
    });
  };

  const borderColor =
    depth === 0
      ? "border-gray-300 dark:border-gray-600"
      : depth === 1
        ? "border-blue-300 dark:border-blue-700"
        : "border-purple-300 dark:border-purple-700";

  return (
    <div
      className={cn(
        "rounded-lg border-2 p-3",
        borderColor,
        depth > 0 && "bg-gray-50/50 dark:bg-gray-800/50",
      )}
    >
      {/* Group header */}
      <div className="mb-2 flex items-center gap-2">
        <button
          onClick={toggleLogic}
          className={cn(
            "rounded-md px-2.5 py-0.5 text-xs font-bold uppercase transition",
            group.logic === "AND"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
          )}
        >
          {group.logic}
        </button>
        <span className="text-xs text-gray-500">
          Match {group.logic === "AND" ? "all" : "any"} of the following
        </span>
        {onRemoveGroup && (
          <button
            onClick={onRemoveGroup}
            className="ml-auto rounded p-1 text-gray-400 transition hover:text-red-500"
            title="Remove group"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Conditions */}
      <div className="space-y-2">
        {group.conditions.map((cond, idx) => (
          <ConditionRow
            key={cond.id}
            condition={cond}
            fields={fields}
            onUpdate={(c) => updateCondition(idx, c)}
            onRemove={() => removeCondition(idx)}
          />
        ))}

        {/* Nested groups */}
        {group.groups.map((sub) => (
          <GroupBlock
            key={sub.id}
            group={sub}
            fields={fields}
            depth={depth + 1}
            onUpdateGroup={(u) => updateSubgroup(sub.id, u)}
            onRemoveGroup={() => removeSubgroup(sub.id)}
          />
        ))}
      </div>

      {/* Add buttons */}
      <div className="mt-2 flex gap-2">
        <button
          onClick={addCondition}
          className="flex items-center gap-1 rounded-md border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-500 transition hover:border-blue-400 hover:text-blue-500 dark:border-gray-600"
        >
          <Plus className="h-3 w-3" /> Condition
        </button>
        {depth < 2 && (
          <button
            onClick={addSubgroup}
            className="flex items-center gap-1 rounded-md border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-500 transition hover:border-purple-400 hover:text-purple-500 dark:border-gray-600"
          >
            <Plus className="h-3 w-3" /> Group
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export function QueryBuilder({
  fields,
  initialQuery,
  presets = [],
  onChange,
  onSavePreset,
  onLoadPreset,
  resultCount,
  countLoading = false,
  className,
}: QueryBuilderProps) {
  const [query, setQuery] = useState<FilterGroup>(() => {
    if (initialQuery) return initialQuery;
    const root = createEmptyGroup();
    root.conditions = [createEmptyCondition(fields)];
    return root;
  });

  const [presetName, setPresetName] = useState("");
  const [showPresets, setShowPresets] = useState(false);

  const handleUpdate = useCallback(
    (updated: FilterGroup) => {
      setQuery(updated);
      onChange?.(updated);
    },
    [onChange],
  );

  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) return;
    const preset: QueryPreset = {
      id: uid(),
      name: presetName.trim(),
      query: structuredClone(query),
      createdAt: new Date().toISOString(),
    };
    onSavePreset?.(preset);
    setPresetName("");
  }, [presetName, query, onSavePreset]);

  const handleLoadPreset = useCallback(
    (preset: QueryPreset) => {
      setQuery(structuredClone(preset.query));
      onChange?.(preset.query);
      onLoadPreset?.(preset);
      setShowPresets(false);
    },
    [onChange, onLoadPreset],
  );

  const queryJSON = useMemo(
    () => JSON.stringify(query, null, 2),
    [query],
  );

  return (
    <div className={cn("space-y-3", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        {/* Save preset */}
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Preset name..."
            className="w-36 rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
          />
          <button
            onClick={handleSavePreset}
            disabled={!presetName.trim()}
            className="flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-40"
          >
            <Save className="h-3 w-3" /> Save
          </button>
        </div>

        {/* Load preset */}
        {presets.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs transition hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
            >
              <Upload className="h-3 w-3" /> Load
              <ChevronDown className="h-3 w-3" />
            </button>
            {showPresets && (
              <div className="absolute top-full left-0 z-10 mt-1 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                {presets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleLoadPreset(p)}
                    className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Copy JSON */}
        <button
          onClick={() => navigator.clipboard?.writeText(queryJSON)}
          className="flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs transition hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
          title="Copy query as JSON"
        >
          <Copy className="h-3 w-3" /> JSON
        </button>

        {/* Result count preview */}
        <div className="ml-auto text-xs text-gray-500">
          {countLoading ? (
            <span className="animate-pulse">Counting...</span>
          ) : resultCount !== undefined && resultCount !== null ? (
            <span>
              <strong className="text-gray-900 dark:text-gray-100">
                {resultCount.toLocaleString()}
              </strong>{" "}
              results
            </span>
          ) : null}
        </div>
      </div>

      {/* Query groups */}
      <GroupBlock
        group={query}
        fields={fields}
        depth={0}
        onUpdateGroup={handleUpdate}
      />
    </div>
  );
}

/** Serialize a FilterGroup to a human-readable string. */
export function queryToString(group: FilterGroup): string {
  const parts: string[] = [];

  for (const cond of group.conditions) {
    parts.push(
      `${cond.field} ${OPERATOR_LABELS[cond.operator]} ${JSON.stringify(cond.value)}${
        cond.value2 !== undefined ? ` and ${JSON.stringify(cond.value2)}` : ""
      }`,
    );
  }

  for (const sub of group.groups) {
    parts.push(`(${queryToString(sub)})`);
  }

  return parts.join(` ${group.logic} `);
}

export default QueryBuilder;
