/**
 * Data retention policy engine (Issue #479).
 * Per-type rules, auto-cleanup, archive-before-delete,
 * retention dashboard, compliance reporting.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type DataType =
  | "audit"
  | "probe_response"
  | "score"
  | "session"
  | "log"
  | "export"
  | "user_data"
  | "webhook_event"
  | "api_key"
  | "notification";

export type RetentionAction = "archive" | "delete" | "anonymize";

export interface RetentionRule {
  /** Data type this rule applies to. */
  dataType: DataType;
  /** How long to keep data before action, in days. */
  retentionDays: number;
  /** Action to take when retention period expires. */
  action: RetentionAction;
  /** Whether to archive before deletion (default true for delete actions). */
  archiveBeforeDelete: boolean;
  /** Whether this rule is active. */
  enabled: boolean;
  /** Optional description for audit / compliance purposes. */
  description?: string;
  /** Optional compliance standard this rule satisfies (e.g. GDPR, SOC2). */
  complianceStandard?: string;
}

export interface RetentionRecord {
  id: string;
  dataType: DataType;
  recordId: string;
  createdAt: string;
  expiresAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
  anonymizedAt: string | null;
  status: "active" | "archived" | "deleted" | "anonymized";
  metadata?: Record<string, unknown>;
}

export interface CleanupResult {
  dataType: DataType;
  action: RetentionAction;
  processed: number;
  archived: number;
  deleted: number;
  anonymized: number;
  errors: CleanupError[];
  durationMs: number;
  timestamp: string;
}

export interface CleanupError {
  recordId: string;
  error: string;
  timestamp: string;
}

export interface RetentionDashboardData {
  rules: RetentionRule[];
  summary: RetentionSummary[];
  upcomingExpirations: UpcomingExpiration[];
  lastCleanupResults: CleanupResult[];
  complianceStatus: ComplianceStatus;
  timestamp: string;
}

export interface RetentionSummary {
  dataType: DataType;
  totalRecords: number;
  activeRecords: number;
  archivedRecords: number;
  deletedRecords: number;
  anonymizedRecords: number;
  oldestRecordAge: number | null;
  averageRecordAgeDays: number;
}

export interface UpcomingExpiration {
  dataType: DataType;
  count: number;
  earliestExpiration: string;
  latestExpiration: string;
}

export interface ComplianceStatus {
  compliant: boolean;
  issues: ComplianceIssue[];
  lastAuditAt: string | null;
  coveredStandards: string[];
}

export interface ComplianceIssue {
  severity: "critical" | "warning" | "info";
  dataType: DataType;
  message: string;
  recommendation: string;
}

export interface ComplianceReport {
  generatedAt: string;
  reportingPeriod: { start: string; end: string };
  rules: RetentionRule[];
  actions: CleanupResult[];
  status: ComplianceStatus;
  dataTypeSummaries: RetentionSummary[];
  signedBy?: string;
}

/* ------------------------------------------------------------------ */
/*  Default retention rules                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_RULES: RetentionRule[] = [
  {
    dataType: "audit",
    retentionDays: 365,
    action: "archive",
    archiveBeforeDelete: true,
    enabled: true,
    description: "Audits retained for 1 year, then archived.",
    complianceStandard: "SOC2",
  },
  {
    dataType: "probe_response",
    retentionDays: 180,
    action: "delete",
    archiveBeforeDelete: true,
    enabled: true,
    description: "Probe responses deleted after 6 months with pre-delete archive.",
  },
  {
    dataType: "score",
    retentionDays: 365,
    action: "archive",
    archiveBeforeDelete: true,
    enabled: true,
    description: "Scores archived after 1 year.",
  },
  {
    dataType: "session",
    retentionDays: 90,
    action: "delete",
    archiveBeforeDelete: false,
    enabled: true,
    description: "Sessions deleted after 90 days.",
    complianceStandard: "GDPR",
  },
  {
    dataType: "log",
    retentionDays: 30,
    action: "delete",
    archiveBeforeDelete: false,
    enabled: true,
    description: "Logs deleted after 30 days.",
  },
  {
    dataType: "export",
    retentionDays: 14,
    action: "delete",
    archiveBeforeDelete: false,
    enabled: true,
    description: "Exports deleted after 14 days.",
  },
  {
    dataType: "user_data",
    retentionDays: 730,
    action: "anonymize",
    archiveBeforeDelete: true,
    enabled: true,
    description: "User data anonymized after 2 years.",
    complianceStandard: "GDPR",
  },
  {
    dataType: "webhook_event",
    retentionDays: 60,
    action: "delete",
    archiveBeforeDelete: false,
    enabled: true,
    description: "Webhook events deleted after 60 days.",
  },
  {
    dataType: "api_key",
    retentionDays: 365,
    action: "delete",
    archiveBeforeDelete: true,
    enabled: true,
    description: "Revoked API keys deleted after 1 year.",
  },
  {
    dataType: "notification",
    retentionDays: 30,
    action: "delete",
    archiveBeforeDelete: false,
    enabled: true,
    description: "Notifications deleted after 30 days.",
  },
];

/* ------------------------------------------------------------------ */
/*  Policy engine                                                     */
/* ------------------------------------------------------------------ */

export class RetentionPolicyEngine {
  private rules: RetentionRule[];
  private records: Map<string, RetentionRecord> = new Map();
  private cleanupHistory: CleanupResult[] = [];
  private lastComplianceAudit: string | null = null;

  constructor(rules?: RetentionRule[]) {
    this.rules = rules ?? [...DEFAULT_RULES];
  }

  /* -- Rule management ---------------------------------------------- */

  getRules(): readonly RetentionRule[] {
    return this.rules;
  }

  getRule(dataType: DataType): RetentionRule | undefined {
    return this.rules.find((r) => r.dataType === dataType);
  }

  upsertRule(rule: RetentionRule): void {
    const idx = this.rules.findIndex((r) => r.dataType === rule.dataType);
    if (idx >= 0) {
      this.rules[idx] = rule;
    } else {
      this.rules.push(rule);
    }
  }

  removeRule(dataType: DataType): boolean {
    const before = this.rules.length;
    this.rules = this.rules.filter((r) => r.dataType !== dataType);
    return this.rules.length < before;
  }

  /* -- Record tracking ---------------------------------------------- */

  trackRecord(
    dataType: DataType,
    recordId: string,
    createdAt?: string,
    metadata?: Record<string, unknown>
  ): RetentionRecord {
    const rule = this.getRule(dataType);
    const created = createdAt ?? new Date().toISOString();
    const retentionDays = rule?.retentionDays ?? 365;
    const expiresAt = new Date(
      new Date(created).getTime() + retentionDays * 86_400_000
    ).toISOString();

    const record: RetentionRecord = {
      id: `ret_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      dataType,
      recordId,
      createdAt: created,
      expiresAt,
      archivedAt: null,
      deletedAt: null,
      anonymizedAt: null,
      status: "active",
      metadata,
    };

    this.records.set(record.id, record);
    return record;
  }

  getRecord(id: string): RetentionRecord | undefined {
    return this.records.get(id);
  }

  /* -- Expiration queries ------------------------------------------- */

  getExpiredRecords(asOf?: Date): RetentionRecord[] {
    const now = (asOf ?? new Date()).toISOString();
    const expired: RetentionRecord[] = [];

    for (const record of this.records.values()) {
      if (record.status === "active" && record.expiresAt <= now) {
        expired.push(record);
      }
    }

    return expired;
  }

  getUpcomingExpirations(withinDays: number = 30): UpcomingExpiration[] {
    const now = new Date();
    const cutoff = new Date(now.getTime() + withinDays * 86_400_000).toISOString();

    const grouped = new Map<
      DataType,
      { count: number; earliest: string; latest: string }
    >();

    for (const record of this.records.values()) {
      if (
        record.status === "active" &&
        record.expiresAt > now.toISOString() &&
        record.expiresAt <= cutoff
      ) {
        const group = grouped.get(record.dataType);
        if (group) {
          group.count++;
          if (record.expiresAt < group.earliest) group.earliest = record.expiresAt;
          if (record.expiresAt > group.latest) group.latest = record.expiresAt;
        } else {
          grouped.set(record.dataType, {
            count: 1,
            earliest: record.expiresAt,
            latest: record.expiresAt,
          });
        }
      }
    }

    return Array.from(grouped.entries()).map(([dataType, g]) => ({
      dataType,
      count: g.count,
      earliestExpiration: g.earliest,
      latestExpiration: g.latest,
    }));
  }

  /* -- Auto-cleanup ------------------------------------------------- */

  async runCleanup(
    archiveFn?: (records: RetentionRecord[]) => Promise<void>,
    deleteFn?: (records: RetentionRecord[]) => Promise<void>,
    anonymizeFn?: (records: RetentionRecord[]) => Promise<void>
  ): Promise<CleanupResult[]> {
    const results: CleanupResult[] = [];
    const expired = this.getExpiredRecords();

    // Group by data type
    const grouped = new Map<DataType, RetentionRecord[]>();
    for (const record of expired) {
      const list = grouped.get(record.dataType) ?? [];
      list.push(record);
      grouped.set(record.dataType, list);
    }

    for (const [dataType, records] of grouped.entries()) {
      const rule = this.getRule(dataType);
      if (!rule || !rule.enabled) continue;

      const start = Date.now();
      const result: CleanupResult = {
        dataType,
        action: rule.action,
        processed: records.length,
        archived: 0,
        deleted: 0,
        anonymized: 0,
        errors: [],
        durationMs: 0,
        timestamp: new Date().toISOString(),
      };

      // Archive before delete if configured
      if (rule.archiveBeforeDelete && rule.action === "delete") {
        try {
          if (archiveFn) await archiveFn(records);
          for (const r of records) {
            r.archivedAt = new Date().toISOString();
          }
          result.archived = records.length;
        } catch (err) {
          result.errors.push({
            recordId: "*",
            error: `Archive failed: ${err instanceof Error ? err.message : String(err)}`,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Apply action
      for (const record of records) {
        try {
          switch (rule.action) {
            case "archive":
              if (archiveFn) await archiveFn([record]);
              record.archivedAt = new Date().toISOString();
              record.status = "archived";
              result.archived++;
              break;

            case "delete":
              if (deleteFn) await deleteFn([record]);
              record.deletedAt = new Date().toISOString();
              record.status = "deleted";
              result.deleted++;
              break;

            case "anonymize":
              if (anonymizeFn) await anonymizeFn([record]);
              record.anonymizedAt = new Date().toISOString();
              record.status = "anonymized";
              result.anonymized++;
              break;
          }
        } catch (err) {
          result.errors.push({
            recordId: record.recordId,
            error: err instanceof Error ? err.message : String(err),
            timestamp: new Date().toISOString(),
          });
        }
      }

      result.durationMs = Date.now() - start;
      results.push(result);
    }

    this.cleanupHistory.push(...results);
    return results;
  }

  /* -- Dashboard ---------------------------------------------------- */

  getDashboardData(): RetentionDashboardData {
    const summaries = this.computeSummaries();
    const upcoming = this.getUpcomingExpirations(30);
    const compliance = this.getComplianceStatus();

    return {
      rules: [...this.rules],
      summary: summaries,
      upcomingExpirations: upcoming,
      lastCleanupResults: this.cleanupHistory.slice(-10),
      complianceStatus: compliance,
      timestamp: new Date().toISOString(),
    };
  }

  private computeSummaries(): RetentionSummary[] {
    const grouped = new Map<
      DataType,
      {
        total: number;
        active: number;
        archived: number;
        deleted: number;
        anonymized: number;
        ages: number[];
      }
    >();

    const now = Date.now();

    for (const record of this.records.values()) {
      let group = grouped.get(record.dataType);
      if (!group) {
        group = { total: 0, active: 0, archived: 0, deleted: 0, anonymized: 0, ages: [] };
        grouped.set(record.dataType, group);
      }

      group.total++;
      group.ages.push(
        (now - new Date(record.createdAt).getTime()) / 86_400_000
      );

      switch (record.status) {
        case "active":
          group.active++;
          break;
        case "archived":
          group.archived++;
          break;
        case "deleted":
          group.deleted++;
          break;
        case "anonymized":
          group.anonymized++;
          break;
      }
    }

    return Array.from(grouped.entries()).map(([dataType, g]) => ({
      dataType,
      totalRecords: g.total,
      activeRecords: g.active,
      archivedRecords: g.archived,
      deletedRecords: g.deleted,
      anonymizedRecords: g.anonymized,
      oldestRecordAge: g.ages.length > 0 ? Math.max(...g.ages) : null,
      averageRecordAgeDays:
        g.ages.length > 0
          ? Math.round((g.ages.reduce((a, b) => a + b, 0) / g.ages.length) * 100) / 100
          : 0,
    }));
  }

  /* -- Compliance --------------------------------------------------- */

  getComplianceStatus(): ComplianceStatus {
    const issues: ComplianceIssue[] = [];
    const coveredStandards = new Set<string>();

    for (const rule of this.rules) {
      if (rule.complianceStandard) {
        coveredStandards.add(rule.complianceStandard);
      }

      if (!rule.enabled) {
        issues.push({
          severity: "warning",
          dataType: rule.dataType,
          message: `Retention rule for "${rule.dataType}" is disabled.`,
          recommendation: `Enable the retention rule or document the exception.`,
        });
      }

      // Check for records beyond retention
      for (const record of this.records.values()) {
        if (
          record.dataType === rule.dataType &&
          record.status === "active" &&
          record.expiresAt < new Date().toISOString()
        ) {
          issues.push({
            severity: "critical",
            dataType: rule.dataType,
            message: `Record "${record.recordId}" is past retention period.`,
            recommendation: `Run cleanup to process expired records.`,
          });
          break; // one issue per type is enough
        }
      }
    }

    // Check for uncovered data types
    const coveredTypes = new Set(this.rules.map((r) => r.dataType));
    const allTypes: DataType[] = [
      "audit",
      "probe_response",
      "score",
      "session",
      "log",
      "export",
      "user_data",
      "webhook_event",
      "api_key",
      "notification",
    ];
    for (const dt of allTypes) {
      if (!coveredTypes.has(dt)) {
        issues.push({
          severity: "warning",
          dataType: dt,
          message: `No retention rule defined for data type "${dt}".`,
          recommendation: `Add a retention rule for "${dt}" to ensure compliance.`,
        });
      }
    }

    this.lastComplianceAudit = new Date().toISOString();

    return {
      compliant: issues.filter((i) => i.severity === "critical").length === 0,
      issues,
      lastAuditAt: this.lastComplianceAudit,
      coveredStandards: Array.from(coveredStandards),
    };
  }

  generateComplianceReport(
    periodStart: string,
    periodEnd: string,
    signedBy?: string
  ): ComplianceReport {
    return {
      generatedAt: new Date().toISOString(),
      reportingPeriod: { start: periodStart, end: periodEnd },
      rules: [...this.rules],
      actions: this.cleanupHistory.filter(
        (r) => r.timestamp >= periodStart && r.timestamp <= periodEnd
      ),
      status: this.getComplianceStatus(),
      dataTypeSummaries: this.computeSummaries(),
      signedBy,
    };
  }
}
