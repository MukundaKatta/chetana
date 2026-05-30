/**
 * Responsible disclosure workflow for consciousness findings (issue #586).
 *
 * A small state machine: draft -> review -> embargoed -> published, with
 * required attachments (methodology + limitations) before publication and an
 * audit trail of decisions.
 */

export type DisclosureState = "draft" | "review" | "embargoed" | "published";

export interface DisclosureRecord {
  state: DisclosureState;
  hasMethodology: boolean;
  hasLimitations: boolean;
  embargoUntil?: string;
  trail: { from: DisclosureState; to: DisclosureState; at: string; by: string }[];
}

const TRANSITIONS: Record<DisclosureState, DisclosureState[]> = {
  draft: ["review"],
  review: ["draft", "embargoed", "published"],
  embargoed: ["published"],
  published: [],
};

export function createDisclosure(): DisclosureRecord {
  return { state: "draft", hasMethodology: false, hasLimitations: false, trail: [] };
}

export interface TransitionContext {
  at: string;
  by: string;
  now?: string; // for embargo checks; defaults to `at`
}

/**
 * Attempt a state transition. Returns the updated record or throws if the
 * transition is invalid or required attachments/embargo gates are unmet.
 */
export function transition(
  record: DisclosureRecord,
  to: DisclosureState,
  ctx: TransitionContext
): DisclosureRecord {
  const allowed = TRANSITIONS[record.state];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid disclosure transition: ${record.state} -> ${to}`);
  }
  if (to === "published") {
    if (!record.hasMethodology || !record.hasLimitations) {
      throw new Error("Cannot publish: methodology and limitations must be attached.");
    }
    if (record.state === "embargoed" && record.embargoUntil) {
      const now = ctx.now ?? ctx.at;
      if (now < record.embargoUntil) {
        throw new Error(`Cannot publish before embargo lifts at ${record.embargoUntil}.`);
      }
    }
  }
  return {
    ...record,
    state: to,
    trail: [...record.trail, { from: record.state, to, at: ctx.at, by: ctx.by }],
  };
}

export function attachMethodology(record: DisclosureRecord): DisclosureRecord {
  return { ...record, hasMethodology: true };
}

export function attachLimitations(record: DisclosureRecord): DisclosureRecord {
  return { ...record, hasLimitations: true };
}

export function setEmbargo(record: DisclosureRecord, until: string): DisclosureRecord {
  return { ...record, embargoUntil: until };
}
