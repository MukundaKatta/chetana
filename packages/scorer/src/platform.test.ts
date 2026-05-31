import { describe, it, expect } from "vitest";
import { encodeCursor, decodeCursor, paginate } from "./pagination";
import {
  buildExportBundle, buildDeletionPlan, selectExpired,
  hasConsent, withdrawConsent, needsAcceptance, resolveResidencyEndpoint,
  type ConsentRecord,
} from "./data-governance";
import { can, effectiveRole, maskValue, applyMasking } from "./access-control";
import { proratedSeatCharge, consumeToken, computeInvoice, evaluateCap } from "./billing";
import { evaluateRules } from "./alerting";
import { buildCohortTrajectories } from "./cohort";
import { scheduleJobs, queueDepthByPriority } from "./priority-queue";

describe("pagination (#769)", () => {
  const items = Array.from({ length: 25 }, (_, i) => ({ id: `id${String(i).padStart(2, "0")}`, key: i }));
  const opts = { keyOf: (x: { key: number }) => x.key, idOf: (x: { id: string }) => x.id, pageSize: 10 };

  it("returns the first page with a cursor", () => {
    const p = paginate(items, opts);
    expect(p.items).toHaveLength(10);
    expect(p.hasMore).toBe(true);
    expect(p.nextCursor).toBeTruthy();
  });
  it("continues from the cursor without overlap", () => {
    const p1 = paginate(items, opts);
    const p2 = paginate(items, { ...opts, after: p1.nextCursor });
    expect(p2.items[0].id).toBe("id10");
    expect(p2.items.some((i) => p1.items.includes(i))).toBe(false);
  });
  it("is stable under inserts before the cursor", () => {
    const p1 = paginate(items, opts);
    const withInsert = [{ id: "id00b", key: 0 }, ...items].sort((a, b) => a.key - b.key || a.id.localeCompare(b.id));
    const p2 = paginate(withInsert, { ...opts, after: p1.nextCursor });
    expect(p2.items[0].id).toBe("id10"); // unaffected by the early insert
  });
  it("round-trips opaque cursors", () => {
    const c = encodeCursor({ key: 5, id: "x" });
    expect(decodeCursor(c)).toEqual({ key: 5, id: "x" });
    expect(decodeCursor("garbage")).toBeNull();
  });
});

describe("data governance (#741/#742/#744/#746/#749)", () => {
  const data = {
    audits: [{ id: "a1", ownerId: "u1" }, { id: "a2", ownerId: "u2" }],
    comments: [{ id: "c1", authorId: "u1" }],
    apiKeys: [{ id: "k1", ownerId: "u1" }],
  };
  it("builds an export bundle for a user", () => {
    const b = buildExportBundle("u1", data, "2026-05-31");
    expect(b.records.find((r) => r.type === "audits")!.ids).toEqual(["a1"]);
  });
  it("plans deletion with a total count", () => {
    expect(buildDeletionPlan("u1", data).totalRecords).toBe(3);
  });
  it("selects expired records excluding legal holds", () => {
    const expired = selectExpired(
      [
        { id: "old", createdAt: "2025-01-01" },
        { id: "held", createdAt: "2025-01-01", legalHold: true },
        { id: "new", createdAt: "2026-05-30" },
      ],
      90,
      "2026-05-31"
    );
    expect(expired).toEqual(["old"]);
  });
  it("tracks consent with latest-wins and withdrawal", () => {
    let records: ConsentRecord[] = [{ purpose: "training" as const, granted: true, at: "t0", version: "1" }];
    expect(hasConsent(records, "training")).toBe(true);
    records = withdrawConsent(records, "training", "t1", "1");
    expect(hasConsent(records, "training")).toBe(false);
  });
  it("gates on terms acceptance", () => {
    expect(needsAcceptance("v2", [{ version: "v1", acceptedAt: "t" }])).toBe(true);
    expect(needsAcceptance("v2", [{ version: "v2", acceptedAt: "t" }])).toBe(false);
  });
  it("routes residency and rejects unknown regions", () => {
    expect(resolveResidencyEndpoint("eu")).toContain("eu.");
    expect(() => resolveResidencyEndpoint("mars")).toThrow();
  });
});

describe("access control (#712/#750)", () => {
  it("enforces role permissions", () => {
    expect(can("owner", "billing:manage")).toBe(true);
    expect(can("viewer", "audit:write")).toBe(false);
    expect(can("editor", "audit:write")).toBe(true);
  });
  it("resolves the highest effective role", () => {
    expect(effectiveRole(["viewer", "admin", "editor"])).toBe("admin");
  });
  it("masks PII unless the role can reveal", () => {
    expect(maskValue("secret", 2)).toBe("****et");
    expect(applyMasking("secret", "viewer", { revealRoles: ["owner"] }, 2)).toBe("****et");
    expect(applyMasking("secret", "owner", { revealRoles: ["owner"] })).toBe("secret");
  });
});

describe("billing (#760/#761/#762/#763)", () => {
  it("prorates seat charges", () => {
    expect(proratedSeatCharge(2, 30, 15, 30)).toBeCloseTo(30, 2); // half cycle
  });
  it("token-bucket rate limits", () => {
    const cfg = { capacity: 5, refillPerSecond: 1 };
    let r = consumeToken({ tokens: 1, lastRefill: 0 }, cfg, 0, 1);
    expect(r.allowed).toBe(true);
    r = consumeToken({ tokens: 0, lastRefill: 0 }, cfg, 0, 1);
    expect(r.allowed).toBe(false);
    expect(r.retryAfterMs).toBeGreaterThan(0);
    // refills over time
    expect(consumeToken({ tokens: 0, lastRefill: 0 }, cfg, 2000, 1).allowed).toBe(true);
  });
  it("computes invoices with tax", () => {
    const inv = computeInvoice([{ description: "Seats", quantity: 3, unitPrice: 30 }], 0.1);
    expect(inv.subtotal).toBe(90);
    expect(inv.tax).toBe(9);
    expect(inv.total).toBe(99);
  });
  it("evaluates spending caps and thresholds", () => {
    const s = evaluateCap(85, 100, [0.5, 0.8, 1], true);
    expect(s.crossedThresholds).toEqual([0.5, 0.8]);
    expect(s.capped).toBe(false);
    expect(evaluateCap(100, 100, [1], true).capped).toBe(true);
  });
});

describe("alerting rules (#754)", () => {
  it("fires rules whose metric crosses the threshold", () => {
    const { fired } = evaluateRules(
      [{ id: "r1", metric: "errorRate", comparator: "gt", threshold: 0.05 }],
      { errorRate: 0.1 }
    );
    expect(fired).toHaveLength(1);
    expect(fired[0].ruleId).toBe("r1");
  });
  it("suppresses within cooldown", () => {
    const rule = { id: "r1", metric: "m", comparator: "gt" as const, threshold: 1, cooldownMs: 1000 };
    const first = evaluateRules([rule], { m: 5 }, { now: 0 });
    const second = evaluateRules([rule], { m: 5 }, { now: 500, lastFired: first.lastFired });
    expect(first.fired).toHaveLength(1);
    expect(second.fired).toHaveLength(0);
  });
});

describe("cohort analysis (#731)", () => {
  it("builds per-cohort trajectories with bands", () => {
    const t = buildCohortTrajectories([
      { cohort: "2026", date: "2026-01", score: 0.5 },
      { cohort: "2026", date: "2026-01", score: 0.6 },
      { cohort: "2026", date: "2026-02", score: 0.7 },
    ]);
    expect(t).toHaveLength(1);
    expect(t[0].points).toHaveLength(2);
    expect(t[0].points[0].mean).toBeCloseTo(0.55, 5);
    expect(t[0].points[0].n).toBe(2);
  });
});

describe("priority queue (#765)", () => {
  const queue = [
    { id: "b1", ownerId: "o1", priority: "batch" as const, enqueuedAt: 1 },
    { id: "i1", ownerId: "o1", priority: "interactive" as const, enqueuedAt: 2 },
    { id: "i2", ownerId: "o2", priority: "interactive" as const, enqueuedAt: 3 },
  ];
  it("schedules higher priority first", () => {
    const sel = scheduleJobs(queue, { take: 2 });
    expect(sel.map((j) => j.id)).toEqual(["i1", "i2"]);
  });
  it("caps per owner to avoid starvation", () => {
    const sel = scheduleJobs(queue, { take: 3, perOwnerLimit: 1 });
    const o1 = sel.filter((j) => j.ownerId === "o1");
    expect(o1).toHaveLength(1);
  });
  it("reports depth by priority", () => {
    expect(queueDepthByPriority(queue)).toEqual({ interactive: 2, normal: 0, batch: 1 });
  });
});
