import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "../internal/cn.js";
import { formatDuration } from "../primitives/DurationBadge.js";
import { preview } from "../canvas/tool-renderers/types.js";
import { computeTasks, type TaskGroup } from "../lib/tasks.js";
import type { TurnDetail } from "@peasant-labs/types";

export interface OutlineListProps {
  turns: TurnDetail[];
  activeTurnIndex?: number;
  onTurnClick?: (turnIndex: number) => void;
  className?: string;
}

/**
 * Task-checkpoint outline. One row per user turn (= one task). Ported from
 * peasant's `rails/OutlineList.tsx`.
 */
export function OutlineList({ turns, activeTurnIndex, onTurnClick, className }: OutlineListProps) {
  const tasks = useMemo(() => computeTasks(turns), [turns]);

  if (tasks.length === 0) {
    return <div className={cn("tb-outline-empty", className)}>No user turns yet.</div>;
  }

  return (
    <nav className={cn("tb-outline", className)} aria-label="User turn checkpoints">
      {tasks.map((t, i) => (
        <TaskRow
          key={i}
          ordinal={i + 1}
          task={t}
          active={
            activeTurnIndex != null &&
            activeTurnIndex >= turns[t.startIndex]!.index &&
            (t.endIndex >= turns.length - 1 || activeTurnIndex < (turns[t.endIndex + 1]?.index ?? Infinity))
          }
          onClick={onTurnClick}
        />
      ))}
    </nav>
  );
}

function TaskRow({
  ordinal,
  task,
  active,
  onClick,
}: {
  ordinal: number;
  task: TaskGroup;
  active?: boolean;
  onClick?: (turnIndex: number) => void;
}) {
  const head = preview(task.prompt, 120);

  const metaParts: string[] = [];
  if (task.durationMs > 0) metaParts.push(formatDuration(task.durationMs));
  if (task.toolCallCount > 0) metaParts.push(`${task.toolCallCount} ${task.toolCallCount === 1 ? "tool" : "tools"}`);
  if (task.filesTouched.length > 0) {
    const n = task.filesTouched.length;
    metaParts.push(`${n} ${n === 1 ? "file" : "files"}`);
  }
  if (task.insertions > 0 || task.deletions > 0) metaParts.push(`+${task.insertions}/−${task.deletions}`);
  if (task.tokens > 0) metaParts.push(`${formatTokens(task.tokens)} tok`);
  const meta = metaParts.join(" · ") || "—";

  return (
    <button
      type="button"
      onClick={() => onClick?.(task.promptEntryIndex)}
      aria-label={`User turn ${ordinal}`}
      className={cn("tb-outline-row tb-focus", active && "tb-outline-row-active")}
    >
      <span className="tb-outline-marker" aria-hidden>
        {task.hasErrors ? (
          <AlertTriangle size={12} strokeWidth={2} className="tb-ink-danger" />
        ) : (
          <span className={cn("tb-outline-dot", active && "tb-outline-dot-active")} />
        )}
      </span>

      <span className="tb-outline-rowbody">
        <span className="tb-outline-rowhead">
          <span className="tb-mono tb-tnum tb-outline-ordinal">{ordinal}</span>
          <span className={cn("tb-outline-prompt", active && "tb-outline-prompt-active")}>{head}</span>
        </span>
        <span title={meta} className="tb-mono tb-tnum tb-outline-meta tb-truncate">
          {meta}
        </span>
      </span>
    </button>
  );
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `${n}`;
}
