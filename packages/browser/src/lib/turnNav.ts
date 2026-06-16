import { useEffect } from "react";

/**
 * Vim-style turn navigation (peasant roadmap 4.1).
 *
 * `nextNavTurn` is the pure index math — given the ordered list of visible turn
 * indices, the current anchor, and a direction (+1 = down/next, -1 = up/prev),
 * it returns the turn to move to. It clamps at both ends (no wrap) and snaps to
 * the first/last turn when there is no current anchor. Kept pure + exported so
 * the host can unit-test it without a DOM.
 */
export function nextNavTurn(
  turnIndices: readonly number[],
  current: number | undefined,
  dir: 1 | -1,
): number | undefined {
  if (turnIndices.length === 0) return undefined;
  const firstLast = dir > 0 ? turnIndices[0] : turnIndices[turnIndices.length - 1];
  if (current === undefined) return firstLast;
  const pos = turnIndices.indexOf(current);
  if (pos === -1) return firstLast;
  const next = pos + dir;
  if (next < 0 || next >= turnIndices.length) return turnIndices[pos]; // clamp, no wrap
  return turnIndices[next];
}

/** True when the keystroke should be ignored because the user is typing or a
 *  modifier is held — bare j/k must never hijack text entry or shortcuts. */
function shouldIgnore(e: KeyboardEvent): boolean {
  if (e.metaKey || e.ctrlKey || e.altKey) return true;
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
}

export interface TurnKeyboardNavOptions {
  /** Disabled while another surface owns the keyboard (e.g. search overlay). */
  enabled: boolean;
  /** Ordered visible turn indices (display order). */
  turnIndices: readonly number[];
  /** The current anchor turn (typically the top visible turn). */
  getCurrent: () => number | undefined;
  /** Move to the resolved turn (host scrolls it into view). */
  onNavigate: (turnIndex: number) => void;
}

/**
 * Bind j / k (and ArrowDown / ArrowUp without a modifier) to move between turns.
 * Cleanup-safe; a no-op while disabled or when there are no turns. The actual
 * scroll is delegated to the host via onNavigate so this hook owns no DOM math.
 */
export function useTurnKeyboardNav(opts: TurnKeyboardNavOptions): void {
  const { enabled, turnIndices, getCurrent, onNavigate } = opts;
  useEffect(() => {
    if (!enabled || turnIndices.length === 0) return;
    function onKey(e: KeyboardEvent) {
      if (shouldIgnore(e)) return;
      let dir: 1 | -1 | 0 = 0;
      if (e.key === "j" || e.key === "ArrowDown") dir = 1;
      else if (e.key === "k" || e.key === "ArrowUp") dir = -1;
      if (dir === 0) return;
      const target = nextNavTurn(turnIndices, getCurrent(), dir);
      if (target === undefined) return;
      e.preventDefault();
      onNavigate(target);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, turnIndices, getCurrent, onNavigate]);
}
