/**
 * Billing logic (issues #760, #761, #762, #763).
 *
 * Pure computations for seat proration, API quota / token-bucket rate limiting,
 * invoice line items + totals + tax, and spending-cap / overage thresholds.
 * Payment-provider IO is out of scope; this is the testable core.
 */

function round(n: number, d = 2): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

// --- Seat management with proration (#760) ---------------------------------

/**
 * Prorated charge for adding seats mid-cycle.
 * @param pricePerSeat monthly price per seat.
 * @param daysRemaining days left in the billing cycle.
 * @param cycleDays total days in the cycle.
 */
export function proratedSeatCharge(
  seatsAdded: number,
  pricePerSeat: number,
  daysRemaining: number,
  cycleDays: number
): number {
  if (cycleDays <= 0) return 0;
  const fraction = Math.max(0, Math.min(1, daysRemaining / cycleDays));
  return round(seatsAdded * pricePerSeat * fraction);
}

export function seatsAvailable(limit: number, assigned: number): number {
  return Math.max(0, limit - assigned);
}

// --- Quota / token-bucket rate limiting (#761) -----------------------------

export interface RateLimitState {
  tokens: number;
  lastRefill: number; // ms timestamp
}

export interface RateLimitConfig {
  capacity: number;
  /** Tokens refilled per second. */
  refillPerSecond: number;
}

export interface RateLimitResult {
  allowed: boolean;
  state: RateLimitState;
  retryAfterMs: number;
}

/** Token-bucket check; returns updated state and whether the request is allowed. */
export function consumeToken(
  state: RateLimitState,
  config: RateLimitConfig,
  now: number,
  cost = 1
): RateLimitResult {
  const elapsedSec = Math.max(0, (now - state.lastRefill) / 1000);
  const refilled = Math.min(config.capacity, state.tokens + elapsedSec * config.refillPerSecond);
  if (refilled >= cost) {
    return { allowed: true, state: { tokens: refilled - cost, lastRefill: now }, retryAfterMs: 0 };
  }
  const deficit = cost - refilled;
  const retryAfterMs = config.refillPerSecond > 0 ? (deficit / config.refillPerSecond) * 1000 : Infinity;
  return { allowed: false, state: { tokens: refilled, lastRefill: now }, retryAfterMs: Math.ceil(retryAfterMs) };
}

// --- Invoices (#762) -------------------------------------------------------

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  lineItems: (LineItem & { amount: number })[];
  subtotal: number;
  tax: number;
  total: number;
}

export function computeInvoice(items: LineItem[], taxRate = 0): Invoice {
  const lineItems = items.map((i) => ({ ...i, amount: round(i.quantity * i.unitPrice) }));
  const subtotal = round(lineItems.reduce((s, i) => s + i.amount, 0));
  const tax = round(subtotal * taxRate);
  return { lineItems, subtotal, tax, total: round(subtotal + tax) };
}

// --- Spending caps / overage alerts (#763) ---------------------------------

export interface CapStatus {
  fraction: number; // spend / cap
  crossedThresholds: number[];
  capped: boolean;
}

/**
 * @param thresholds alert thresholds as fractions, e.g. [0.5, 0.8, 1].
 * @param hardStop block when spend >= cap.
 */
export function evaluateCap(
  spend: number,
  cap: number,
  thresholds: number[] = [0.5, 0.8, 1],
  hardStop = false
): CapStatus {
  const fraction = cap <= 0 ? Infinity : spend / cap;
  const crossed = thresholds.filter((t) => fraction >= t);
  return {
    fraction: Number.isFinite(fraction) ? round(fraction, 4) : fraction,
    crossedThresholds: crossed,
    capped: hardStop && spend >= cap,
  };
}
