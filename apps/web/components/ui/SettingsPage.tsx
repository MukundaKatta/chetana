"use client";

/**
 * Issue #531 - Settings page
 *
 * Categorized settings groups (General, API, Display, Privacy),
 * form controls, save/reset/defaults, import/export, change audit log.
 */

import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type SettingType =
  | "text"
  | "number"
  | "boolean"
  | "select"
  | "multiselect"
  | "color"
  | "range";

export interface SettingDefinition {
  key: string;
  label: string;
  description?: string;
  type: SettingType;
  defaultValue: unknown;
  category: SettingsCategory;
  /** Options for select / multiselect types. */
  options?: Array<{ value: string; label: string }>;
  /** Validation constraints. */
  min?: number;
  max?: number;
  step?: number;
  /** Whether the setting requires restart. */
  requiresRestart?: boolean;
  /** Whether this is a sensitive setting (masked display). */
  sensitive?: boolean;
}

export type SettingsCategory = "general" | "api" | "display" | "privacy";

export interface SettingsValues {
  [key: string]: unknown;
}

export interface SettingsChangeLogEntry {
  key: string;
  label: string;
  previousValue: unknown;
  newValue: unknown;
  timestamp: string;
  category: SettingsCategory;
}

export interface SettingsPageProps {
  /** Setting definitions. */
  definitions: SettingDefinition[];
  /** Current values. */
  values: SettingsValues;
  /** Called when settings are saved. */
  onSave: (values: SettingsValues) => void | Promise<void>;
  /** Called on reset to last saved. */
  onReset?: () => void;
  /** Change log for audit trail. */
  changeLog?: SettingsChangeLogEntry[];
  /** Whether save is in progress. */
  saving?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Category metadata                                                 */
/* ------------------------------------------------------------------ */

const CATEGORIES: Array<{
  id: SettingsCategory;
  label: string;
  description: string;
}> = [
  { id: "general", label: "General", description: "Core application settings" },
  { id: "api", label: "API", description: "API keys and endpoint configuration" },
  { id: "display", label: "Display", description: "Visual and UI preferences" },
  { id: "privacy", label: "Privacy", description: "Data and privacy controls" },
];

/* ------------------------------------------------------------------ */
/*  Storage key                                                       */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "chetana-settings";

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function SettingsPage({
  definitions,
  values: initialValues,
  onSave,
  onReset,
  changeLog = [],
  saving = false,
  className,
}: SettingsPageProps) {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("general");
  const [localValues, setLocalValues] = useState<SettingsValues>({ ...initialValues });
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with external values changes
  useEffect(() => {
    setLocalValues({ ...initialValues });
    setIsDirty(false);
  }, [initialValues]);

  // Group definitions by category
  const groupedDefs = useMemo(() => {
    const groups: Record<SettingsCategory, SettingDefinition[]> = {
      general: [],
      api: [],
      display: [],
      privacy: [],
    };
    for (const def of definitions) {
      groups[def.category]?.push(def);
    }
    return groups;
  }, [definitions]);

  // Filtered definitions for current category
  const filteredDefs = useMemo(() => {
    let defs = groupedDefs[activeCategory] ?? [];
    if (searchFilter) {
      const lower = searchFilter.toLowerCase();
      defs = defs.filter(
        (d) =>
          d.label.toLowerCase().includes(lower) ||
          d.key.toLowerCase().includes(lower) ||
          d.description?.toLowerCase().includes(lower)
      );
    }
    return defs;
  }, [groupedDefs, activeCategory, searchFilter]);

  // Count changed values per category
  const changeCounts = useMemo(() => {
    const counts: Record<SettingsCategory, number> = {
      general: 0,
      api: 0,
      display: 0,
      privacy: 0,
    };
    for (const def of definitions) {
      if (
        JSON.stringify(localValues[def.key]) !==
        JSON.stringify(initialValues[def.key])
      ) {
        counts[def.category]++;
      }
    }
    return counts;
  }, [definitions, localValues, initialValues]);

  const handleChange = useCallback(
    (key: string, value: unknown) => {
      setLocalValues((prev) => ({ ...prev, [key]: value }));
      setIsDirty(true);
      setSaveSuccess(false);
    },
    []
  );

  const handleSave = useCallback(async () => {
    await onSave(localValues);
    setIsDirty(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  }, [localValues, onSave]);

  const handleReset = useCallback(() => {
    setLocalValues({ ...initialValues });
    setIsDirty(false);
    onReset?.();
  }, [initialValues, onReset]);

  const handleResetDefaults = useCallback(() => {
    const defaults: SettingsValues = {};
    for (const def of definitions) {
      defaults[def.key] = def.defaultValue;
    }
    setLocalValues(defaults);
    setIsDirty(true);
  }, [definitions]);

  const handleExport = useCallback(() => {
    const json = JSON.stringify(localValues, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chetana-settings.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [localValues]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target?.result as string);
          if (typeof imported === "object" && imported !== null) {
            setLocalValues((prev) => ({ ...prev, ...imported }));
            setIsDirty(true);
          }
        } catch {
          // Invalid JSON
        }
      };
      reader.readAsText(file);
      // Reset the input
      e.target.value = "";
    },
    []
  );

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Settings</h1>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search settings..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-48 shrink-0 border-r border-gray-200 dark:border-gray-700 p-4 space-y-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex w-full items-center justify-between rounded px-3 py-2 text-sm transition-colors",
                activeCategory === cat.id
                  ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
            >
              {cat.label}
              {changeCounts[cat.id] > 0 && (
                <span className="ml-auto rounded-full bg-indigo-100 dark:bg-indigo-800 px-1.5 text-xs text-indigo-600 dark:text-indigo-300">
                  {changeCounts[cat.id]}
                </span>
              )}
            </button>
          ))}

          <hr className="my-3 border-gray-200 dark:border-gray-700" />

          <button
            onClick={() => setShowAuditLog(!showAuditLog)}
            className={cn(
              "flex w-full items-center rounded px-3 py-2 text-sm",
              showAuditLog
                ? "bg-gray-100 dark:bg-gray-800 font-medium"
                : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
          >
            Change Log
          </button>
        </nav>

        {/* Main content */}
        <div className="flex-1 overflow-auto p-6">
          {!showAuditLog ? (
            <>
              {/* Category header */}
              <div className="mb-6">
                <h2 className="text-lg font-medium">
                  {CATEGORIES.find((c) => c.id === activeCategory)?.label}
                </h2>
                <p className="text-sm text-gray-500">
                  {CATEGORIES.find((c) => c.id === activeCategory)?.description}
                </p>
              </div>

              {/* Settings fields */}
              {filteredDefs.length === 0 ? (
                <div className="text-gray-400 text-sm">
                  No settings found{searchFilter ? " matching your search" : ""}.
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredDefs.map((def) => (
                    <SettingField
                      key={def.key}
                      definition={def}
                      value={localValues[def.key] ?? def.defaultValue}
                      onChange={(v) => handleChange(def.key, v)}
                      isChanged={
                        JSON.stringify(localValues[def.key]) !==
                        JSON.stringify(initialValues[def.key])
                      }
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Audit log */
            <div>
              <h2 className="text-lg font-medium mb-4">Change Log</h2>
              {changeLog.length === 0 ? (
                <div className="text-gray-400 text-sm">No changes recorded yet.</div>
              ) : (
                <div className="space-y-2">
                  {changeLog.map((entry, i) => (
                    <div
                      key={i}
                      className="rounded border border-gray-200 dark:border-gray-700 p-3 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{entry.label}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1 text-gray-500">
                        <span className="line-through text-red-400">
                          {String(entry.previousValue)}
                        </span>
                        {" → "}
                        <span className="text-green-400">
                          {String(entry.newValue)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 capitalize">
                        {entry.category}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Export
          </button>
          <button
            onClick={handleImport}
            className="rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={handleResetDefaults}
            className="rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
          >
            Reset to Defaults
          </button>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="text-sm text-green-500">Settings saved</span>
          )}
          {isDirty && (
            <span className="text-sm text-yellow-500">Unsaved changes</span>
          )}
          <button
            onClick={handleReset}
            disabled={!isDirty}
            className="rounded border border-gray-300 dark:border-gray-600 px-4 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="rounded bg-indigo-600 px-4 py-1.5 text-sm text-white disabled:opacity-40 hover:bg-indigo-700"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Setting field sub-component                                       */
/* ------------------------------------------------------------------ */

function SettingField({
  definition,
  value,
  onChange,
  isChanged,
}: {
  definition: SettingDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  isChanged: boolean;
}) {
  const { type, label, description, options, min, max, step, requiresRestart, sensitive } =
    definition;
  const [showSensitive, setShowSensitive] = useState(false);

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        isChanged
          ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/10"
          : "border-gray-200 dark:border-gray-700"
      )}
    >
      <div className="flex items-start justify-between mb-1">
        <div>
          <label className="font-medium text-sm">{label}</label>
          {requiresRestart && (
            <span className="ml-2 text-xs text-yellow-500">(requires restart)</span>
          )}
        </div>
        {isChanged && (
          <span className="text-xs text-indigo-500 font-medium">Modified</span>
        )}
      </div>
      {description && (
        <p className="text-xs text-gray-500 mb-2">{description}</p>
      )}

      {/* Text input */}
      {type === "text" && (
        <div className="flex items-center gap-2">
          <input
            type={sensitive && !showSensitive ? "password" : "text"}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm"
          />
          {sensitive && (
            <button
              onClick={() => setShowSensitive(!showSensitive)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              {showSensitive ? "Hide" : "Show"}
            </button>
          )}
        </div>
      )}

      {/* Number input */}
      {type === "number" && (
        <input
          type="number"
          value={(value as number) ?? 0}
          min={min}
          max={max}
          step={step ?? 1}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-32 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm"
        />
      )}

      {/* Boolean toggle */}
      {type === "boolean" && (
        <button
          onClick={() => onChange(!value)}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            value ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"
          )}
          role="switch"
          aria-checked={!!value}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
              value ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
      )}

      {/* Select */}
      {type === "select" && (
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm"
        >
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {/* Range */}
      {type === "range" && (
        <div className="flex items-center gap-3">
          <input
            type="range"
            value={(value as number) ?? min ?? 0}
            min={min ?? 0}
            max={max ?? 100}
            step={step ?? 1}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm text-gray-500 w-12 text-right">
            {String(value)}
          </span>
        </div>
      )}

      {/* Color picker */}
      {type === "color" && (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={(value as string) ?? "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-8 rounded border border-gray-300 cursor-pointer"
          />
          <span className="text-sm text-gray-500">{String(value)}</span>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
