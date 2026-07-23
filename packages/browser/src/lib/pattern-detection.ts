/**
 * Client-side pattern detection over a transcript — the error / retry / revert /
 * subagent moments the host surfaces in `<AnnotationsView>` / the annotation
 * rails / the graph. Exported so the host calls `annotateTranscript(turns)`
 * itself and feeds the result in; the shared viewer never runs it implicitly.
 *
 * CONSOLIDATED into the one shared fairtrade transcript analytics util
 * (`@peasant-labs/fairtrade/ui`). This thin wrapper keeps the
 * `@peasant-labs/transcript-browser` import path + the `@peasant-labs/schema`
 * `TurnDetail` signature stable for peasant, while delegating the body to
 * fairtrade. The fairtrade `annotateTranscript` is the same detection logic with
 * the wire `JSON.parse` moved into the adapter's parse primitives — so no
 * `JSON.parse` lives in this package; all wire parsing happens once, in the
 * adapter.
 *
 * Both packages consume the generated `@peasant-labs/schema` contract, so the
 * wrapper preserves the canonical input without maintaining a parallel shape.
 */
import type { TurnDetail } from "@peasant-labs/schema";
import {
  annotateTranscript as ftAnnotateTranscript,
  type TranscriptAnnotation,
} from "@peasant-labs/fairtrade/ui";

export type { TranscriptAnnotation };

/** Surface error / retry / revert / subagent moments, sorted by display position. */
export function annotateTranscript(turns: TurnDetail[]): TranscriptAnnotation[] {
  return ftAnnotateTranscript(turns);
}
