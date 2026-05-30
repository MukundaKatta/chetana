import type { ModelProvider } from "./types";

/**
 * Multimodal probe input pipeline (issue #595) and audio support (issue #593).
 *
 * Defines attachment types for image/audio probe inputs, validation, and
 * capability gating so unsupported models skip multimodal probes cleanly.
 */

export type Modality = "text" | "image" | "audio" | "video";

export interface MultimodalAttachment {
  type: Exclude<Modality, "text">;
  /** base64 payload or URL. */
  data: string;
  mimeType: string;
}

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME: Record<MultimodalAttachment["type"], RegExp> = {
  image: /^image\/(png|jpe?g|webp|gif)$/i,
  audio: /^audio\/(wav|mpeg|mp3|ogg|webm)$/i,
  video: /^video\/(mp4|webm)$/i,
};

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate an attachment's mime type and approximate decoded size. */
export function validateAttachment(att: MultimodalAttachment): ValidationResult {
  const errors: string[] = [];
  const allowed = ALLOWED_MIME[att.type];
  if (!allowed || !allowed.test(att.mimeType)) {
    errors.push(`Unsupported ${att.type} mime type: ${att.mimeType}`);
  }
  // Rough size estimate for base64 payloads (4 chars ≈ 3 bytes).
  if (!att.data.startsWith("http")) {
    const approxBytes = Math.floor((att.data.length * 3) / 4);
    if (approxBytes > MAX_BYTES) errors.push(`Attachment exceeds ${MAX_BYTES} bytes`);
  }
  return { valid: errors.length === 0, errors };
}

/** Provider → modalities the platform's adapters can pass through. */
const PROVIDER_MODALITIES: Partial<Record<ModelProvider, Modality[]>> = {
  anthropic: ["text", "image"],
  openai: ["text", "image", "audio"],
  google: ["text", "image", "audio", "video"],
  meta: ["text", "image"],
  qwen: ["text", "image"],
  xai: ["text", "image"],
  mistral: ["text"],
  deepseek: ["text"],
  ollama: ["text", "image"],
  openrouter: ["text", "image"],
};

export function modelSupportsModality(provider: ModelProvider, modality: Modality): boolean {
  return (PROVIDER_MODALITIES[provider] ?? ["text"]).includes(modality);
}

/** Filter attachments to those the provider supports; returns kept + skipped. */
export function gateAttachments(
  provider: ModelProvider,
  attachments: MultimodalAttachment[]
): { kept: MultimodalAttachment[]; skipped: MultimodalAttachment[] } {
  const kept: MultimodalAttachment[] = [];
  const skipped: MultimodalAttachment[] = [];
  for (const att of attachments) {
    if (modelSupportsModality(provider, att.type)) kept.push(att);
    else skipped.push(att);
  }
  return { kept, skipped };
}
