/**
 * Quality / outcome types and the pure label-derivation helpers that operate
 * on annotations.
 *
 * Source of truth: peasant `web/src/lib/quality/types.ts`. Village does not
 * define these — see DIVERGENCES.md.
 */

import type { AnnotationSummary } from "./annotations.js";

/** Heuristic session outcome computed by the backend. */
export type SessionOutcome = "resolved" | "partial" | "failed";

/**
 * Deterministic per-session quality signals consumed by the optional
 * SessionScorecard ("How this session went") self-assessment card. Mirrors Go
 * pkg/schema.SessionScorecard. All numeric fields are optional so the card can
 * distinguish "not computed" from a real zero.
 *
 * Source of truth: peasant `web/src/types/messages.ts`. Village does not define
 * this. It lives here because it is a per-transcript quality shape the shared
 * viewer renders (via the optional scorecard prop), not app/transport glue.
 */
export interface SessionScorecard {
  // Token efficiency inputs.
  m2TokenOutcomeRatio?: number;
  m5ContextUtilizationPct?: number;
  m6OutputSurvivalPct?: number;
  retryTokensWasted?: number;
  totalTokens?: number;
  costTotalUsd?: number;
  // Prompt quality inputs.
  specQualityScore?: number;
  signalDensity?: number;
  m7SpecHasExamples?: boolean;
  m7SpecHasConstraints?: boolean;
  // Loop efficiency inputs.
  m4ConsecutiveErrorMax?: number;
  withinSessionReverts?: number;
  /** Session outcome echoed for the "failed + above-median cost" trigger. */
  outcome?: string;
}

/** Binary label used everywhere in the UI: positive (green) or negative (red). */
export type SessionLabel = "positive" | "negative";

export interface QualitySession {
  id: string;
  date: string;
  project: string;
  /** "Personal" or team name. */
  scope: string;
  title: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  turnCount: number;
  toolCalls: number;
  outcome: SessionOutcome;
  filesTouched: number;
  linesChanged: number;
  durationMinutes: number;
  retryLoops: number;
  retryTokensWasted: number;
  withinSessionReverts: number;
  /** 0-100%. */
  signalDensity: number;
  /** 0-100. */
  specQualityScore: number;
  /** 0-100% in first quartile. */
  explorationRatio: number;
  /** Unique directories. */
  scopeBreadth: number;
  /** Turns before first productive action. */
  discoveryTurns: number;
  // Label annotations (v4) — raw annotation objects from the backend.
  // Derive humanLabel / agentLabel via deriveLabels() rather than reading
  // fields directly.
  /** Rules-based label (always present). */
  rulesOutcome?: SessionOutcome;
  /** Backend annotation objects. */
  effectiveAnnotations?: AnnotationSummary[];
}

/** Map an annotation outcome value string to a binary SessionLabel. */
export function outcomeValueToLabel(value: string): SessionLabel | undefined {
  if (value === "resolved") return "positive";
  if (value === "not_resolved") return "negative";
  return undefined;
}

export interface DerivedLabels {
  humanLabel?: SessionLabel;
  agentLabel?: SessionLabel;
  rulesLabel?: SessionLabel;
}

/**
 * Derive humanLabel, agentLabel, and rulesLabel from a session's
 * effectiveAnnotations array.
 *
 * Only annotations with typeId === "quality.session_outcome" are considered.
 * The first matching annotation per annotatorKind wins. Returns an empty object
 * when there are no relevant annotations.
 */
export function deriveLabels(annotations?: AnnotationSummary[]): DerivedLabels {
  if (!annotations?.length) return {};

  const result: DerivedLabels = {};

  for (const ann of annotations) {
    if (ann.typeId !== "quality.session_outcome") continue;
    const label = outcomeValueToLabel(ann.value);
    if (!label) continue;

    if (ann.annotatorKind === "human" && !result.humanLabel) {
      result.humanLabel = label;
    } else if (ann.annotatorKind === "agent" && !result.agentLabel) {
      result.agentLabel = label;
    } else if (ann.annotatorKind === "rule" && !result.rulesLabel) {
      result.rulesLabel = label;
    }
  }

  return result;
}
