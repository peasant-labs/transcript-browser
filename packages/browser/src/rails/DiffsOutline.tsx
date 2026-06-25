import { useMemo } from "react";
import { Pencil } from "@peasant-labs/fairtrade/icons";
import { cn } from "../internal/cn.js";
import type { FileRollup } from "../lib/file-rollup.js";

export interface DiffsOutlineProps {
  /** Per-file rollups — computed once by the composer from the cooked VM. */
  files: FileRollup[];
  /** Preferred jump — scrolls to the file's section in the Diffs view. */
  onJumpToFile?: (path: string, firstTurnIndex: number) => void;
  /** Fallback when no Diffs-view anchor is wired. */
  onJumpToTurn?: (turnIndex: number) => void;
  className?: string;
}

/**
 * Outline for the Diffs tab — files with edits/writes only, sorted by churn.
 * Ported from peasant's `rails/DiffsOutline.tsx`.
 */
export function DiffsOutline({ files, onJumpToFile, onJumpToTurn, className }: DiffsOutlineProps) {
  const edited = useMemo(
    () =>
      files
        .filter((f) => f.edits + f.writes > 0)
        .sort((a, b) => b.insertions + b.deletions - (a.insertions + a.deletions)),
    [files],
  );

  if (edited.length === 0) {
    return <div className={cn("tb-outline-empty", className)}>No edits or writes in this session yet.</div>;
  }

  return (
    <nav className={cn("tb-outline", className)} aria-label="Diffs outline">
      {edited.map((f) => (
        <button
          key={f.path}
          type="button"
          onClick={() => {
            const anchor = f.firstEditTurnIndex ?? f.firstTurnIndex;
            if (onJumpToFile) onJumpToFile(f.path, anchor);
            else onJumpToTurn?.(anchor);
          }}
          className="tb-outline-srow"
        >
          <span className="tb-outline-srow-icon">
            <Pencil size={12} strokeWidth={1.75} />
          </span>
          <span className="tb-outline-srow-body">
            <span className="tb-mono tb-outline-srow-label tb-truncate" title={f.path}>
              {leaf(f.path)}
            </span>
            <span className="tb-mono tb-tnum tb-outline-srow-sub">
              <span className="tb-ink-positive">+{f.insertions}</span>
              <span className="tb-hl-sep">/</span>
              <span className="tb-ink-danger">−{f.deletions}</span>
              <span className="tb-ink-faint">
                {" · "}
                {f.edits + f.writes} {f.edits + f.writes === 1 ? "edit" : "edits"}
              </span>
            </span>
          </span>
        </button>
      ))}
    </nav>
  );
}

function leaf(path: string): string {
  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 1) return path;
  return parts.slice(-2).join("/");
}
