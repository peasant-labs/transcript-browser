import { GitCommit } from "lucide-react";
import { cn } from "../internal/cn.js";
import { formatRelative } from "../lib/time.js";
import type { SessionCommit } from "@peasant-labs/types";

export interface CheckpointMarkerProps {
  commit: SessionCommit;
  className?: string;
}

/**
 * Between-turn divider marking a git commit made during the session. Renders a
 * thin horizontal rule with a centered chip carrying the hash + message.
 */
export function CheckpointMarker({ commit, className }: CheckpointMarkerProps) {
  const short = commit.hash.slice(0, 7);
  const ago = formatRelative(commit.timestamp);
  const adds = commit.insertions ?? 0;
  const dels = commit.deletions ?? 0;
  const files = commit.filesChanged ?? 0;

  return (
    <div className={cn("tb-marker", className)}>
      <div className="tb-marker-rule" />
      <div className="tb-marker-chip">
        <GitCommit size={12} strokeWidth={1.75} />
        <span className="tb-eyebrow tb-marker-eyebrow">Commit</span>
        <code className="tb-marker-hash">{short}</code>
        {commit.message && (
          <span className="tb-marker-message" title={commit.message}>
            {commit.message}
          </span>
        )}
        {files > 0 && (
          <span className="tb-marker-meta">
            {files} {files === 1 ? "file" : "files"}
          </span>
        )}
        {(adds > 0 || dels > 0) && (
          <span className="tb-marker-churn">
            <span className="tb-marker-churn-add">+{adds}</span>
            <span className="tb-marker-churn-sep">/</span>
            <span className="tb-marker-churn-del">−{dels}</span>
          </span>
        )}
        <span className="tb-marker-meta">{ago}</span>
      </div>
      <div className="tb-marker-rule" />
    </div>
  );
}
