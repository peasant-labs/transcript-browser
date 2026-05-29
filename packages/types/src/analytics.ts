/**
 * Generic per-session analytics shape.
 *
 * `SessionSummary` is the minimal, app-agnostic projection of a session that the
 * `@peasant-labs/analytics` package needs to compute project / collective
 * metrics. It is deliberately *not* the full `SessionDetailPayload` (no turns,
 * no transcript): analytics operates over many sessions at once, so each one is
 * reduced to a flat summary row.
 *
 * Any consuming app maps its own session records onto this shape. None of the
 * fields assume a particular backend, route, or brand — `projectKey` and
 * `contributorId` are opaque identifiers chosen by the host (a repo slug, a
 * user id, an email hash, …). The optional quality "m-metrics" mirror
 * `SessionScorecard` so apps that compute them can surface richer breakdowns,
 * while apps that don't simply omit them.
 *
 * @example
 * ```ts
 * // Map your own record onto SessionSummary:
 * const summary: SessionSummary = {
 *   id: row.sessionId,
 *   startTime: row.createdAt,          // ISO-8601 string
 *   projectKey: row.repoSlug,          // any stable project identifier
 *   contributorId: row.authorId,       // any stable contributor identifier
 *   durationMins: row.durationMinutes,
 *   totalTokens: row.tokens,
 *   turnCount: row.turns,
 *   toolCallCount: row.toolCalls,
 *   outcome: row.outcome,              // "resolved" | "partial" | "failed"
 *   hasCommit: row.commitCount > 0,
 *   commitCount: row.commitCount,
 * };
 * ```
 */

import type { SessionOutcome } from "./quality.js";

export interface SessionSummary {
  /** Stable, opaque session identifier. */
  id: string;
  /**
   * Session start time as an ISO-8601 string (e.g. `2026-05-27T14:03:00Z`).
   * Used for time-bucketing (per-week metrics, streaks). Any value `Date` can
   * parse is accepted; week bucketing uses the date portion in UTC.
   */
  startTime: string;
  /**
   * Opaque project / repository identifier. The host decides what this is — a
   * repo slug, a project hash, a workspace name. Metrics that segment by
   * project key on this verbatim string; no parsing or brand assumptions.
   */
  projectKey: string;
  /**
   * Opaque contributor identifier (user id, email hash, git author, …). Drives
   * the contributor-centric metrics (active/returning/new contributors,
   * per-contributor breakdown). The host owns its meaning.
   */
  contributorId: string;
  /** Wall-clock session duration in minutes. */
  durationMins: number;
  /** Total tokens consumed by the session (in + out). */
  totalTokens: number;
  /** Number of conversation turns. */
  turnCount: number;
  /** Number of tool calls across the session. */
  toolCallCount: number;
  /**
   * Heuristic session outcome. Optional because not every app computes one;
   * `outcomeDistribution` counts an absent outcome under `unknown`.
   */
  outcome?: SessionOutcome;

  // ── Commit linkage ───────────────────────────────────────────────────────
  /**
   * Whether the session produced at least one git commit. Drives
   * `sessionToCommitRate`. Provide this even if you don't track exact counts.
   */
  hasCommit?: boolean;
  /**
   * Number of commits linked to the session. When present it implies
   * `hasCommit` for any value > 0; when absent, `hasCommit` is used directly.
   */
  commitCount?: number;

  // ── Optional quality m-metrics (mirror SessionScorecard) ──────────────────
  // Supplied only by apps that compute deterministic quality signals. The
  // analytics layer treats every one as optional and skips it when absent — no
  // metric requires them, they enrich per-contributor / distribution views.
  /** 0–100%. Share of the prompt that was signal vs. filler. */
  signalDensity?: number;
  /** 0–100. Heuristic spec-quality score for the opening prompt. */
  specQualityScore?: number;
  /** Tokens wasted on retry loops. */
  retryTokensWasted?: number;
  /** Count of within-session reverts. */
  withinSessionReverts?: number;
  /** Files touched during the session. */
  filesTouched?: number;
  /** Net lines changed during the session. */
  linesChanged?: number;
}
