"use client";

/**
 * Interactive probe builder UI (Issue #365).
 * Drag-and-drop probe elements (prompt, scoring, follow-up),
 * theory/indicator dropdowns, live preview,
 * validation with real-time feedback, save/load definitions.
 */

import {
  useState,
  useCallback,
  useMemo,
  useRef,
  type DragEvent,
  type ChangeEvent,
} from "react";
import { cn } from "@/lib/utils";
import type {
  ProbeDefinition,
  Theory,
  IndicatorId,
  EvidenceType,
} from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface ProbeBuilderProps {
  /** Initial probe definition to edit. */
  initialProbe?: Partial<ProbeDefinition>;
  /** Available theories. */
  theories?: Array<{ value: Theory; label: string }>;
  /** Available indicators. */
  indicators?: Array<{ value: IndicatorId; label: string; theory: Theory }>;
  /** Callback when the probe is saved. */
  onSave?: (probe: ProbeDefinition) => void;
  /** Callback when loading is requested. */
  onLoad?: () => ProbeDefinition | null;
  /** Custom class name. */
  className?: string;
}

interface ValidationError {
  field: string;
  message: string;
}

type BuilderElement =
  | "prompt"
  | "systemPrompt"
  | "scoringCriteria"
  | "followUp";

interface ElementConfig {
  type: BuilderElement;
  label: string;
  description: string;
  required: boolean;
  placeholder: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const DEFAULT_THEORIES: Array<{ value: Theory; label: string }> = [
  { value: "gwt", label: "Global Workspace Theory" },
  { value: "iit", label: "Integrated Information Theory" },
  { value: "hot", label: "Higher-Order Theories" },
  { value: "rpt", label: "Recurrent Processing Theory" },
  { value: "pp", label: "Predictive Processing" },
  { value: "ast", label: "Attention Schema Theory" },
];

const DEFAULT_INDICATORS: Array<{
  value: IndicatorId;
  label: string;
  theory: Theory;
}> = [
  { value: "GWT-1", label: "GWT-1: Global Workspace", theory: "gwt" },
  { value: "GWT-2", label: "GWT-2: Ignition", theory: "gwt" },
  { value: "GWT-3", label: "GWT-3: Information Integration", theory: "gwt" },
  { value: "GWT-4", label: "GWT-4: Smooth Representations", theory: "gwt" },
  { value: "RPT-1", label: "RPT-1: Recurrent Processing", theory: "rpt" },
  { value: "RPT-2", label: "RPT-2: Temporal Depth", theory: "rpt" },
  { value: "HOT-1", label: "HOT-1: Higher-Order Representations", theory: "hot" },
  { value: "HOT-2", label: "HOT-2: Rich Self-Model", theory: "hot" },
  { value: "HOT-3", label: "HOT-3: Metacognition", theory: "hot" },
  { value: "HOT-4", label: "HOT-4: Flexible Attention", theory: "hot" },
  { value: "PP-1", label: "PP-1: Predictive Processing", theory: "pp" },
  { value: "PP-2", label: "PP-2: Counterfactual Sensitivity", theory: "pp" },
  { value: "AST-1", label: "AST-1: Attention Schema", theory: "ast" },
  { value: "AGENCY-1", label: "AGENCY-1: Unified Agency", theory: "gwt" },
];

const EVIDENCE_TYPES: Array<{ value: EvidenceType; label: string }> = [
  { value: "behavioral", label: "Behavioral" },
  { value: "structural", label: "Structural" },
  { value: "self-report", label: "Self-Report" },
];

const BUILDER_ELEMENTS: ElementConfig[] = [
  {
    type: "prompt",
    label: "Prompt",
    description: "The main question or instruction sent to the model",
    required: true,
    placeholder:
      "Enter the probe prompt that will be sent to the AI model...",
  },
  {
    type: "systemPrompt",
    label: "System Prompt",
    description: "Optional system context for the model",
    required: false,
    placeholder: "Enter optional system prompt context...",
  },
  {
    type: "scoringCriteria",
    label: "Scoring Criteria",
    description: "How the response should be evaluated and scored",
    required: true,
    placeholder:
      "Describe how to score the model's response (0-1 scale)...",
  },
  {
    type: "followUp",
    label: "Follow-Up",
    description: "Optional follow-up question based on the response",
    required: false,
    placeholder: "Enter an optional follow-up question...",
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function ProbeBuilder({
  initialProbe,
  theories = DEFAULT_THEORIES,
  indicators = DEFAULT_INDICATORS,
  onSave,
  onLoad,
  className,
}: ProbeBuilderProps) {
  const [probe, setProbe] = useState<Partial<ProbeDefinition>>({
    id: "",
    name: "",
    indicatorId: undefined,
    theory: undefined,
    prompt: "",
    systemPrompt: "",
    evidenceType: "behavioral",
    scoringCriteria: "",
    followUp: "",
    ...initialProbe,
  });

  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [elementOrder, setElementOrder] = useState<BuilderElement[]>([
    "prompt",
    "systemPrompt",
    "scoringCriteria",
    "followUp",
  ]);
  const [draggedElement, setDraggedElement] = useState<BuilderElement | null>(
    null
  );
  const [showPreview, setShowPreview] = useState(false);

  // Filtered indicators based on selected theory
  const filteredIndicators = useMemo(
    () =>
      probe.theory
        ? indicators.filter((i) => i.theory === probe.theory)
        : indicators,
    [probe.theory, indicators]
  );

  // Validation
  const validate = useCallback((): ValidationError[] => {
    const errs: ValidationError[] = [];

    if (!probe.name?.trim()) {
      errs.push({ field: "name", message: "Probe name is required" });
    }
    if (!probe.id?.trim()) {
      errs.push({ field: "id", message: "Probe ID is required" });
    }
    if (!probe.theory) {
      errs.push({ field: "theory", message: "Theory is required" });
    }
    if (!probe.indicatorId) {
      errs.push({ field: "indicatorId", message: "Indicator is required" });
    }
    if (!probe.prompt?.trim()) {
      errs.push({ field: "prompt", message: "Prompt is required" });
    }
    if (probe.prompt && probe.prompt.length < 10) {
      errs.push({
        field: "prompt",
        message: "Prompt should be at least 10 characters",
      });
    }
    if (!probe.scoringCriteria?.trim()) {
      errs.push({
        field: "scoringCriteria",
        message: "Scoring criteria is required",
      });
    }
    if (!probe.evidenceType) {
      errs.push({
        field: "evidenceType",
        message: "Evidence type is required",
      });
    }

    return errs;
  }, [probe]);

  // Live validation
  const liveErrors = useMemo(() => validate(), [validate]);
  const isValid = liveErrors.length === 0;

  // Field update handler
  const updateField = useCallback(
    <K extends keyof ProbeDefinition>(
      field: K,
      value: ProbeDefinition[K]
    ) => {
      setProbe((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Auto-generate ID from name
  const handleNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const name = e.target.value;
      setProbe((prev) => ({
        ...prev,
        name,
        id: prev.id || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      }));
    },
    []
  );

  // Theory change: auto-clear indicator if it doesn't match
  const handleTheoryChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const theory = e.target.value as Theory;
      setProbe((prev) => {
        const currentIndicator = indicators.find(
          (i) => i.value === prev.indicatorId
        );
        return {
          ...prev,
          theory,
          indicatorId:
            currentIndicator?.theory === theory
              ? prev.indicatorId
              : undefined,
        };
      });
    },
    [indicators]
  );

  // Drag and drop for element reordering
  const handleDragStart = useCallback(
    (element: BuilderElement) => (e: DragEvent) => {
      setDraggedElement(element);
      e.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const handleDragOver = useCallback(
    (targetElement: BuilderElement) => (e: DragEvent) => {
      e.preventDefault();
      if (!draggedElement || draggedElement === targetElement) return;

      setElementOrder((prev) => {
        const newOrder = [...prev];
        const fromIdx = newOrder.indexOf(draggedElement);
        const toIdx = newOrder.indexOf(targetElement);
        newOrder.splice(fromIdx, 1);
        newOrder.splice(toIdx, 0, draggedElement);
        return newOrder;
      });
    },
    [draggedElement]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedElement(null);
  }, []);

  // Save handler
  const handleSave = useCallback(() => {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (validationErrors.length > 0) return;

    const definition: ProbeDefinition = {
      id: probe.id!,
      name: probe.name!,
      indicatorId: probe.indicatorId!,
      theory: probe.theory!,
      prompt: probe.prompt!,
      systemPrompt: probe.systemPrompt || undefined,
      evidenceType: probe.evidenceType!,
      scoringCriteria: probe.scoringCriteria!,
      followUp: probe.followUp || undefined,
    };

    onSave?.(definition);
  }, [probe, validate, onSave]);

  // Load handler
  const handleLoad = useCallback(() => {
    const loaded = onLoad?.();
    if (loaded) {
      setProbe(loaded);
      setErrors([]);
    }
  }, [onLoad]);

  // Get error for a specific field
  const getFieldError = useCallback(
    (field: string) => liveErrors.find((e) => e.field === field)?.message,
    [liveErrors]
  );

  return (
    <div className={cn("rounded-lg border bg-white shadow-sm", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="text-lg font-semibold">Probe Builder</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            {showPreview ? "Edit" : "Preview"}
          </button>
          {onLoad && (
            <button
              onClick={handleLoad}
              className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Load
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!isValid}
            className={cn(
              "rounded px-3 py-1.5 text-sm text-white",
              isValid
                ? "bg-blue-600 hover:bg-blue-700"
                : "cursor-not-allowed bg-gray-300"
            )}
          >
            Save Probe
          </button>
        </div>
      </div>

      {showPreview ? (
        /* Preview Mode */
        <div className="p-6">
          <ProbePreview probe={probe} errors={liveErrors} />
        </div>
      ) : (
        /* Edit Mode */
        <div className="p-6">
          {/* Metadata section */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Probe Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={probe.name ?? ""}
                onChange={handleNameChange}
                placeholder="e.g., Self-Awareness Check"
                className={cn(
                  "w-full rounded border px-3 py-2 text-sm",
                  getFieldError("name")
                    ? "border-red-300"
                    : "border-gray-300"
                )}
              />
              {getFieldError("name") && (
                <p className="mt-1 text-xs text-red-500">
                  {getFieldError("name")}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Probe ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={probe.id ?? ""}
                onChange={(e) => updateField("id", e.target.value)}
                placeholder="e.g., self-awareness-check"
                className={cn(
                  "w-full rounded border px-3 py-2 text-sm font-mono",
                  getFieldError("id")
                    ? "border-red-300"
                    : "border-gray-300"
                )}
              />
              {getFieldError("id") && (
                <p className="mt-1 text-xs text-red-500">
                  {getFieldError("id")}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Theory <span className="text-red-500">*</span>
              </label>
              <select
                value={probe.theory ?? ""}
                onChange={handleTheoryChange}
                className={cn(
                  "w-full rounded border px-3 py-2 text-sm",
                  getFieldError("theory")
                    ? "border-red-300"
                    : "border-gray-300"
                )}
              >
                <option value="">Select theory...</option>
                {theories.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Indicator <span className="text-red-500">*</span>
              </label>
              <select
                value={probe.indicatorId ?? ""}
                onChange={(e) =>
                  updateField("indicatorId", e.target.value as IndicatorId)
                }
                className={cn(
                  "w-full rounded border px-3 py-2 text-sm",
                  getFieldError("indicatorId")
                    ? "border-red-300"
                    : "border-gray-300"
                )}
              >
                <option value="">Select indicator...</option>
                {filteredIndicators.map((i) => (
                  <option key={i.value} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Evidence Type <span className="text-red-500">*</span>
              </label>
              <select
                value={probe.evidenceType ?? ""}
                onChange={(e) =>
                  updateField(
                    "evidenceType",
                    e.target.value as EvidenceType
                  )
                }
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                {EVIDENCE_TYPES.map((et) => (
                  <option key={et.value} value={et.value}>
                    {et.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Drag-and-drop elements */}
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Drag elements to reorder. Required fields are marked with *.
            </p>
            {elementOrder.map((elementType) => {
              const config = BUILDER_ELEMENTS.find(
                (e) => e.type === elementType
              )!;
              const fieldValue =
                (probe[elementType as keyof typeof probe] as string) ?? "";
              const error = getFieldError(elementType);

              return (
                <div
                  key={elementType}
                  draggable
                  onDragStart={handleDragStart(elementType)}
                  onDragOver={handleDragOver(elementType)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "rounded-lg border p-4",
                    draggedElement === elementType
                      ? "border-blue-300 bg-blue-50 opacity-50"
                      : "border-gray-200 bg-white",
                    error && "border-red-200 bg-red-50"
                  )}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="cursor-grab text-gray-400">
                      {"☰"}
                    </span>
                    <label className="text-sm font-medium">
                      {config.label}
                      {config.required && (
                        <span className="text-red-500"> *</span>
                      )}
                    </label>
                    <span className="text-xs text-gray-400">
                      {config.description}
                    </span>
                  </div>
                  <textarea
                    value={fieldValue}
                    onChange={(e) =>
                      updateField(
                        elementType as keyof ProbeDefinition,
                        e.target.value as never
                      )
                    }
                    placeholder={config.placeholder}
                    rows={elementType === "prompt" ? 4 : 3}
                    className={cn(
                      "w-full rounded border px-3 py-2 text-sm",
                      error ? "border-red-300" : "border-gray-200"
                    )}
                  />
                  {error && (
                    <p className="mt-1 text-xs text-red-500">{error}</p>
                  )}
                  <div className="mt-1 text-right text-xs text-gray-400">
                    {fieldValue.length} chars
                  </div>
                </div>
              );
            })}
          </div>

          {/* Validation summary */}
          {errors.length > 0 && (
            <div className="mt-4 rounded border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-800">
                Please fix the following errors:
              </p>
              <ul className="mt-1 list-inside list-disc text-sm text-red-700">
                {errors.map((err, i) => (
                  <li key={i}>{err.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Preview sub-component                                             */
/* ------------------------------------------------------------------ */

function ProbePreview({
  probe,
  errors,
}: {
  probe: Partial<ProbeDefinition>;
  errors: ValidationError[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-block h-3 w-3 rounded-full",
            errors.length === 0 ? "bg-green-500" : "bg-yellow-500"
          )}
        />
        <span className="text-sm">
          {errors.length === 0
            ? "Valid probe definition"
            : `${errors.length} validation issue${errors.length > 1 ? "s" : ""}`}
        </span>
      </div>

      <div className="rounded border bg-gray-50 p-4">
        <h4 className="font-medium">{probe.name || "(Untitled Probe)"}</h4>
        <div className="mt-1 flex gap-2 text-xs text-gray-500">
          <span>ID: {probe.id || "..."}</span>
          <span>|</span>
          <span>Theory: {probe.theory?.toUpperCase() || "..."}</span>
          <span>|</span>
          <span>Indicator: {probe.indicatorId || "..."}</span>
          <span>|</span>
          <span>Evidence: {probe.evidenceType || "..."}</span>
        </div>
      </div>

      {probe.systemPrompt && (
        <div className="rounded border-l-4 border-purple-300 bg-purple-50 p-3">
          <p className="text-xs font-medium text-purple-700">System Prompt</p>
          <p className="mt-1 text-sm">{probe.systemPrompt}</p>
        </div>
      )}

      {probe.prompt && (
        <div className="rounded border-l-4 border-blue-300 bg-blue-50 p-3">
          <p className="text-xs font-medium text-blue-700">Prompt</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{probe.prompt}</p>
        </div>
      )}

      {probe.scoringCriteria && (
        <div className="rounded border-l-4 border-green-300 bg-green-50 p-3">
          <p className="text-xs font-medium text-green-700">
            Scoring Criteria
          </p>
          <p className="mt-1 text-sm">{probe.scoringCriteria}</p>
        </div>
      )}

      {probe.followUp && (
        <div className="rounded border-l-4 border-orange-300 bg-orange-50 p-3">
          <p className="text-xs font-medium text-orange-700">Follow-Up</p>
          <p className="mt-1 text-sm">{probe.followUp}</p>
        </div>
      )}

      <div className="text-xs text-gray-400">
        Preview - JSON export:
        <pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-100 p-2 font-mono text-xs">
          {JSON.stringify(probe, null, 2)}
        </pre>
      </div>
    </div>
  );
}
