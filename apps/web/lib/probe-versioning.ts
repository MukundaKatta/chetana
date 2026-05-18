/**
 * Probe version control with semantic versioning,
 * diff viewer, changelog generation, rollback support,
 * and version pinning for reproducibility (Issue #387).
 */

import type { ProbeDefinition } from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
}

export interface ProbeVersion {
  version: string;
  probe: ProbeDefinition;
  createdAt: string;
  author: string;
  message: string;
  /** Hash for quick comparison. */
  hash: string;
}

export interface ProbeVersionHistory {
  probeId: string;
  currentVersion: string;
  versions: ProbeVersion[];
  pinnedVersion: string | null;
}

export interface VersionDiff {
  fromVersion: string;
  toVersion: string;
  changes: FieldChange[];
  summary: string;
}

export interface FieldChange {
  field: string;
  oldValue: string | undefined;
  newValue: string | undefined;
  type: "added" | "removed" | "modified";
}

export interface ChangelogEntry {
  version: string;
  date: string;
  author: string;
  message: string;
  changes: FieldChange[];
}

export type VersionBump = "major" | "minor" | "patch";

/* ------------------------------------------------------------------ */
/*  Semantic version helpers                                          */
/* ------------------------------------------------------------------ */

export function parseVersion(version: string): SemanticVersion {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid version string: ${version}`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

export function formatVersion(version: SemanticVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

export function bumpVersion(
  current: string,
  bump: VersionBump,
): string {
  const parsed = parseVersion(current);

  switch (bump) {
    case "major":
      return formatVersion({ major: parsed.major + 1, minor: 0, patch: 0 });
    case "minor":
      return formatVersion({
        major: parsed.major,
        minor: parsed.minor + 1,
        patch: 0,
      });
    case "patch":
      return formatVersion({
        major: parsed.major,
        minor: parsed.minor,
        patch: parsed.patch + 1,
      });
  }
}

export function compareVersions(a: string, b: string): number {
  const va = parseVersion(a);
  const vb = parseVersion(b);

  if (va.major !== vb.major) return va.major - vb.major;
  if (va.minor !== vb.minor) return va.minor - vb.minor;
  return va.patch - vb.patch;
}

export function isValidVersion(version: string): boolean {
  return /^v?\d+\.\d+\.\d+$/.test(version);
}

/* ------------------------------------------------------------------ */
/*  Hashing                                                           */
/* ------------------------------------------------------------------ */

function hashProbe(probe: ProbeDefinition): string {
  const content = JSON.stringify({
    name: probe.name,
    prompt: probe.prompt,
    systemPrompt: probe.systemPrompt,
    indicatorId: probe.indicatorId,
    theory: probe.theory,
    evidenceType: probe.evidenceType,
    scoringCriteria: probe.scoringCriteria,
    followUp: probe.followUp,
  });

  // Simple hash (DJB2)
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = (hash * 33) ^ content.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/* ------------------------------------------------------------------ */
/*  Diff viewer                                                       */
/* ------------------------------------------------------------------ */

const COMPARABLE_FIELDS: Array<keyof ProbeDefinition> = [
  "name",
  "prompt",
  "systemPrompt",
  "indicatorId",
  "theory",
  "evidenceType",
  "scoringCriteria",
  "followUp",
];

/**
 * Compute a diff between two probe versions.
 */
export function diffVersions(
  from: ProbeVersion,
  to: ProbeVersion,
): VersionDiff {
  const changes: FieldChange[] = [];

  for (const field of COMPARABLE_FIELDS) {
    const oldVal = from.probe[field] as string | undefined;
    const newVal = to.probe[field] as string | undefined;

    if (oldVal === newVal) continue;

    if (oldVal == null && newVal != null) {
      changes.push({ field, oldValue: undefined, newValue: newVal, type: "added" });
    } else if (oldVal != null && newVal == null) {
      changes.push({ field, oldValue: oldVal, newValue: undefined, type: "removed" });
    } else {
      changes.push({ field, oldValue: oldVal, newValue: newVal, type: "modified" });
    }
  }

  const summary = changes.length === 0
    ? "No changes"
    : `${changes.length} field(s) changed: ${changes.map((c) => c.field).join(", ")}`;

  return {
    fromVersion: from.version,
    toVersion: to.version,
    changes,
    summary,
  };
}

/**
 * Generate a line-level text diff for a string field.
 */
export function textDiff(
  oldText: string,
  newText: string,
): Array<{ type: "same" | "added" | "removed"; line: string }> {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const result: Array<{ type: "same" | "added" | "removed"; line: string }> = [];

  // Simple LCS-based diff
  const lcs = computeLCS(oldLines, newLines);
  let oi = 0;
  let ni = 0;
  let li = 0;

  while (oi < oldLines.length || ni < newLines.length) {
    if (li < lcs.length && oi < oldLines.length && oldLines[oi] === lcs[li]) {
      if (ni < newLines.length && newLines[ni] === lcs[li]) {
        result.push({ type: "same", line: lcs[li] });
        oi++;
        ni++;
        li++;
      } else if (ni < newLines.length) {
        result.push({ type: "added", line: newLines[ni] });
        ni++;
      } else {
        oi++;
      }
    } else if (oi < oldLines.length) {
      result.push({ type: "removed", line: oldLines[oi] });
      oi++;
    } else if (ni < newLines.length) {
      result.push({ type: "added", line: newLines[ni] });
      ni++;
    }
  }

  return result;
}

function computeLCS(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack
  const result: string[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return result;
}

/**
 * Determine the appropriate version bump based on changes.
 */
export function suggestBump(changes: FieldChange[]): VersionBump {
  // Major: prompt or scoring criteria changed (affects reproducibility)
  const hasMajorChange = changes.some(
    (c) =>
      c.field === "prompt" ||
      c.field === "scoringCriteria" ||
      c.field === "indicatorId" ||
      c.field === "theory",
  );
  if (hasMajorChange) return "major";

  // Minor: system prompt, follow-up, or evidence type changed
  const hasMinorChange = changes.some(
    (c) =>
      c.field === "systemPrompt" ||
      c.field === "followUp" ||
      c.field === "evidenceType",
  );
  if (hasMinorChange) return "minor";

  // Patch: name or other metadata
  return "patch";
}

/* ------------------------------------------------------------------ */
/*  Changelog                                                         */
/* ------------------------------------------------------------------ */

/**
 * Generate a changelog from a version history.
 */
export function generateChangelog(
  history: ProbeVersionHistory,
): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  const sorted = [...history.versions].sort((a, b) =>
    compareVersions(b.version, a.version),
  );

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const previous = sorted[i + 1];

    const changes = previous
      ? diffVersions(previous, current).changes
      : COMPARABLE_FIELDS.filter(
          (f) => current.probe[f] != null,
        ).map((f) => ({
          field: f,
          oldValue: undefined,
          newValue: current.probe[f] as string,
          type: "added" as const,
        }));

    entries.push({
      version: current.version,
      date: current.createdAt,
      author: current.author,
      message: current.message,
      changes,
    });
  }

  return entries;
}

/**
 * Format a changelog as Markdown.
 */
export function formatChangelogMarkdown(entries: ChangelogEntry[]): string {
  const lines: string[] = ["# Changelog", ""];

  for (const entry of entries) {
    lines.push(`## ${entry.version} (${entry.date.split("T")[0]})`);
    lines.push("");
    lines.push(`**${entry.message}** - ${entry.author}`);
    lines.push("");

    for (const change of entry.changes) {
      switch (change.type) {
        case "added":
          lines.push(`- Added \`${change.field}\``);
          break;
        case "removed":
          lines.push(`- Removed \`${change.field}\``);
          break;
        case "modified":
          lines.push(`- Modified \`${change.field}\``);
          break;
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/*  Version store                                                     */
/* ------------------------------------------------------------------ */

export class ProbeVersionStore {
  private histories = new Map<string, ProbeVersionHistory>();

  /**
   * Create a new versioned probe.
   */
  createProbe(
    probe: ProbeDefinition,
    author: string,
    message: string = "Initial version",
  ): ProbeVersionHistory {
    const version: ProbeVersion = {
      version: "1.0.0",
      probe: { ...probe },
      createdAt: new Date().toISOString(),
      author,
      message,
      hash: hashProbe(probe),
    };

    const history: ProbeVersionHistory = {
      probeId: probe.id,
      currentVersion: "1.0.0",
      versions: [version],
      pinnedVersion: null,
    };

    this.histories.set(probe.id, history);
    return history;
  }

  /**
   * Commit a new version of an existing probe.
   */
  commit(
    probeId: string,
    probe: ProbeDefinition,
    author: string,
    message: string,
    bump?: VersionBump,
  ): ProbeVersion | null {
    const history = this.histories.get(probeId);
    if (!history) return null;

    const currentVersion = this.getVersion(probeId, history.currentVersion);
    if (!currentVersion) return null;

    // Check if anything changed
    const newHash = hashProbe(probe);
    if (newHash === currentVersion.hash) return currentVersion;

    // Determine bump
    const diff = diffVersions(currentVersion, {
      version: "",
      probe,
      createdAt: "",
      author: "",
      message: "",
      hash: "",
    });

    const effectiveBump = bump ?? suggestBump(diff.changes);
    const newVersionStr = bumpVersion(history.currentVersion, effectiveBump);

    const newVersion: ProbeVersion = {
      version: newVersionStr,
      probe: { ...probe },
      createdAt: new Date().toISOString(),
      author,
      message,
      hash: newHash,
    };

    history.versions.push(newVersion);
    history.currentVersion = newVersionStr;

    return newVersion;
  }

  /**
   * Rollback to a specific version.
   */
  rollback(probeId: string, targetVersion: string): ProbeDefinition | null {
    const history = this.histories.get(probeId);
    if (!history) return null;

    const version = history.versions.find((v) => v.version === targetVersion);
    if (!version) return null;

    // Create a new patch version with the old probe content
    const newVersionStr = bumpVersion(history.currentVersion, "patch");

    const rollbackVersion: ProbeVersion = {
      version: newVersionStr,
      probe: { ...version.probe },
      createdAt: new Date().toISOString(),
      author: "system",
      message: `Rollback to ${targetVersion}`,
      hash: version.hash,
    };

    history.versions.push(rollbackVersion);
    history.currentVersion = newVersionStr;

    return { ...version.probe };
  }

  /**
   * Pin a specific version for reproducibility.
   */
  pin(probeId: string, version: string): boolean {
    const history = this.histories.get(probeId);
    if (!history) return false;

    const exists = history.versions.some((v) => v.version === version);
    if (!exists) return false;

    history.pinnedVersion = version;
    return true;
  }

  /**
   * Unpin the version, allowing use of latest.
   */
  unpin(probeId: string): boolean {
    const history = this.histories.get(probeId);
    if (!history) return false;
    history.pinnedVersion = null;
    return true;
  }

  /**
   * Get the effective probe (pinned or latest).
   */
  getEffectiveProbe(probeId: string): ProbeDefinition | null {
    const history = this.histories.get(probeId);
    if (!history) return null;

    const targetVersion = history.pinnedVersion ?? history.currentVersion;
    const version = history.versions.find((v) => v.version === targetVersion);
    return version?.probe ?? null;
  }

  /**
   * Get a specific version.
   */
  getVersion(probeId: string, version: string): ProbeVersion | null {
    const history = this.histories.get(probeId);
    return history?.versions.find((v) => v.version === version) ?? null;
  }

  /**
   * Get the full history for a probe.
   */
  getHistory(probeId: string): ProbeVersionHistory | null {
    return this.histories.get(probeId) ?? null;
  }

  /**
   * List all versioned probes.
   */
  listProbes(): ProbeVersionHistory[] {
    return Array.from(this.histories.values());
  }
}
