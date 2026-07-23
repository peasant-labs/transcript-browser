/**
 * Task grouping for the trace outline / waterfall: a "task" is the span from a
 * top-level user prompt up to (but not including) the next one — one turn of
 * human↔agent collaboration (request → reasoning → tool work → final response).
 *
 * CONSOLIDATED into the one shared fairtrade transcript analytics util
 * (`@peasant-labs/fairtrade/ui`) — the single home shared by transcript-browser,
 * peasant, and village. These thin wrappers keep the existing
 * `@peasant-labs/transcript-browser` import path + the `@peasant-labs/schema`
 * `TurnDetail` input signature stable for peasant, while delegating the body to
 * fairtrade. The fairtrade `computeTasks` is byte-for-byte the same logic with
 * the wire `JSON.parse` moved into the adapter's parse primitives — so this
 * package contains no `JSON.parse`; all wire parsing happens once, in the adapter.
 *
 * Both packages consume the generated `@peasant-labs/schema` contract, so the
 * wrappers preserve the canonical input without maintaining a parallel shape.
 */
import type { TurnDetail } from "@peasant-labs/schema";
import {
  computeTasks as ftComputeTasks,
  computeTurnLabels as ftComputeTurnLabels,
  type TaskGroup,
} from "@peasant-labs/fairtrade/ui";

export type { TaskGroup };

/** Split a turn list into task groups (one per top-level user prompt). */
export function computeTasks(turns: TurnDetail[]): TaskGroup[] {
  return ftComputeTasks(turns);
}

/** Per-turn display labels: `"1"`/`"2"` for prompts, `"2a"`/`"2b"` for follow-ups. */
export function computeTurnLabels(turns: TurnDetail[]): string[] {
  return ftComputeTurnLabels(turns);
}
