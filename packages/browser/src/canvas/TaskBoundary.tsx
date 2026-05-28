import { CheckCircle2 } from "lucide-react";
import { cn } from "../internal/cn.js";
import { formatDuration } from "../primitives/DurationBadge.js";
import type { TaskGroup } from "../lib/tasks.js";

export interface TaskBoundaryProps {
  /** The just-completed task being summarized. */
  task: TaskGroup;
  /** 1-based ordinal for the task. */
  index: number;
  className?: string;
}

/**
 * Horizontal divider rendered between two tasks — it marks the moment the agent
 * finished and the user picked the conversation back up. Carries a compact
 * summary of what the prior task accomplished.
 */
export function TaskBoundary({ task, index, className }: TaskBoundaryProps) {
  const churn = task.insertions + task.deletions;
  const files = task.filesTouched.length;

  return (
    <div
      className={cn("tb-marker tb-marker-tasks", className)}
      role="separator"
      aria-label={`End of user turn ${index}`}
    >
      <div className="tb-marker-rule" />
      <div className="tb-marker-chip">
        <CheckCircle2 size={12} strokeWidth={1.75} />
        <span className="tb-eyebrow tb-marker-eyebrow">User Turn {index}</span>
        {task.durationMs > 0 && (
          <span className="tb-marker-meta">{formatDuration(task.durationMs)}</span>
        )}
        {task.toolCallCount > 0 && (
          <span className="tb-marker-meta">{task.toolCallCount} tools</span>
        )}
        {files > 0 && <span className="tb-marker-meta">{files} files</span>}
        {churn > 0 && (
          <span className="tb-marker-churn">
            <span className="tb-marker-churn-add">+{task.insertions}</span>
            <span className="tb-marker-churn-sep">/</span>
            <span className="tb-marker-churn-del">−{task.deletions}</span>
          </span>
        )}
      </div>
      <div className="tb-marker-rule" />
    </div>
  );
}
