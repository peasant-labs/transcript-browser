import { describe, expect, it } from "vitest";
import type { SessionSummary } from "@peasant-labs/types";
import {
  avgDurationPerActiveWeek,
  computeProjectAnalytics,
  longestStreak,
  newContributorVelocity,
  outcomeDistribution,
  perContributorBreakdown,
  returningContributorRate,
  sessionHasCommit,
  sessionStats,
  sessionToCommitRate,
  sessionsPerWeek,
  weeklyActiveContributors,
} from "./index.js";
import { medianAndP90, median, percentile } from "./stats.js";
import { weekKey, dayKey, daysBetween } from "./time.js";
import { SAMPLE_SESSIONS, makeSession } from "./fixtures.js";

const EMPTY: SessionSummary[] = [];

describe("time helpers", () => {
  it("weekKey buckets to the UTC Monday", () => {
    // 2026-01-07 is a Wednesday → week of Mon 2026-01-05.
    expect(weekKey("2026-01-07T15:00:00Z")).toBe("2026-01-05");
    // 2026-01-05 is itself a Monday.
    expect(weekKey("2026-01-05T00:00:00Z")).toBe("2026-01-05");
    // 2026-01-04 is a Sunday → previous week (Mon 2025-12-29).
    expect(weekKey("2026-01-04T23:59:59Z")).toBe("2025-12-29");
  });

  it("weekKey / dayKey return null on garbage", () => {
    expect(weekKey("not-a-date")).toBeNull();
    expect(dayKey("")).toBeNull();
  });

  it("daysBetween counts whole days", () => {
    expect(daysBetween("2026-01-05", "2026-01-12")).toBe(7);
    expect(daysBetween("2026-01-12", "2026-01-05")).toBe(-7);
  });
});

describe("stats helpers", () => {
  it("median / percentile interpolate", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([5])).toBe(5);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9)).toBeCloseTo(9.1);
  });

  it("empty distribution → null", () => {
    expect(median([])).toBeNull();
    expect(percentile([], 0.5)).toBeNull();
    const mp = medianAndP90([]);
    expect(mp).toEqual({ count: 0, median: null, p90: null });
  });

  it("medianAndP90 drops non-finite values", () => {
    const mp = medianAndP90([10, NaN, 20, Infinity, 30]);
    expect(mp.count).toBe(3);
    expect(mp.median).toBe(20);
  });
});

describe("sessionHasCommit", () => {
  it("prefers commitCount when present", () => {
    expect(sessionHasCommit(makeSession({ id: "x", commitCount: 0, hasCommit: true }))).toBe(false);
    expect(sessionHasCommit(makeSession({ id: "x", commitCount: 2 }))).toBe(true);
  });
  it("falls back to hasCommit", () => {
    expect(sessionHasCommit(makeSession({ id: "x", commitCount: undefined, hasCommit: true }))).toBe(true);
    expect(sessionHasCommit(makeSession({ id: "x", commitCount: undefined, hasCommit: false }))).toBe(false);
  });
});

describe("sessionsPerWeek", () => {
  it("counts per ISO week, sorted ascending", () => {
    expect(sessionsPerWeek(SAMPLE_SESSIONS)).toEqual([
      { week: "2026-01-05", count: 2 },
      { week: "2026-01-12", count: 3 },
      { week: "2026-01-19", count: 3 },
    ]);
  });
  it("drops unparseable times and handles empty", () => {
    expect(sessionsPerWeek(EMPTY)).toEqual([]);
    expect(sessionsPerWeek([makeSession({ id: "bad", startTime: "nope" })])).toEqual([]);
  });
});

describe("weeklyActiveContributors", () => {
  it("counts distinct contributors per week", () => {
    expect(weeklyActiveContributors(SAMPLE_SESSIONS)).toEqual([
      { week: "2026-01-05", contributors: 2 }, // alice, bob
      { week: "2026-01-12", contributors: 3 }, // alice, carol, bob
      { week: "2026-01-19", contributors: 2 }, // alice, carol
    ]);
  });
});

describe("returningContributorRate", () => {
  it("counts contributors active in >=2 weeks", () => {
    // alice: wks 1,2,3; bob: wks 1,2; carol: wks 2,3 → all 3 are returning.
    const r = returningContributorRate(SAMPLE_SESSIONS);
    expect(r).toEqual({ total: 3, returning: 3, rate: 1 });
  });

  it("a single-week contributor is not returning", () => {
    const r = returningContributorRate([
      makeSession({ id: "a", contributorId: "solo", startTime: "2026-01-05T10:00:00Z" }),
      makeSession({ id: "b", contributorId: "solo", startTime: "2026-01-06T10:00:00Z" }),
      makeSession({ id: "c", contributorId: "regular", startTime: "2026-01-05T10:00:00Z" }),
      makeSession({ id: "d", contributorId: "regular", startTime: "2026-01-13T10:00:00Z" }),
    ]);
    expect(r).toEqual({ total: 2, returning: 1, rate: 0.5 });
  });
  it("empty → zero rate, no divide-by-zero", () => {
    expect(returningContributorRate(EMPTY)).toEqual({ total: 0, returning: 0, rate: 0 });
  });
});

describe("longestStreak", () => {
  it("finds the longest consecutive-week run", () => {
    // The sample spans three consecutive weeks.
    expect(longestStreak(SAMPLE_SESSIONS)).toEqual({
      weeks: 3,
      startWeek: "2026-01-05",
      endWeek: "2026-01-19",
    });
  });
  it("resets across a gap", () => {
    const s = [
      makeSession({ id: "a", startTime: "2026-01-05T10:00:00Z" }),
      makeSession({ id: "b", startTime: "2026-01-12T10:00:00Z" }),
      // gap: skip 2026-01-19
      makeSession({ id: "c", startTime: "2026-01-26T10:00:00Z" }),
      makeSession({ id: "d", startTime: "2026-02-02T10:00:00Z" }),
      makeSession({ id: "e", startTime: "2026-02-09T10:00:00Z" }),
    ];
    expect(longestStreak(s)).toEqual({
      weeks: 3,
      startWeek: "2026-01-26",
      endWeek: "2026-02-09",
    });
  });
  it("empty → zero", () => {
    expect(longestStreak(EMPTY)).toEqual({ weeks: 0, startWeek: null, endWeek: null });
  });
});

describe("newContributorVelocity", () => {
  it("counts first appearances per week", () => {
    // alice & bob first appear week 1; carol first appears week 2.
    expect(newContributorVelocity(SAMPLE_SESSIONS)).toEqual([
      { week: "2026-01-05", newContributors: 2 },
      { week: "2026-01-12", newContributors: 1 },
    ]);
  });
});

describe("sessionToCommitRate", () => {
  it("fraction of sessions with a commit", () => {
    // s1, s3, s5, s7 have commits → 4 of 8.
    expect(sessionToCommitRate(SAMPLE_SESSIONS)).toEqual({
      total: 8,
      withCommit: 4,
      rate: 0.5,
    });
  });
  it("empty → zero", () => {
    expect(sessionToCommitRate(EMPTY)).toEqual({ total: 0, withCommit: 0, rate: 0 });
  });
});

describe("avgDurationPerActiveWeek", () => {
  it("averages duration within each active week", () => {
    const r = avgDurationPerActiveWeek(SAMPLE_SESSIONS);
    // wk1: (20+40)/2 = 30; wk2: (60+15+35)/3 = 36.666…; wk3: (25+50+10)/3 = 28.333…
    expect(r).toHaveLength(3);
    expect(r[0]).toEqual({ week: "2026-01-05", avgDurationMins: 30, sessions: 2 });
    expect(r[1]!.avgDurationMins).toBeCloseTo(110 / 3);
    expect(r[2]!.avgDurationMins).toBeCloseTo(85 / 3);
  });
});

describe("outcomeDistribution", () => {
  it("buckets all outcomes; unknown for absent", () => {
    // resolved: s1,s4,s5,s6 = 4; partial: s3 = 1; failed: s2,s8 = 2; unknown: s7 = 1.
    expect(outcomeDistribution(SAMPLE_SESSIONS)).toEqual({
      resolved: 4,
      partial: 1,
      failed: 2,
      unknown: 1,
      total: 8,
    });
  });
  it("buckets always sum to total", () => {
    const d = outcomeDistribution(SAMPLE_SESSIONS);
    expect(d.resolved + d.partial + d.failed + d.unknown).toBe(d.total);
  });
});

describe("sessionStats (medianAndP90 per metric)", () => {
  it("computes median + p90 for the core numeric fields", () => {
    const stats = sessionStats(SAMPLE_SESSIONS);
    // durations sorted: 10,15,20,25,35,40,50,60 → median = (25+35)/2 = 30.
    expect(stats.durationMins.median).toBe(30);
    expect(stats.durationMins.count).toBe(8);
    // p90 is in the tail (>= the median).
    expect(stats.totalTokens.p90!).toBeGreaterThanOrEqual(stats.totalTokens.median!);
  });
});

describe("perContributorBreakdown", () => {
  it("rolls up per contributor, sorted by session count desc", () => {
    const rows = perContributorBreakdown(SAMPLE_SESSIONS);
    expect(rows.map((r) => r.contributorId)).toEqual(["alice", "bob", "carol"]);

    const alice = rows[0]!;
    expect(alice.sessions).toBe(4); // s1,s3,s6,s7
    expect(alice.activeWeeks).toBe(3);
    expect(alice.sessionsWithCommit).toBe(3); // s1, s3, s7
    expect(alice.outcomes).toEqual({ resolved: 2, partial: 1, failed: 0, unknown: 1, total: 4 });
    expect(alice.firstSeen).toBe("2026-01-05");
    expect(alice.lastSeen).toBe("2026-01-21");
    expect(alice.totalTokens).toBe(5_000 + 30_000 + 9_000 + 18_000);
  });

  it("skips empty contributor ids and handles empty", () => {
    expect(perContributorBreakdown(EMPTY)).toEqual([]);
    expect(perContributorBreakdown([makeSession({ id: "x", contributorId: "" })])).toEqual([]);
  });
});

describe("computeProjectAnalytics", () => {
  it("assembles every metric + the totals", () => {
    const a = computeProjectAnalytics(SAMPLE_SESSIONS);
    expect(a.totalSessions).toBe(8);
    expect(a.totalContributors).toBe(3);
    expect(a.totalProjects).toBe(1);
    expect(a.sessionsPerWeek).toEqual(sessionsPerWeek(SAMPLE_SESSIONS));
    expect(a.outcomeDistribution).toEqual(outcomeDistribution(SAMPLE_SESSIONS));
    expect(a.perContributorBreakdown).toEqual(perContributorBreakdown(SAMPLE_SESSIONS));
  });

  it("is robust to an empty input", () => {
    const a = computeProjectAnalytics(EMPTY);
    expect(a.totalSessions).toBe(0);
    expect(a.returningContributorRate.rate).toBe(0);
    expect(a.longestStreak.weeks).toBe(0);
    expect(a.sessionStats.durationMins.median).toBeNull();
  });
});
