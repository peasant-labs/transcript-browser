import type { TurnDetail } from "@peasant-labs/types";

/**
 * The default turn prefilter + dedup `SessionDetail` applies to `detail.turns`
 * when the host omits the `turns` prop. Exported so hosts that pass their own
 * pre-scoped `turns` (e.g. peasant's task/file scoping) can run the *same*
 * filter first instead of mirroring it.
 *
 * Two passes:
 *
 * 1. **Noise filter** — drops turns with neither content nor tool calls, and
 *    short (< 8 chars) tool-less `system` turns (init banners, etc.).
 * 2. **Consecutive dedup** — collapses adjacent turns with the same role and
 *    identical non-empty content (a streaming artifact both source apps
 *    produce), preferring the tool-bearing copy when only one carries tools.
 *
 * Pure and order-preserving; never mutates the input.
 */
export function prefilterTurns(turns: TurnDetail[]): TurnDetail[] {
  const filtered = turns.filter((t) => {
    const hasContent = !!t.content?.trim();
    const hasTools = (t.toolCalls?.length ?? 0) > 0;
    if (!hasContent && !hasTools) return false;
    if (t.role === "system" && !hasTools && (!t.content || t.content.trim().length < 8)) return false;
    return true;
  });
  const deduped: TurnDetail[] = [];
  for (const curr of filtered) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.role === curr.role && prev.content === curr.content && prev.content.trim() !== "") {
      const prevHasTools = (prev.toolCalls?.length ?? 0) > 0;
      const currHasTools = (curr.toolCalls?.length ?? 0) > 0;
      if (currHasTools && !prevHasTools) deduped[deduped.length - 1] = curr;
      continue;
    }
    deduped.push(curr);
  }
  return deduped;
}
