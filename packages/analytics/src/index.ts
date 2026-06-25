/**
 * @peasant-labs/analytics
 *
 * Framework-agnostic project / collective analytics for AI agent session data.
 *
 * Two layers, both app-agnostic:
 *
 *  1. PURE METRIC FUNCTIONS over `SessionSummary[]` — no React, no I/O, no app
 *     coupling. Import these alone (e.g. in a CLI, a report, a server handler)
 *     without pulling in React or charting code at runtime.
 *
 *  2. The `<ProjectOverview>` REACT COMPONENT — fairtrade charts + a
 *     contributor table, configurable via the `sections` prop, themed entirely
 *     from the fairtrade CSS variables. Data flows IN via props (`sessions` OR a
 *     pre-computed `analytics` bundle); the host renders the contributor cell
 *     so the package never assumes a name, route or brand.
 *
 * Required styles (import once at your app root):
 *   import "@peasant-labs/analytics/styles.css"; // tokens + component CSS
 *
 * `react`/`react-dom` are peer deps; fairtrade owns the charting dependency.
 * The `SessionSummary` type is bundled inline (no `@peasant-labs/types`
 * install needed). See README.md for the agnosticism contract.
 */

// --- Pure metric functions (no React) --------------------------------------
export {
  computeProjectAnalytics,
  sessionsPerWeek,
  weeklyActiveContributors,
  returningContributorRate,
  longestStreak,
  newContributorVelocity,
  sessionToCommitRate,
  avgDurationPerActiveWeek,
  outcomeDistribution,
  sessionStats,
  perContributorBreakdown,
  sessionHasCommit,
  medianAndP90,
  median,
  percentile,
  weekKey,
  dayKey,
  daysBetween,
  parseTime,
  isoDate,
} from "./metrics/index.js";

export type {
  ProjectAnalytics,
  WeekCount,
  WeekContributors,
  WeekNewContributors,
  WeekAvgDuration,
  ReturningContributorRate,
  LongestStreak,
  SessionToCommitRate,
  OutcomeDistribution,
  SessionStats,
  ContributorBreakdown,
  MedianP90,
} from "./metrics/index.js";

// --- React components -------------------------------------------------------
export * from "./components/index.js";

// --- The shared session shape (single import path for consumers) -----------
export type { SessionSummary, SessionOutcome } from "@peasant-labs/types";
