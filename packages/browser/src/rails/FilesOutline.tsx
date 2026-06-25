import { useMemo } from "react";
import { FileText } from "@peasant-labs/fairtrade/icons";
import { cn } from "../internal/cn.js";
import type { FileRollup } from "../lib/file-rollup.js";

export interface FilesOutlineProps {
  /** Per-file rollups — computed once by the composer from the cooked VM. */
  files: FileRollup[];
  /** Preferred jump for files with edits — goes to the Diffs view anchor. */
  onJumpToFile?: (path: string, firstTurnIndex: number) => void;
  /** Fallback jump for read-only files (and when no file jump is wired). */
  onJumpToTurn?: (turnIndex: number) => void;
  className?: string;
}

/**
 * Outline for the Files tab — every file touched, sorted alphabetically. Ported
 * from peasant's `rails/FilesOutline.tsx`.
 */
export function FilesOutline({ files, onJumpToFile, onJumpToTurn, className }: FilesOutlineProps) {
  const sorted = useMemo(() => [...files].sort((a, b) => a.path.localeCompare(b.path)), [files]);

  if (sorted.length === 0) {
    return <div className={cn("tb-outline-empty", className)}>No file activity recorded yet.</div>;
  }

  return (
    <nav className={cn("tb-outline", className)} aria-label="Files outline">
      {sorted.map((f) => {
        const hasEdits = f.edits + f.writes > 0;
        return (
          <button
            key={f.path}
            type="button"
            onClick={() => {
              if (hasEdits && onJumpToFile) onJumpToFile(f.path, f.firstEditTurnIndex ?? f.firstTurnIndex);
              else onJumpToTurn?.(f.lastTurnIndex);
            }}
            className="tb-outline-srow"
          >
            <span className="tb-outline-srow-icon">
              <FileText size={12} strokeWidth={1.75} />
            </span>
            <span className="tb-outline-srow-body">
              <span className="tb-mono tb-outline-srow-label tb-truncate" title={f.path}>
                {leaf(f.path)}
              </span>
              <span className="tb-mono tb-tnum tb-outline-srow-sub tb-ink-muted">{summarize(f)}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function leaf(path: string): string {
  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 1) return path;
  return parts.slice(-2).join("/");
}

function summarize(f: FileRollup): string {
  const parts: string[] = [];
  if (f.reads > 0) parts.push(`${f.reads}r`);
  if (f.edits > 0) parts.push(`${f.edits}e`);
  if (f.writes > 0) parts.push(`${f.writes}w`);
  if (f.deletes > 0) parts.push(`${f.deletes}d`);
  const churn = f.insertions || f.deletions ? `+${f.insertions}/−${f.deletions}` : "";
  return [parts.join(" "), churn].filter(Boolean).join(" · ");
}
