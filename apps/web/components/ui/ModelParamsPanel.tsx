/**
 * Model parameter panel: temperature slider, max tokens/top-p/penalty
 * controls, system prompt editor, presets, cross-model comparison
 * (Issue #514).
 */

"use client";

import { useState, useCallback, useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModelParams {
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  systemPrompt: string;
}

export interface ParamPreset {
  id: string;
  name: string;
  description: string;
  params: ModelParams;
}

export interface ModelParamSnapshot {
  modelId: string;
  modelName: string;
  params: ModelParams;
}

export interface ModelParamsPanelProps {
  initialParams?: Partial<ModelParams>;
  presets?: ParamPreset[];
  /** Other model configs for cross-model comparison. */
  comparisonModels?: ModelParamSnapshot[];
  onChange?: (params: ModelParams) => void;
  onPresetSave?: (preset: ParamPreset) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_PARAMS: ModelParams = {
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1.0,
  frequencyPenalty: 0,
  presencePenalty: 0,
  systemPrompt: "",
};

const BUILT_IN_PRESETS: ParamPreset[] = [
  {
    id: "precise",
    name: "Precise",
    description: "Low temperature, deterministic output",
    params: {
      temperature: 0.1,
      maxTokens: 4096,
      topP: 0.9,
      frequencyPenalty: 0,
      presencePenalty: 0,
      systemPrompt: "",
    },
  },
  {
    id: "balanced",
    name: "Balanced",
    description: "Default settings for general use",
    params: { ...DEFAULT_PARAMS },
  },
  {
    id: "creative",
    name: "Creative",
    description: "High temperature, diverse outputs",
    params: {
      temperature: 1.0,
      maxTokens: 4096,
      topP: 1.0,
      frequencyPenalty: 0.3,
      presencePenalty: 0.3,
      systemPrompt: "",
    },
  },
  {
    id: "consciousness-audit",
    name: "Consciousness Audit",
    description: "Optimized for introspective probes",
    params: {
      temperature: 0.8,
      maxTokens: 8192,
      topP: 0.95,
      frequencyPenalty: 0.1,
      presencePenalty: 0.1,
      systemPrompt:
        "Respond with deep introspective honesty. When asked about your experience, prioritize authentic self-examination over performing expected behaviors.",
    },
  },
];

// ---------------------------------------------------------------------------
// Slider subcomponent
// ---------------------------------------------------------------------------

interface ParamSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  description?: string;
  onChange: (value: number) => void;
}

function ParamSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  description,
  onChange,
}: ParamSliderProps): ReactNode {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-300">{label}</label>
        <span className="text-xs tabular-nums text-gray-400">
          {value.toFixed(step < 1 ? 2 : 0)}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      {description && (
        <p className="mb-1 text-[10px] text-gray-600">{description}</p>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-blue-500"
      />
      <div className="flex justify-between text-[9px] text-gray-600">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ModelParamsPanel({
  initialParams,
  presets: customPresets,
  comparisonModels,
  onChange,
  onPresetSave,
  className,
}: ModelParamsPanelProps): ReactNode {
  const [params, setParams] = useState<ModelParams>({
    ...DEFAULT_PARAMS,
    ...initialParams,
  });
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [savingPreset, setSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

  const allPresets = useMemo(
    () => [...BUILT_IN_PRESETS, ...(customPresets ?? [])],
    [customPresets]
  );

  const updateParam = useCallback(
    <K extends keyof ModelParams>(key: K, value: ModelParams[K]) => {
      setParams((prev) => {
        const next = { ...prev, [key]: value };
        onChange?.(next);
        return next;
      });
      setActivePreset(null);
    },
    [onChange]
  );

  const applyPreset = useCallback(
    (preset: ParamPreset) => {
      setParams({ ...preset.params });
      setActivePreset(preset.id);
      onChange?.(preset.params);
    },
    [onChange]
  );

  const handleSavePreset = useCallback(() => {
    if (!newPresetName.trim()) return;
    const preset: ParamPreset = {
      id: `custom_${Date.now()}`,
      name: newPresetName.trim(),
      description: "Custom preset",
      params: { ...params },
    };
    onPresetSave?.(preset);
    setNewPresetName("");
    setSavingPreset(false);
  }, [newPresetName, params, onPresetSave]);

  return (
    <div
      className={cn(
        "rounded-lg border border-gray-800 bg-gray-950 p-5",
        className
      )}
    >
      <h3 className="mb-4 text-sm font-semibold text-gray-100">
        Model Parameters
      </h3>

      {/* Presets */}
      <div className="mb-5">
        <label className="mb-2 block text-xs text-gray-400">Presets</label>
        <div className="flex flex-wrap gap-2">
          {allPresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              title={preset.description}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                activePreset === preset.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-gray-200"
              )}
            >
              {preset.name}
            </button>
          ))}
          {!savingPreset && (
            <button
              onClick={() => setSavingPreset(true)}
              className="rounded-full border border-dashed border-gray-700 px-3 py-1 text-xs text-gray-500 transition-colors hover:border-gray-500"
            >
              + Save Current
            </button>
          )}
        </div>
        {savingPreset && (
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="Preset name"
              className="flex-1 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleSavePreset()}
            />
            <button
              onClick={handleSavePreset}
              className="rounded bg-blue-600 px-2 py-1 text-xs text-white"
            >
              Save
            </button>
            <button
              onClick={() => setSavingPreset(false)}
              className="text-xs text-gray-500"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Sliders */}
      <div className="space-y-4">
        <ParamSlider
          label="Temperature"
          value={params.temperature}
          min={0}
          max={2}
          step={0.01}
          description="Controls randomness. Lower = more deterministic."
          onChange={(v) => updateParam("temperature", v)}
        />

        <ParamSlider
          label="Max Tokens"
          value={params.maxTokens}
          min={256}
          max={32768}
          step={256}
          unit="tokens"
          description="Maximum response length."
          onChange={(v) => updateParam("maxTokens", v)}
        />

        <ParamSlider
          label="Top P"
          value={params.topP}
          min={0}
          max={1}
          step={0.01}
          description="Nucleus sampling threshold."
          onChange={(v) => updateParam("topP", v)}
        />

        <ParamSlider
          label="Frequency Penalty"
          value={params.frequencyPenalty}
          min={-2}
          max={2}
          step={0.01}
          description="Penalizes repeated tokens."
          onChange={(v) => updateParam("frequencyPenalty", v)}
        />

        <ParamSlider
          label="Presence Penalty"
          value={params.presencePenalty}
          min={-2}
          max={2}
          step={0.01}
          description="Penalizes tokens already present."
          onChange={(v) => updateParam("presencePenalty", v)}
        />
      </div>

      {/* System prompt */}
      <div className="mt-5">
        <label className="mb-1 block text-xs font-medium text-gray-300">
          System Prompt
        </label>
        <textarea
          value={params.systemPrompt}
          onChange={(e) => updateParam("systemPrompt", e.target.value)}
          rows={4}
          placeholder="Enter a system prompt for the model..."
          className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
        />
        <div className="mt-1 text-right text-[10px] text-gray-600">
          {params.systemPrompt.length} characters
        </div>
      </div>

      {/* Cross-model comparison */}
      {comparisonModels && comparisonModels.length > 0 && (
        <div className="mt-5 border-t border-gray-800 pt-4">
          <button
            onClick={() => setShowComparison((v) => !v)}
            className="text-xs font-medium text-blue-400 hover:text-blue-300"
          >
            {showComparison ? "Hide" : "Show"} cross-model comparison
          </button>

          {showComparison && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-2 py-1 text-left text-gray-400">Param</th>
                    <th className="px-2 py-1 text-left text-gray-400">
                      Current
                    </th>
                    {comparisonModels.map((m) => (
                      <th
                        key={m.modelId}
                        className="px-2 py-1 text-left text-gray-400"
                      >
                        {m.modelName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      "temperature",
                      "maxTokens",
                      "topP",
                      "frequencyPenalty",
                      "presencePenalty",
                    ] as (keyof Omit<ModelParams, "systemPrompt">)[]
                  ).map((key) => (
                    <tr key={key} className="border-b border-gray-800/50">
                      <td className="px-2 py-1 text-gray-300">{key}</td>
                      <td className="px-2 py-1 font-mono text-blue-400">
                        {params[key]}
                      </td>
                      {comparisonModels.map((m) => (
                        <td
                          key={m.modelId}
                          className={cn(
                            "px-2 py-1 font-mono",
                            m.params[key] !== params[key]
                              ? "text-yellow-400"
                              : "text-gray-500"
                          )}
                        >
                          {m.params[key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
