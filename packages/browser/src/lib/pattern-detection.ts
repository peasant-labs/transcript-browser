/**
 * Client-side pattern detection over a transcript — the error / retry / revert /
 * subagent moments the host surfaces in `<AnnotationsView>` / the annotation
 * rails / the graph. Exported so the host calls `annotateTranscript(turns)`
 * itself and feeds the result in; the shared viewer never runs it implicitly.
 *
 * CONSOLIDATED into the one shared fairtrade transcript analytics util
 * (`@peasant-labs/fairtrade/ui`). This thin wrapper keeps the
 * `@peasant-labs/transcript-browser` import path + the `@peasant-labs/types`
 * `TurnDetail` signature stable for peasant, while delegating the body to
 * fairtrade. The fairtrade `annotateTranscript` is the same detection logic with
 * the wire `JSON.parse` moved into the adapter's parse primitives — so no
 * `JSON.parse` lives in this package; all wire parsing happens once, in the
 * adapter.
 *
 * The boundary cast bridges the known `@peasant-labs/types` ↔ fairtrade wire
 * drift (#125/#126) and is runtime-safe (fairtrade reads optional fields
 * defensively).
 */
import type { TurnDetail } from "@peasant-labs/types";
import {
  annotateTranscript as ftAnnotateTranscript,
  type TranscriptAnnotation,
} from "@peasant-labs/fairtrade/ui";

export type { TranscriptAnnotation };

/** Surface error / retry / revert / subagent moments, sorted by display position. */
export function annotateTranscript(turns: TurnDetail[]): TranscriptAnnotation[] {
  return ftAnnotateTranscript(
    turns as Parameters<typeof ftAnnotateTranscript>[0],
  );
}
