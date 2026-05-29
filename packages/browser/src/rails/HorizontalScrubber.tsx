import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../internal/cn.js";
import { computeTasks } from "../lib/tasks.js";
import type { TurnDetail } from "@peasant-labs/types";

export interface HorizontalScrubberProps {
  /** Turns in display order (already filtered + deduped upstream). */
  turns: TurnDetail[];
  /** First/last visible turn indices — drawn as the viewport bracket. */
  viewportRange?: { start: number; end: number };
  /** Turn indices flagged as errors. */
  errorTurns?: number[];
  /** Turn indices carrying a non-error label (retry loops, reverts, …). */
  flaggedTurns?: number[];
  /**
   * Seek handler — receives a turn entry index and a behavior hint. During a
   * drag we pass 'auto' so the canvas instantly tracks the cursor.
   */
  onSeek?: (turnIndex: number, behavior?: "auto" | "smooth") => void;
  className?: string;
}

/**
 * Compact horizontal density bar for the sticky header. Clicking seeks; the
 * viewport bracket can be dragged. Ported from peasant's
 * `rails/HorizontalScrubber.tsx`. Tailwind colour classes → `tb-*` classes.
 */
export function HorizontalScrubber({ turns, viewportRange, errorTurns, flaggedTurns, onSeek, className }: HorizontalScrubberProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const total = turns.length;
  const [dragging, setDragging] = useState(false);

  const ratio = useCallback((displayIdx: number) => (total > 0 ? displayIdx / Math.max(1, total - 1) : 0), [total]);

  const entryToDisplay = useMemo(() => {
    const map = new Map<number, number>();
    turns.forEach((t, i) => map.set(t.index, i));
    return map;
  }, [turns]);

  const displayOf = useCallback(
    (entryIdx: number, fallback: number): number => {
      const m = entryToDisplay.get(entryIdx);
      if (m !== undefined) return m;
      let best = fallback;
      let bestDist = Infinity;
      for (const [k, v] of entryToDisplay) {
        const d = Math.abs(k - entryIdx);
        if (d < bestDist) {
          bestDist = d;
          best = v;
        }
      }
      return best;
    },
    [entryToDisplay],
  );

  const errors = useMemo(() => new Set(errorTurns ?? []), [errorTurns]);
  const flagged = useMemo(() => new Set(flaggedTurns ?? []), [flaggedTurns]);
  const taskStartSet = useMemo(() => {
    const tasks = computeTasks(turns);
    return new Set(tasks.map((t) => t.startIndex));
  }, [turns]);

  const ticks = useMemo(() => {
    return turns.map((t, i) => {
      const isUser = t.role === "user" || taskStartSet.has(i);
      const isErr = errors.has(t.index);
      const isFlagged = flagged.has(t.index);

      let heightPct = 30;
      let widthPx = 1;
      let cls = "tb-scrubber-tick-faint";
      if (isErr) {
        heightPct = 100;
        widthPx = 3;
        cls = "tb-scrubber-tick-error";
      } else if (isFlagged) {
        heightPct = 100;
        widthPx = 3;
        cls = "tb-scrubber-tick-flag";
      } else if (isUser) {
        heightPct = 100;
        widthPx = 2;
        cls = "tb-scrubber-tick-user";
      }
      return { left: ratio(i) * 100, heightPct, widthPx, cls };
    });
  }, [turns, ratio, errors, flagged, taskStartSet]);

  const seekFromClientX = useCallback(
    (clientX: number, behavior: "auto" | "smooth" = "smooth") => {
      if (!onSeek || !railRef.current || total === 0) return;
      const rect = railRef.current.getBoundingClientRect();
      const r = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const display = Math.round(r * (total - 1));
      const turn = turns[display];
      if (turn) onSeek(turn.index, behavior);
    },
    [onSeek, total, turns],
  );

  const dragOffsetRef = useRef(0);

  const handleRailClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (dragging) return;
      seekFromClientX(e.clientX);
    },
    [dragging, seekFromClientX],
  );

  const handleBracketMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!viewportRange || !railRef.current) return;
      e.stopPropagation();
      e.preventDefault();
      const rect = railRef.current.getBoundingClientRect();
      const startDisp = displayOf(viewportRange.start, 0);
      const bracketLeftPx = rect.left + ratio(startDisp) * rect.width;
      dragOffsetRef.current = e.clientX - bracketLeftPx;
      setDragging(true);
    },
    [viewportRange, ratio, displayOf],
  );

  useEffect(() => {
    if (!dragging) return;
    let pendingX: number | null = null;
    let rafId = 0;
    function flush() {
      rafId = 0;
      if (pendingX == null) return;
      const x = pendingX;
      pendingX = null;
      seekFromClientX(x - dragOffsetRef.current, "auto");
    }
    function onMove(ev: MouseEvent) {
      pendingX = ev.clientX;
      if (rafId === 0) rafId = requestAnimationFrame(flush);
    }
    function onUp() {
      if (rafId !== 0) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      pendingX = null;
      setDragging(false);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (rafId !== 0) cancelAnimationFrame(rafId);
    };
  }, [dragging, seekFromClientX]);

  if (total === 0) return null;

  return (
    <div
      ref={railRef}
      onClick={handleRailClick}
      role="slider"
      aria-label="Transcript timeline"
      aria-valuemin={0}
      aria-valuemax={Math.max(0, total - 1)}
      aria-valuenow={viewportRange?.start ?? 0}
      className={cn("tb-scrubber", className)}
    >
      {ticks.map((t, i) => (
        <span
          key={i}
          className={cn("tb-scrubber-tick", t.cls)}
          style={{ left: `calc(${t.left}% - ${t.widthPx / 2}px)`, width: `${t.widthPx}px`, height: `${t.heightPct}%` }}
        />
      ))}

      {viewportRange &&
        (() => {
          const startDisp = displayOf(viewportRange.start, 0);
          const endDisp = displayOf(viewportRange.end, total - 1);
          const leftPct = ratio(startDisp) * 100;
          const widthPct = Math.max(1, (ratio(endDisp) - ratio(startDisp)) * 100);
          return (
            <div
              onMouseDown={handleBracketMouseDown}
              role="presentation"
              className={cn("tb-scrubber-window", dragging && "tb-scrubber-window-dragging")}
              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
              aria-hidden
            />
          );
        })()}
    </div>
  );
}
