import type { PhaseType } from "@peasant-labs/types";
import { PHASE_LABELS } from "./labels.js";

/**
 * Human-readable names for phase types — the sticky PhaseDivider section
 * headers. The lowercase chrome strings live in the central `lib/labels.ts`
 * source of truth; this module just resolves a `PhaseType` against it. The
 * phase-DETECTION algorithm stays app-side; the viewer only renders the
 * `Phase[]` it is handed via props.
 */

/** Label for a phase type, falling back to the raw value for unknown types. */
export function phaseLabel(type: PhaseType | string): string {
  return PHASE_LABELS[type as PhaseType] ?? String(type);
}
