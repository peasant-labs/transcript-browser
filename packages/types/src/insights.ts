/**
 * Phase detection types for the session-detail viewer.
 *
 * Source of truth: peasant `web/src/lib/insights/types.ts`. Village does not
 * define these — see DIVERGENCES.md. Only the data shapes are lifted here; the
 * phase-detection algorithm itself stays app-side for now.
 */

export type PhaseType =
  | "planning"
  | "exploration"
  | "implementation"
  | "testing"
  | "error"
  | "debug"
  | "retry-loop"
  | "user-correction"
  | "recovery"
  | "abandonment";

export interface PhaseBadge {
  type: PhaseType;
  count: number;
}

export interface Phase {
  type: PhaseType;
  startTurn: number;
  endTurn: number;
  /** Badges for absorbed micro-phases (e.g., "1 error"). */
  badges: PhaseBadge[];
}
