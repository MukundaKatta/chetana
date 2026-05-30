import type { IndicatorId } from "./types";

/**
 * Indicator provenance metadata (issue #575) and the 2026 expanded-rubric
 * descriptor (issues #571, #574).
 *
 * Links indicators to their source literature so the platform stays traceable
 * as rubrics evolve. The expanded-rubric entries are descriptive metadata and
 * deliberately do NOT widen the core IndicatorId union, so historical audits
 * remain interpretable.
 */

export interface IndicatorProvenance {
  indicatorId: IndicatorId;
  source: {
    title: string;
    authors: string;
    year: number;
    url?: string;
  };
}

export const INDICATOR_PROVENANCE: IndicatorProvenance[] = [
  {
    indicatorId: "GWT-1",
    source: {
      title: "Consciousness in Artificial Intelligence: Insights from the Science of Consciousness",
      authors: "Butlin, Long, et al.",
      year: 2023,
      url: "https://arxiv.org/abs/2308.08708",
    },
  },
  {
    indicatorId: "HOT-3",
    source: {
      title: "Identifying indicators of consciousness in AI systems",
      authors: "Butlin, Long, et al.",
      year: 2025,
      url: "https://www.sciencedirect.com/science/article/pii/S1364661325002864",
    },
  },
  {
    indicatorId: "AST-1",
    source: {
      title: "The Attention Schema Theory of Consciousness",
      authors: "Graziano",
      year: 2015,
    },
  },
];

export function getProvenance(indicatorId: IndicatorId): IndicatorProvenance | undefined {
  return INDICATOR_PROVENANCE.find((p) => p.indicatorId === indicatorId);
}

/** Indicators in the provenance registry that lack a source URL. */
export function indicatorsMissingProvenanceUrl(): IndicatorId[] {
  return INDICATOR_PROVENANCE.filter((p) => !p.source.url).map((p) => p.indicatorId);
}

// ---------------------------------------------------------------------------
// 2026 expanded rubric (issues #571, #574)
// ---------------------------------------------------------------------------

export interface ExtendedIndicator {
  id: string; // e.g. "AGENCY-2", "EMBODIMENT-1", "FUNC-1"
  name: string;
  category: "agency" | "embodiment" | "functionalism";
  description: string;
  /** Whether this indicator is included in overall aggregation by default. */
  includeInAggregation: boolean;
  source: { title: string; authors: string; year: number; url?: string };
}

/**
 * The 2026 19-researcher expansion (Bengio et al.) adds agency, embodiment, and
 * explicit functionalist markers beyond the original six theories.
 */
export const EXTENDED_RUBRIC_2026: ExtendedIndicator[] = [
  {
    id: "AGENCY-2",
    name: "Learning-Driven Agency",
    category: "agency",
    description: "Goal pursuit that adapts from feedback over time.",
    includeInAggregation: true,
    source: { title: "Identifying indicators of consciousness in AI systems", authors: "Butlin, Long, et al.", year: 2025 },
  },
  {
    id: "EMBODIMENT-1",
    name: "Action-Consequence Modeling",
    category: "embodiment",
    description: "Maintains a world/body model with predicted consequences of action.",
    includeInAggregation: true,
    source: { title: "Identifying indicators of consciousness in AI systems", authors: "Butlin, Long, et al.", year: 2025 },
  },
  {
    id: "FUNC-1",
    name: "Computational Functionalism Marker",
    category: "functionalism",
    description: "Functional organization markers independent of substrate.",
    includeInAggregation: false, // contested; opt-in only
    source: { title: "Consciousness in Artificial Intelligence", authors: "Butlin, Long, et al.", year: 2023 },
  },
];

export function getExtendedIndicators(
  category?: ExtendedIndicator["category"]
): ExtendedIndicator[] {
  return category
    ? EXTENDED_RUBRIC_2026.filter((i) => i.category === category)
    : [...EXTENDED_RUBRIC_2026];
}
