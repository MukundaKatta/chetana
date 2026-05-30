import { hashObject } from "@chetana/shared";

/**
 * Result memoization keyed by model + probe + prompt-version (issue #639) and
 * the backing store for prompt-cache style reuse (issue #638).
 *
 * Deterministic key derivation ensures any change to the model, parameters,
 * probe, or prompt version invalidates the entry.
 */

export interface MemoKeyParts {
  provider: string;
  modelId: string;
  params: Record<string, unknown>;
  probeId: string;
  promptVersion: string;
}

export function deriveMemoKey(parts: MemoKeyParts): string {
  return hashObject(parts);
}

interface Entry<V> {
  value: V;
  expiresAt: number;
}

export class MemoCache<V> {
  private store = new Map<string, Entry<V>>();
  private ttlMs: number;
  hits = 0;
  misses = 0;

  constructor(ttlMs = 24 * 60 * 60 * 1000) {
    this.ttlMs = ttlMs;
  }

  get(parts: MemoKeyParts, now = Date.now()): V | undefined {
    const key = deriveMemoKey(parts);
    const entry = this.store.get(key);
    if (!entry || entry.expiresAt <= now) {
      if (entry) this.store.delete(key);
      this.misses++;
      return undefined;
    }
    this.hits++;
    return entry.value;
  }

  set(parts: MemoKeyParts, value: V, now = Date.now()): void {
    this.store.set(deriveMemoKey(parts), { value, expiresAt: now + this.ttlMs });
  }

  purge(): void {
    this.store.clear();
  }

  get hitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : Math.round((this.hits / total) * 10000) / 10000;
  }
}
