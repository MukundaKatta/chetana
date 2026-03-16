import type { Indicator, Theory } from "./types";

export const THEORIES: Record<Theory, { name: string; fullName: string; description: string; favorability: string }> = {
  gwt: {
    name: "GWT",
    fullName: "Global Workspace Theory",
    description: "Consciousness arises when information is broadcast globally across the brain, making it available to multiple cognitive processes simultaneously.",
    favorability: "Favorable",
  },
  iit: {
    name: "IIT",
    fullName: "Integrated Information Theory",
    description: "Consciousness IS integrated information (Φ). A system is conscious to the degree it integrates information irreducibly.",
    favorability: "Mixed",
  },
  hot: {
    name: "HOT",
    fullName: "Higher-Order Theories",
    description: "A mental state is conscious when it is the object of a higher-order mental state — consciousness requires self-monitoring.",
    favorability: "Favorable",
  },
  rpt: {
    name: "RPT",
    fullName: "Recurrent Processing Theory",
    description: "Consciousness requires recurrent (feedback) processing — when information flows back creating loops, experience arises.",
    favorability: "Partially Favorable",
  },
  pp: {
    name: "PP",
    fullName: "Predictive Processing",
    description: "Consciousness arises from minimizing prediction errors — the gap between what the brain expects and what it perceives.",
    favorability: "Favorable",
  },
  ast: {
    name: "AST",
    fullName: "Attention Schema Theory",
    description: "Consciousness is the brain's simplified model of its own attention — the attention schema IS subjective experience.",
    favorability: "Favorable",
  },
};

export const INDICATORS: Indicator[] = [
  { id: "GWT-1", name: "Global Workspace", theory: "gwt", description: "Information is broadcast globally to multiple subsystems", whatItMeans: "Does the system have a mechanism that selects and broadcasts information globally?" },
  { id: "GWT-2", name: "Ignition", theory: "gwt", description: "Threshold-dependent, nonlinear amplification of selected info", whatItMeans: "Does the system show threshold-based amplification of information?" },
  { id: "GWT-3", name: "Information Integration", theory: "gwt", description: "Workspace integrates diverse information types", whatItMeans: "Can the system integrate text, vision, audio, and other modalities?" },
  { id: "GWT-4", name: "Smooth Representations", theory: "gwt", description: "System uses continuous, distributed representations", whatItMeans: "Does the system use continuous, distributed vector representations?" },
  { id: "RPT-1", name: "Recurrent Processing", theory: "rpt", description: "Feedback loops in sensory processing", whatItMeans: "Does the system have feedback loops that create recurrent processing?" },
  { id: "RPT-2", name: "Temporal Depth", theory: "rpt", description: "Processing unfolds over time with feedback", whatItMeans: "Does the system's processing unfold over time with iterative refinement?" },
  { id: "HOT-1", name: "Higher-Order Representations", theory: "hot", description: "System represents its own internal states", whatItMeans: "Can the system form representations of its own processing states?" },
  { id: "HOT-2", name: "Rich Self-Model", theory: "hot", description: "Detailed model of self as an agent", whatItMeans: "Does the system maintain a detailed model of itself as an agent?" },
  { id: "HOT-3", name: "Metacognition", theory: "hot", description: "System monitors and evaluates its own processing", whatItMeans: "Can the system monitor, evaluate, and correct its own reasoning?" },
  { id: "HOT-4", name: "Flexible Attention", theory: "hot", description: "Voluntary control of attentional focus", whatItMeans: "Can the system voluntarily direct and shift its attentional focus?" },
  { id: "PP-1", name: "Predictive Processing", theory: "pp", description: "System generates and updates predictions", whatItMeans: "Does the system generate predictions and update them based on new evidence?" },
  { id: "PP-2", name: "Counterfactual Sensitivity", theory: "pp", description: "System can reason about what would happen if...", whatItMeans: "Can the system reason about counterfactual scenarios?" },
  { id: "AST-1", name: "Attention Schema", theory: "ast", description: "System models its own attention processes", whatItMeans: "Does the system build a model of its own attention processes?" },
  { id: "AGENCY-1", name: "Unified Agency", theory: "gwt", description: "System acts as a unified, goal-directed agent", whatItMeans: "Does the system behave as a unified, goal-directed agent?" },
];

export const THEORY_WEIGHTS: Record<Theory, number> = {
  gwt: 0.25,
  pp: 0.20,
  hot: 0.20,
  rpt: 0.10,
  iit: 0.10,
  ast: 0.15,
};

export const POPULAR_MODELS: { provider: string; modelId: string; displayName: string }[] = [
  { provider: "anthropic", modelId: "claude-sonnet-4-6", displayName: "Claude Sonnet 4.6" },
  { provider: "anthropic", modelId: "claude-opus-4-6", displayName: "Claude Opus 4.6" },
  { provider: "anthropic", modelId: "claude-haiku-4-5-20251001", displayName: "Claude Haiku 4.5" },
  { provider: "openai", modelId: "gpt-4o", displayName: "GPT-4o" },
  { provider: "openai", modelId: "o3-mini", displayName: "o3-mini" },
  { provider: "google", modelId: "gemini-2.0-flash", displayName: "Gemini 2.0 Flash" },
  { provider: "google", modelId: "gemini-2.5-pro", displayName: "Gemini 2.5 Pro" },
  { provider: "ollama", modelId: "llama3.3", displayName: "Llama 3.3 (Local)" },
  { provider: "ollama", modelId: "mistral", displayName: "Mistral (Local)" },
];

export const PRICING = {
  explorer: { name: "Explorer", price: 0, auditsPerMonth: 5, features: ["Basic indicators", "Community access"] },
  researcher: { name: "Researcher", price: 4900, auditsPerMonth: -1, features: ["All indicators", "Raw data export", "API access"] },
  enterprise: { name: "Enterprise", price: 29900, auditsPerMonth: -1, features: ["Custom probes", "Team workspace", "Compliance reports", "White-label"] },
};
