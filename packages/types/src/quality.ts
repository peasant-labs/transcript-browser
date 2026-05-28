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
