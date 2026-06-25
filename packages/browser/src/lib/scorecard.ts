/**
 * Deterministic (no-LLM) self-assessment logic for the optional "How this
 * session went" card. Turns a SessionScorecard (per-session quality signals)
 * into three axis verdicts — token efficiency, prompt quality, loop efficiency —
 * each with a healthy/caution/risk band derived from static thresholds, plus an
 * optional comparison line against the user's personal median.
 *
 * Ported verbatim from peasant's `session-detail/v2/lib/scorecard.ts`. Pure —
 * no I/O, no app coupling. The thresholds are product-locked; there is
 * intentionally NO composite score.
 */

import type { SessionScorecard, QualitySession } from "@peasant-labs/types";
import { computePersonalMedians as ftComputePersonalMedians } from "@peasant-labs/fairtrade/ui";

/** Band severity, worst-to-best ordering matters for `worst()`. */
export type Band = "healthy" | "caution" | "risk";

/** The three locked assessment axes. */
export type AxisId = "token" | "prompt" | "loop";

/** A single reason a band landed on caution/risk. */
export interface AxisFlag {
  label: string;
  band: Exclude<Band, "healthy">;
}

/** Optional comparison against the user's personal median for an axis headline. */
export interface AxisComparison {
  /** Signed delta vs median in the headline's unit (positive = above median). */
  delta: number;
  /** The user's median value for the headline metric. */
  median: number;
  /** Whether a higher headline value is better (drives arrow + tone wording). */
  higherIsBetter: boolean;
  /** Pre-formatted comparison sentence, e.g. "12% above your median". */
  text: string;
}

/** A fully-resolved axis card model consumed by the presentational component. */
export interface AxisVerdict {
  id: AxisId;
  title: string;
  /** Short headline value string, e.g. "8% retry tokens" or "—" when unknown. */
  headline: string;
  /** Whether the headline could be computed at all. */
  hasData: boolean;
  band: Band;
  flags: AxisFlag[];
  comparison?: AxisComparison;
}

// --- Static thresholds (product-locked) ------------------------------------

const RETRY_SHARE_RISK = 0.2; // >20% retry-token share
const CONTEXT_FILL_RISK = 70; // >70% context utilization
const OUTPUT_SURVIVAL_RISK = 50; // <50% output survival
const SPEC_SCORE_RISK = 40; // specQualityScore <40
const SIGNAL_DENSITY_RISK = 30; // signalDensity <30%
const CONSEC_ERROR_RISK = 4; // >=4 consecutive errors
const REVERTS_RISK = 3; // >=3 within-session reverts

/** Worst (most severe) band among the inputs. */
function worst(bands: Band[]): Band {
  if (bands.includes("risk")) return "risk";
  if (bands.includes("caution")) return "caution";
  return "healthy";
}

/** Retry-token share in [0,1], or undefined when inputs are missing. */
export function retryShare(sc: SessionScorecard): number | undefined {
  const total = sc.totalTokens;
  const wasted = sc.retryTokensWasted;
  if (total == null || total <= 0 || wasted == null) return undefined;
  return wasted / total;
}

/** Compute the median of a numeric sample, or undefined when empty. */
export function median(values: number[]): number | undefined {
  const xs = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (xs.length === 0) return undefined;
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 === 0 ? (xs[mid - 1]! + xs[mid]!) / 2 : xs[mid]!;
}

/**
 * Personal medians derived from the sessions the host already has. Each field
 * is undefined when the sample yields no value, so the comparison line degrades
 * gracefully rather than fabricating a baseline.
 */
export interface PersonalMedians {
  retryShare?: number;
  specQualityScore?: number;
  withinSessionReverts?: number;
}

/**
 * Compute per-metric medians across a set of the user's sessions, degrading to
 * `{}` when no usable sample exists. The host supplies the sessions (e.g. from
 * its quality channel); the viewer never fetches them.
 *
 * R9 single-impl: delegates to the one shared fairtrade analytics util
 * (`@peasant-labs/fairtrade/ui`) — the same home as computeTasks /
 * annotateTranscript — via a thin typed wrapper that keeps peasant's
 * `@peasant-labs/types` `QualitySession` input + the `PersonalMedians` shape. The
 * boundary cast bridges the known wire-type drift; runtime-safe — fairtrade reads
 * only totalTokens / retryTokensWasted / specQualityScore / withinSessionReverts.
 */
export function computePersonalMedians(
  sessions: QualitySession[] | undefined,
): PersonalMedians {
  return ftComputePersonalMedians(
    sessions as Parameters<typeof ftComputePersonalMedians>[0],
  );
}

/** Format a comparison line for a percentage-style headline. */
function pctComparison(value: number, med: number, higherIsBetter: boolean): AxisComparison {
  const delta = value - med;
  const abs = Math.abs(Math.round(delta));
  const dir = delta >= 0 ? "above" : "below";
  return {
    delta,
    median: med,
    higherIsBetter,
    text: abs === 0 ? "at your median" : `${abs} pts ${dir} your median`,
  };
}

/** Format a comparison line for a count-style headline. */
function countComparison(value: number, med: number, higherIsBetter: boolean): AxisComparison {
  const delta = value - med;
  const abs = Math.abs(Math.round(delta * 10) / 10);
  const dir = delta >= 0 ? "above" : "below";
  return {
    delta,
    median: med,
    higherIsBetter,
    text: abs === 0 ? "at your median" : `${abs} ${dir} your median`,
  };
}

// --- Per-axis assessments ---------------------------------------------------

function assessToken(sc: SessionScorecard, medians: PersonalMedians): AxisVerdict {
  const flags: AxisFlag[] = [];
  const bands: Band[] = [];

  const share = retryShare(sc);
  if (share != null) {
    bands.push(share > RETRY_SHARE_RISK ? "risk" : "healthy");
    if (share > RETRY_SHARE_RISK) {
      flags.push({ label: `${Math.round(share * 100)}% of tokens spent on retries`, band: "risk" });
    }
  }

  if (sc.m5ContextUtilizationPct != null) {
    bands.push(sc.m5ContextUtilizationPct > CONTEXT_FILL_RISK ? "caution" : "healthy");
    if (sc.m5ContextUtilizationPct > CONTEXT_FILL_RISK) {
      flags.push({ label: `Context ${Math.round(sc.m5ContextUtilizationPct)}% full`, band: "caution" });
    }
  }

  if (sc.m6OutputSurvivalPct != null) {
    bands.push(sc.m6OutputSurvivalPct < OUTPUT_SURVIVAL_RISK ? "caution" : "healthy");
    if (sc.m6OutputSurvivalPct < OUTPUT_SURVIVAL_RISK) {
      flags.push({ label: `Only ${Math.round(sc.m6OutputSurvivalPct)}% of output survived`, band: "caution" });
    }
  }

  // Failed outcome with above-median cost.
  if (
    sc.outcome === "failed" &&
    sc.costTotalUsd != null &&
    share != null &&
    medians.retryShare != null &&
    share > medians.retryShare
  ) {
    bands.push("risk");
    flags.push({ label: "Failed outcome with above-median spend", band: "risk" });
  }

  const hasData = share != null || sc.m5ContextUtilizationPct != null || sc.m6OutputSurvivalPct != null;
  const headline =
    share != null
      ? `${Math.round(share * 100)}% retry tokens`
      : sc.m5ContextUtilizationPct != null
        ? `${Math.round(sc.m5ContextUtilizationPct)}% context used`
        : "—";

  let comparison: AxisComparison | undefined;
  if (share != null && medians.retryShare != null) {
    // Lower retry share is better.
    comparison = pctComparison(share * 100, medians.retryShare * 100, false);
  }

  return {
    id: "token",
    title: "token efficiency",
    headline,
    hasData,
    band: hasData ? worst(bands) : "healthy",
    flags,
    comparison,
  };
}

function assessPrompt(sc: SessionScorecard, medians: PersonalMedians): AxisVerdict {
  const flags: AxisFlag[] = [];
  const bands: Band[] = [];

  if (sc.specQualityScore != null) {
    bands.push(sc.specQualityScore < SPEC_SCORE_RISK ? "risk" : "healthy");
    if (sc.specQualityScore < SPEC_SCORE_RISK) {
      flags.push({ label: `Spec quality low (${Math.round(sc.specQualityScore)}/100)`, band: "risk" });
    }
  }

  if (sc.signalDensity != null) {
    bands.push(sc.signalDensity < SIGNAL_DENSITY_RISK ? "caution" : "healthy");
    if (sc.signalDensity < SIGNAL_DENSITY_RISK) {
      flags.push({ label: `Sparse direction (${Math.round(sc.signalDensity)}% signal)`, band: "caution" });
    }
  }

  if (sc.m7SpecHasExamples === false) {
    bands.push("caution");
    flags.push({ label: "No examples in the prompt", band: "caution" });
  }
  if (sc.m7SpecHasConstraints === false) {
    bands.push("caution");
    flags.push({ label: "No constraints in the prompt", band: "caution" });
  }

  const hasData =
    sc.specQualityScore != null ||
    sc.signalDensity != null ||
    sc.m7SpecHasExamples != null ||
    sc.m7SpecHasConstraints != null;
  const headline =
    sc.specQualityScore != null
      ? `Spec ${Math.round(sc.specQualityScore)}/100`
      : sc.signalDensity != null
        ? `${Math.round(sc.signalDensity)}% signal`
        : "—";

  let comparison: AxisComparison | undefined;
  if (sc.specQualityScore != null && medians.specQualityScore != null) {
    // Higher spec quality is better.
    comparison = pctComparison(sc.specQualityScore, medians.specQualityScore, true);
  }

  return {
    id: "prompt",
    title: "prompt quality",
    headline,
    hasData,
    band: hasData ? worst(bands) : "healthy",
    flags,
    comparison,
  };
}

function assessLoop(sc: SessionScorecard, medians: PersonalMedians): AxisVerdict {
  const flags: AxisFlag[] = [];
  const bands: Band[] = [];

  if (sc.m4ConsecutiveErrorMax != null) {
    bands.push(sc.m4ConsecutiveErrorMax >= CONSEC_ERROR_RISK ? "risk" : "healthy");
    if (sc.m4ConsecutiveErrorMax >= CONSEC_ERROR_RISK) {
      flags.push({ label: `${sc.m4ConsecutiveErrorMax} errors in a row`, band: "risk" });
    }
  }

  if (sc.withinSessionReverts != null) {
    bands.push(sc.withinSessionReverts >= REVERTS_RISK ? "risk" : "healthy");
    if (sc.withinSessionReverts >= REVERTS_RISK) {
      flags.push({ label: `${sc.withinSessionReverts} reverts mid-session`, band: "risk" });
    }
  }

  const hasData = sc.m4ConsecutiveErrorMax != null || sc.withinSessionReverts != null;
  const headline =
    sc.m4ConsecutiveErrorMax != null
      ? `${sc.m4ConsecutiveErrorMax} max error streak`
      : sc.withinSessionReverts != null
        ? `${sc.withinSessionReverts} reverts`
        : "—";

  let comparison: AxisComparison | undefined;
  if (sc.withinSessionReverts != null && medians.withinSessionReverts != null) {
    // Fewer reverts is better.
    comparison = countComparison(sc.withinSessionReverts, medians.withinSessionReverts, false);
  }

  return {
    id: "loop",
    title: "loop efficiency",
    headline,
    hasData,
    band: hasData ? worst(bands) : "healthy",
    flags,
    comparison,
  };
}

/**
 * Build the three axis verdicts from a scorecard and (optional) personal
 * medians. Pure — no I/O. Returns undefined when the scorecard carries no
 * usable signal at all, so callers can omit the card entirely.
 */
export function assessSession(
  sc: SessionScorecard | undefined,
  medians: PersonalMedians = {},
): AxisVerdict[] | undefined {
  if (!sc) return undefined;
  const verdicts = [assessToken(sc, medians), assessPrompt(sc, medians), assessLoop(sc, medians)];
  if (!verdicts.some((v) => v.hasData)) return undefined;
  return verdicts;
}
