import { useMemo } from "react";
import { CornerDownLeft } from "lucide-react";
import { cn } from "../internal/cn.js";
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
 * Sticky strip naming the active user turn and echoing its prompt. Ported from
 * peasant's `header/TurnContextBar.tsx`.
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

  const prompt = active.task.prompt.trim().replace(/\s+/g, " ");

  return (
    <div role="region" aria-label="Current user turn" style={{ top }} className={cn("tb-contextbar", className)}>
      <div className="tb-contextbar-inner">
        <button
          type="button"
          onClick={() => onJumpToTurn?.(active.task.promptEntryIndex)}
          className="tb-contextbar-main tb-focus"
          title={prompt}
        >
          <span className="tb-eyebrow tb-contextbar-eyebrow" aria-label={`User turn ${active.ordinal}`}>
            <span>User turn</span>
            <span className="tb-mono tb-tnum tb-contextbar-ordinal">{active.ordinal}</span>
          </span>
          {prompt && (
            <>
              <span className="tb-contextbar-dot" aria-hidden>
                ·
              </span>
              <span className="tb-contextbar-prompt tb-truncate">{prompt}</span>
            </>
          )}
        </button>

        {onJumpToTurn && active.nextTask && (
          <button
            type="button"
            onClick={() => onJumpToTurn(active.nextTask!.promptEntryIndex)}
            className="tb-eyebrow tb-contextbar-next tb-focus"
            title="Jump to next user prompt"
          >
            <span>Next</span>
            <CornerDownLeft size={11} strokeWidth={1.75} className="tb-contextbar-next-icon" />
          </button>
        )}
      </div>
    </div>
  );
}
