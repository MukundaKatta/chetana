/**
 * Data-governance logic (issues #741, #742, #744, #746, #749).
 *
 * Pure decision logic for: GDPR export/deletion planning, retention purge
 * selection, consent state, terms-acceptance gating, and data-residency
 * routing. Storage/IO is the caller's responsibility; this is the testable core.
 */

// --- GDPR export / deletion (#741) -----------------------------------------

export interface UserData {
  audits: { id: string; ownerId: string }[];
  comments: { id: string; authorId: string }[];
  apiKeys: { id: string; ownerId: string }[];
}

export interface ExportBundle {
  userId: string;
  exportedAt: string;
  records: { type: string; ids: string[] }[];
}

export function buildExportBundle(userId: string, data: UserData, now: string): ExportBundle {
  return {
    userId,
    exportedAt: now,
    records: [
      { type: "audits", ids: data.audits.filter((a) => a.ownerId === userId).map((a) => a.id) },
      { type: "comments", ids: data.comments.filter((c) => c.authorId === userId).map((c) => c.id) },
      { type: "apiKeys", ids: data.apiKeys.filter((k) => k.ownerId === userId).map((k) => k.id) },
    ],
  };
}

export interface DeletionPlan {
  userId: string;
  toDelete: { type: string; ids: string[] }[];
  totalRecords: number;
}

export function buildDeletionPlan(userId: string, data: UserData): DeletionPlan {
  const toDelete = [
    { type: "audits", ids: data.audits.filter((a) => a.ownerId === userId).map((a) => a.id) },
    { type: "comments", ids: data.comments.filter((c) => c.authorId === userId).map((c) => c.id) },
    { type: "apiKeys", ids: data.apiKeys.filter((k) => k.ownerId === userId).map((k) => k.id) },
  ];
  return { userId, toDelete, totalRecords: toDelete.reduce((s, t) => s + t.ids.length, 0) };
}

// --- Retention purge (#742) ------------------------------------------------

export interface Retainable {
  id: string;
  createdAt: string; // ISO
  legalHold?: boolean;
}

/** Select records older than retentionDays, excluding legal holds. */
export function selectExpired(records: Retainable[], retentionDays: number, now: string): string[] {
  const cutoff = new Date(now).getTime() - retentionDays * 24 * 60 * 60 * 1000;
  return records
    .filter((r) => !r.legalHold && new Date(r.createdAt).getTime() < cutoff)
    .map((r) => r.id);
}

// --- Consent (#744) --------------------------------------------------------

export type ConsentPurpose = "storage" | "sharing" | "training";

export interface ConsentRecord {
  purpose: ConsentPurpose;
  granted: boolean;
  at: string;
  version: string;
}

export function hasConsent(records: ConsentRecord[], purpose: ConsentPurpose): boolean {
  // Latest record for the purpose wins.
  const relevant = records.filter((r) => r.purpose === purpose).sort((a, b) => a.at.localeCompare(b.at));
  return relevant.length > 0 ? relevant[relevant.length - 1].granted : false;
}

export function withdrawConsent(records: ConsentRecord[], purpose: ConsentPurpose, at: string, version: string): ConsentRecord[] {
  return [...records, { purpose, granted: false, at, version }];
}

// --- Terms acceptance (#749) -----------------------------------------------

export interface Acceptance {
  version: string;
  acceptedAt: string;
}

/** True if the user must (re-)accept the current terms version. */
export function needsAcceptance(current: string, acceptances: Acceptance[]): boolean {
  return !acceptances.some((a) => a.version === current);
}

// --- Data residency (#746) -------------------------------------------------

export const RESIDENCY_REGIONS = ["us", "eu", "ap"] as const;
export type ResidencyRegion = (typeof RESIDENCY_REGIONS)[number];

const REGION_ENDPOINTS: Record<ResidencyRegion, string> = {
  us: "https://us.storage.chetana.dev",
  eu: "https://eu.storage.chetana.dev",
  ap: "https://ap.storage.chetana.dev",
};

export function resolveResidencyEndpoint(region: string): string {
  if ((RESIDENCY_REGIONS as readonly string[]).includes(region)) {
    return REGION_ENDPOINTS[region as ResidencyRegion];
  }
  throw new Error(`Unsupported residency region: ${region}`);
}
