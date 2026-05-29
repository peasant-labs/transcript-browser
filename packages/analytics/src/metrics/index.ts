/**
 * Pure metric functions over `SessionSummary[]`.
 *
 * Every function here is side-effect free: same input → same output, no React,
 * no I/O, no global state. They form the computational core of the analytics
 * layer; the `ProjectOverview` component is a thin presentation shell over
 * `computeProjectAnalytics`, which calls these. Apps that only need numbers
 * (CLIs, reports, server endpoints) can import these directly without React.
 */

import type { SessionSummary, SessionOutcome } from "@peasant-labs/types";
import { dayKey, daysBetween, weekKey } from "./time.js";
import { medianAndP90, type MedianP90 } from "./stats.js";

export { medianAndP90, median, percentile, type MedianP90 } from "./stats.js";
export { weekKey, dayKey, daysBetween, parseTime, isoDate } from "./time.js";

/** Does this session have at least one linked commit? */
export function sessionHasCommit(s: SessionSummary): boolean {
  if (typeof s.commitCount === "number") return s.commitCount > 0;
  return s.hasCommit === true;
}

/** One bucket of the per-week session-count series. */
export interface WeekCount {
  /** Monday-of-week UTC date key (`YYYY-MM-DD`). */
  week: string;
  count: number;
}

/**
 * sessionsPerWeek — number of sessions per ISO week, sorted ascending by week.
 * Weeks with no sessions are omitted (callers can densify if they want a gap-
 * free axis). Sessions with an unparseable `startTime` are dropped.
 */
export function sessionsPerWeek(sessions: SessionSummary[]): WeekCount[] {
  const byWeek = new Map<string, number>();
  for (const s of sessions) {
    const wk = weekKey(s.startTime);
    if (wk === null) continue;
    byWeek.set(wk, (byWeek.get(wk) ?? 0) + 1);
  }
  return [...byWeek.entries()]
    .map(([week, count]) => ({ week, count }))
    .sort((a, b) => a.week.localeCompare(b.week));
}

/** One bucket of the per-week unique-contributor series. */
export interface WeekContributors {
  week: string;
  /** Distinct contributor ids active that week. */
  contributors: number;
}

/**
 * weeklyActiveContributors — distinct contributor ids active in each ISO week,
 * sorted ascending by week. The host's `contributorId` is treated as an opaque
 * key; empty ids are ignored.
 */
export function weeklyActiveContributors(
  sessions: SessionSummary[],
): WeekContributors[] {
  const byWeek = new Map<string, Set<string>>();
  for (const s of sessions) {
    if (!s.contributorId) continue;
    const wk = weekKey(s.startTime);
    if (wk === null) continue;
    let set = byWeek.get(wk);
    if (!set) {
      set = new Set();
      byWeek.set(wk, set);
    }
    set.add(s.contributorId);
  }
  return [...byWeek.entries()]
    .map(([week, set]) => ({ week, contributors: set.size }))
    .sort((a, b) => a.week.localeCompare(b.week));
}

/** Result of the returning-contributor calculation. */
export interface ReturningContributorRate {
  /** Distinct contributors with ≥1 session. */
  total: number;
  /** Distinct contributors active in ≥2 distinct weeks. */
  returning: number;
  /** returning / total, in [0, 1]. `0` when there are no contributors. */
  rate: number;
}

/**
 * returningContributorRate — fraction of contributors who were active in two
 * or more distinct ISO weeks. A single-week contributor is "new/one-off"; a
 * multi-week contributor is "returning".
 */
export function returningContributorRate(
  sessions: SessionSummary[],
): ReturningContributorRate {
  const weeksByContributor = new Map<string, Set<string>>();
  for (const s of sessions) {
    if (!s.contributorId) continue;
    const wk = weekKey(s.startTime);
    if (wk === null) continue;
    let set = weeksByContributor.get(s.contributorId);
    if (!set) {
      set = new Set();
      weeksByContributor.set(s.contributorId, set);
    }
    set.add(wk);
  }
  const total = weeksByContributor.size;
  let returning = 0;
  for (const weeks of weeksByContributor.values()) {
    if (weeks.size >= 2) returning += 1;
  }
  return { total, returning, rate: total === 0 ? 0 : returning / total };
}

/** Result of a streak calculation. */
export interface LongestStreak {
  /** Length of the longest run of consecutive active weeks. */
  weeks: number;
  /** First Monday-key of that run, or `null` when there are no sessions. */
  startWeek: string | null;
  /** Last Monday-key of that run, or `null` when there are no sessions. */
  endWeek: string | null;
}

const MS_PER_WEEK = 7 * 86_400_000;

/**
 * longestStreak — the longest run of consecutive active ISO weeks across all
 * sessions (project-wide, not per contributor). "Consecutive" means each active
 * week's Monday is exactly 7 days after the previous active week's Monday.
 */
export function longestStreak(sessions: SessionSummary[]): LongestStreak {
  const weeks = [
    ...new Set(
      sessions
        .map((s) => weekKey(s.startTime))
        .filter((w): w is string => w !== null),
    ),
  ].sort((a, b) => a.localeCompare(b));

  if (weeks.length === 0) return { weeks: 0, startWeek: null, endWeek: null };

  let bestLen = 1;
  let bestStart = weeks[0]!;
  let bestEnd = weeks[0]!;
  let curLen = 1;
  let curStart = weeks[0]!;

  for (let i = 1; i < weeks.length; i++) {
    const prev = Date.parse(`${weeks[i - 1]!}T00:00:00Z`);
    const cur = Date.parse(`${weeks[i]!}T00:00:00Z`);
    if (cur - prev === MS_PER_WEEK) {
      curLen += 1;
    } else {
      curLen = 1;
      curStart = weeks[i]!;
    }
    if (curLen > bestLen) {
      bestLen = curLen;
      bestStart = curStart;
      bestEnd = weeks[i]!;
    }
  }
  return { weeks: bestLen, startWeek: bestStart, endWeek: bestEnd };
}

/** One bucket of the new-contributor series. */
export interface WeekNewContributors {
  week: string;
  /** Contributors whose FIRST-EVER session falls in this week. */
  newContributors: number;
}

/**
 * newContributorVelocity — count of contributors making their first-ever
 * appearance in each ISO week, sorted ascending. A contributor is counted once,
 * in the week of their earliest session. Useful as an acquisition / growth
 * signal for a project or collective.
 */
export function newContributorVelocity(
  sessions: SessionSummary[],
): WeekNewContributors[] {
  // Earliest day-key per contributor.
  const firstDay = new Map<string, string>();
  for (const s of sessions) {
    if (!s.contributorId) continue;
    const dk = dayKey(s.startTime);
    if (dk === null) continue;
    const cur = firstDay.get(s.contributorId);
    if (cur === undefined || dk < cur) firstDay.set(s.contributorId, dk);
  }
  const byWeek = new Map<string, number>();
  for (const dk of firstDay.values()) {
    const wk = weekKey(`${dk}T00:00:00Z`);
    if (wk === null) continue;
    byWeek.set(wk, (byWeek.get(wk) ?? 0) + 1);
  }
  return [...byWeek.entries()]
    .map(([week, newContributors]) => ({ week, newContributors }))
    .sort((a, b) => a.week.localeCompare(b.week));
}

/** Result of the session→commit calculation. */
export interface SessionToCommitRate {
  /** Total sessions considered. */
  total: number;
  /** Sessions that produced ≥1 commit. */
  withCommit: number;
  /** withCommit / total, in [0, 1]. `0` when there are no sessions. */
  rate: number;
}

/**
 * sessionToCommitRate — fraction of sessions that produced at least one commit.
 * Uses `commitCount > 0` when present, else the `hasCommit` flag. A session
 * with neither set counts as "no commit".
 */
export function sessionToCommitRate(
  sessions: SessionSummary[],
): SessionToCommitRate {
  const total = sessions.length;
  let withCommit = 0;
  for (const s of sessions) if (sessionHasCommit(s)) withCommit += 1;
  return { total, withCommit, rate: total === 0 ? 0 : withCommit / total };
}

/** One bucket of the per-active-week average-duration series. */
export interface WeekAvgDuration {
  week: string;
  /** Mean session duration (minutes) across the week's sessions. */
  avgDurationMins: number;
  /** Number of sessions that fed the average. */
  sessions: number;
}

/**
 * avgDurationPerActiveWeek — mean session duration (minutes) for each ISO week
 * that had at least one session, sorted ascending. Inactive weeks are omitted
 * (hence "per ACTIVE week"). Non-finite durations are ignored.
 */
export function avgDurationPerActiveWeek(
  sessions: SessionSummary[],
): WeekAvgDuration[] {
  const acc = new Map<string, { sum: number; n: number }>();
  for (const s of sessions) {
    const wk = weekKey(s.startTime);
    if (wk === null) continue;
    if (!Number.isFinite(s.durationMins)) continue;
    const cur = acc.get(wk) ?? { sum: 0, n: 0 };
    cur.sum += s.durationMins;
    cur.n += 1;
    acc.set(wk, cur);
  }
  return [...acc.entries()]
    .map(([week, { sum, n }]) => ({
      week,
      avgDurationMins: n === 0 ? 0 : sum / n,
      sessions: n,
    }))
    .sort((a, b) => a.week.localeCompare(b.week));
}

/** Distribution of session outcomes. */
export interface OutcomeDistribution {
  resolved: number;
  partial: number;
  failed: number;
  /** Sessions with no `outcome` set. */
  unknown: number;
  total: number;
}

/**
 * outcomeDistribution — counts of sessions per `SessionOutcome`. Sessions with
 * no outcome are bucketed under `unknown`, so the four buckets always sum to
 * `total`.
 */
export function outcomeDistribution(
  sessions: SessionSummary[],
): OutcomeDistribution {
  const dist: OutcomeDistribution = {
    resolved: 0,
    partial: 0,
    failed: 0,
    unknown: 0,
    total: sessions.length,
  };
  for (const s of sessions) {
    switch (s.outcome) {
      case "resolved":
        dist.resolved += 1;
        break;
      case "partial":
        dist.partial += 1;
        break;
      case "failed":
        dist.failed += 1;
        break;
      default:
        dist.unknown += 1;
    }
  }
  return dist;
}

/** Per-contributor rolled-up summary. */
export interface ContributorBreakdown {
  contributorId: string;
  /** Total sessions by this contributor. */
  sessions: number;
  /** Distinct ISO weeks this contributor was active. */
  activeWeeks: number;
  totalTokens: number;
  totalDurationMins: number;
  totalTurns: number;
  totalToolCalls: number;
  /** Sessions that produced ≥1 commit. */
  sessionsWithCommit: number;
  /** Outcome tally for this contributor. */
  outcomes: OutcomeDistribution;
  /** Earliest session day-key (`YYYY-MM-DD`), or `null`. */
  firstSeen: string | null;
  /** Latest session day-key (`YYYY-MM-DD`), or `null`. */
  lastSeen: string | null;
}

/**
 * perContributorBreakdown — one rolled-up row per contributor, sorted by
 * session count descending (ties broken by contributor id). Powers the
 * contributor table in `ProjectOverview`. Sessions with an empty
 * `contributorId` are skipped.
 */
export function perContributorBreakdown(
  sessions: SessionSummary[],
): ContributorBreakdown[] {
  const byId = new Map<string, ContributorBreakdown & { weeks: Set<string> }>();

  for (const s of sessions) {
    if (!s.contributorId) continue;
    let row = byId.get(s.contributorId);
    if (!row) {
      row = {
        contributorId: s.contributorId,
        sessions: 0,
        activeWeeks: 0,
        totalTokens: 0,
        totalDurationMins: 0,
        totalTurns: 0,
        totalToolCalls: 0,
        sessionsWithCommit: 0,
        outcomes: { resolved: 0, partial: 0, failed: 0, unknown: 0, total: 0 },
        firstSeen: null,
        lastSeen: null,
        weeks: new Set<string>(),
      };
      byId.set(s.contributorId, row);
    }
    row.sessions += 1;
    row.outcomes.total += 1;
    if (Number.isFinite(s.totalTokens)) row.totalTokens += s.totalTokens;
    if (Number.isFinite(s.durationMins)) row.totalDurationMins += s.durationMins;
    if (Number.isFinite(s.turnCount)) row.totalTurns += s.turnCount;
    if (Number.isFinite(s.toolCallCount)) row.totalToolCalls += s.toolCallCount;
    if (sessionHasCommit(s)) row.sessionsWithCommit += 1;

    switch (s.outcome) {
      case "resolved":
        row.outcomes.resolved += 1;
        break;
      case "partial":
        row.outcomes.partial += 1;
        break;
      case "failed":
        row.outcomes.failed += 1;
        break;
      default:
        row.outcomes.unknown += 1;
    }

    const wk = weekKey(s.startTime);
    if (wk !== null) row.weeks.add(wk);

    const dk = dayKey(s.startTime);
    if (dk !== null) {
      if (row.firstSeen === null || dk < row.firstSeen) row.firstSeen = dk;
      if (row.lastSeen === null || dk > row.lastSeen) row.lastSeen = dk;
    }
  }

  return [...byId.values()]
    .map(({ weeks, ...row }) => ({ ...row, activeWeeks: weeks.size }))
    .sort(
      (a, b) =>
        b.sessions - a.sessions ||
        a.contributorId.localeCompare(b.contributorId),
    );
}

/** Quartile statistics (median + p90) for the common numeric session fields. */
export interface SessionStats {
  durationMins: MedianP90;
  totalTokens: MedianP90;
  turnCount: MedianP90;
  toolCallCount: MedianP90;
}

/**
 * sessionStats — median + p90 of the four core numeric session fields across
 * the input. A convenience wrapper around `medianAndP90` for the "typical vs.
 * tail" cards in `ProjectOverview`.
 */
export function sessionStats(sessions: SessionSummary[]): SessionStats {
  return {
    durationMins: medianAndP90(sessions.map((s) => s.durationMins)),
    totalTokens: medianAndP90(sessions.map((s) => s.totalTokens)),
    turnCount: medianAndP90(sessions.map((s) => s.turnCount)),
    toolCallCount: medianAndP90(sessions.map((s) => s.toolCallCount)),
  };
}

/**
 * The fully-computed analytics bundle. `ProjectOverview` accepts either this
 * (pre-computed by the host) or a raw `SessionSummary[]` it computes itself.
 */
export interface ProjectAnalytics {
  /** Distinct sessions considered. */
  totalSessions: number;
  /** Distinct contributors. */
  totalContributors: number;
  /** Distinct projects (`projectKey` values). */
  totalProjects: number;
  sessionsPerWeek: WeekCount[];
  weeklyActiveContributors: WeekContributors[];
  returningContributorRate: ReturningContributorRate;
  longestStreak: LongestStreak;
  newContributorVelocity: WeekNewContributors[];
  sessionToCommitRate: SessionToCommitRate;
  avgDurationPerActiveWeek: WeekAvgDuration[];
  outcomeDistribution: OutcomeDistribution;
  sessionStats: SessionStats;
  perContributorBreakdown: ContributorBreakdown[];
}

/**
 * computeProjectAnalytics — run every metric over a session list and assemble
 * the `ProjectAnalytics` bundle. Pure: no React, no I/O. This is what
 * `ProjectOverview` calls internally when handed raw `SessionSummary[]`.
 */
export function computeProjectAnalytics(
  sessions: SessionSummary[],
): ProjectAnalytics {
  const contributors = new Set<string>();
  const projects = new Set<string>();
  for (const s of sessions) {
    if (s.contributorId) contributors.add(s.contributorId);
    if (s.projectKey) projects.add(s.projectKey);
  }
  return {
    totalSessions: sessions.length,
    totalContributors: contributors.size,
    totalProjects: projects.size,
    sessionsPerWeek: sessionsPerWeek(sessions),
    weeklyActiveContributors: weeklyActiveContributors(sessions),
    returningContributorRate: returningContributorRate(sessions),
    longestStreak: longestStreak(sessions),
    newContributorVelocity: newContributorVelocity(sessions),
    sessionToCommitRate: sessionToCommitRate(sessions),
    avgDurationPerActiveWeek: avgDurationPerActiveWeek(sessions),
    outcomeDistribution: outcomeDistribution(sessions),
    sessionStats: sessionStats(sessions),
    perContributorBreakdown: perContributorBreakdown(sessions),
  };
}

export type { SessionSummary, SessionOutcome };
