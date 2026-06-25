/**
 * The default turn prefilter + dedup `SessionDetail` applies to `detail.turns`
 * when the host omits the `turns` prop. Exported so hosts that pass their own
 * pre-scoped `turns` (e.g. peasant's task/file scoping) can run the *same*
 * filter first instead of mirroring it.
 *
 * CONSOLIDATED: the implementation now lives in the one fairtrade transcript
 * adapter (`@peasant-labs/fairtrade/ui`), the single wire→view-model projection
 * the cooked `adaptTranscript` view model is built from. This thin wrapper keeps
 * the `@peasant-labs/transcript-browser` import path + the `@peasant-labs/types`
 * `TurnDetail` signature stable for peasant (`scopeTurns.ts`) AND guarantees the
 * turns this package displays are the exact same set the cooked view model
 * carries (one prefilter, no drift). The fairtrade impl is byte-for-byte the same
 * two-pass logic (noise filter + consecutive dedup); pure, order-preserving,
 * never mutates its input.
 *
 * The boundary cast bridges the known `@peasant-labs/types` ↔ fairtrade wire
 * drift (#125/#126) and is runtime-safe (fairtrade reads optional fields
 * defensively).
 */
import type { TurnDetail } from "@peasant-labs/types";
import { prefilterTurns as ftPrefilterTurns } from "@peasant-labs/fairtrade/ui";

export function prefilterTurns(turns: TurnDetail[]): TurnDetail[] {
  return ftPrefilterTurns(
    turns as Parameters<typeof ftPrefilterTurns>[0],
  ) as TurnDetail[];
}
