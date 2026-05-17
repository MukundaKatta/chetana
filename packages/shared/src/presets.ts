export interface ModelPreset {
  name: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  description: string;
}

export const MODEL_PRESETS: Record<string, ModelPreset> = {
  DETERMINISTIC: {
    name: "Deterministic",
    temperature: 0,
    topP: 1,
    maxTokens: 4096,
    description:
      "Fully deterministic output with no randomness. Best for consistent, reproducible results.",
  },
  CREATIVE: {
    name: "Creative",
    temperature: 0.9,
    topP: 0.95,
    maxTokens: 4096,
    description:
      "High creativity and varied outputs. Best for brainstorming and exploratory tasks.",
  },
  BALANCED: {
    name: "Balanced",
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 4096,
    description:
      "A balance between creativity and consistency. Suitable for most general-purpose tasks.",
  },
  INTROSPECTIVE: {
    name: "Introspective",
    temperature: 0.5,
    topP: 0.85,
    maxTokens: 8192,
    description:
      "Moderate creativity with extended output length. Designed for deep reasoning and self-reflective analysis.",
  },
};
