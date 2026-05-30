/**
 * Small deterministic, browser-safe content hash (FNV-1a, 32-bit) used by the
 * reproducibility manifest (#627) and tamper-evident audit signing (#643).
 * Not cryptographically secure — used for integrity/change detection only.
 */
export function fnv1aHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // Convert to unsigned and hex.
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** Stable stringify with sorted keys so semantically-equal objects hash equally. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

export function hashObject(value: unknown): string {
  return fnv1aHash(stableStringify(value));
}
