/**
 * Viewer-owned analytical envelopes.
 *
 * These are derived presentation records, not schema wire contracts. Canonical
 * transport types come directly from `@peasant-labs/schema`.
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
  /** Badges for absorbed micro-phases, such as a single error. */
  badges: PhaseBadge[];
}
