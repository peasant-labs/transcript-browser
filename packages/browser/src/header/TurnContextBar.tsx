import { useMemo } from "react";
import { TurnContextBar as FairtradeTurnContextBar } from "@peasant-labs/fairtrade/ui";
import { computeTasks, type TaskGroup } from "../lib/tasks.js";
import type { TurnDetail } from "@peasant-labs/types";

export interface TurnContextBarProps {
  turns: TurnDetail[];
  /** First visible turn — entry-index space (matches the rail's activeTurnIndex). */
  activeEntryIndex?: number;
  visible: boolean;
  /** Top offset in px for the sticky placement — below the StickyHeader. */
  top?: number;
  /** Jump to a turn by its entry index (prompt of the active / next task). */
  onJumpToTurn?: (turnIndex: number) => void;
  className?: string;
}

/**
 * DOMAIN wrapper around the design system's TurnContextBar. It keeps the
 * transcript-specific logic — deriving the active user turn from the visible
 * entry index, the next task, and the visibility gate — then renders the
 * consumed fairtrade chrome (sticky strip, eyebrow + echoed prompt + "next").
 * The bespoke tb-contextbar chrome was removed.
 */
export function TurnContextBar({ turns, activeEntryIndex, visible, top = 0, onJumpToTurn, className }: TurnContextBarProps) {
  const tasks = useMemo<TaskGroup[]>(() => computeTasks(turns), [turns]);

  const active = useMemo(() => {
    if (tasks.length === 0 || activeEntryIndex == null) return null;
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i]!;
      const startEntry = turns[task.startIndex]?.index;
      if (startEntry == null) continue;
      if (activeEntryIndex < startEntry) break;
      const nextEntry = turns[task.endIndex + 1]?.index;
      if (nextEntry == null || activeEntryIndex < nextEntry) {
        const nextTask = tasks[i + 1];
        return { task, ordinal: i + 1, nextTask: nextTask ?? null };
      }
    }
    return null;
  }, [tasks, turns, activeEntryIndex]);

  if (!active || !visible) return null;

  const nextTask = active.nextTask;
  return (
    <FairtradeTurnContextBar
      prompt={active.task.prompt}
      ordinal={active.ordinal}
      stickyTop={`${top}px`}
      onJump={onJumpToTurn ? () => onJumpToTurn(active.task.promptEntryIndex) : undefined}
      onNext={onJumpToTurn && nextTask ? () => onJumpToTurn(nextTask.promptEntryIndex) : undefined}
      className={className}
    />
  );
}
