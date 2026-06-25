import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, GitCommit } from "@peasant-labs/fairtrade/icons";
import { cn } from "../internal/cn.js";
import { formatRelative } from "../lib/time.js";
import type { SessionCommit } from "@peasant-labs/types";

export interface CheckpointSelectorProps {
  commits: SessionCommit[];
  /** "all" or a commit hash. */
  value: "all" | string;
  onChange: (value: "all" | string) => void;
  /** Jump-to handler — fires when the user clicks a commit row. */
  onJump?: (commit: SessionCommit) => void;
}

/**
 * Checkpoint picker. Ported from peasant's `rails/CheckpointSelector.tsx`; the
 * Radix Popover is replaced with a dependency-free click-outside dropdown.
 */
export function CheckpointSelector({ commits, value, onChange, onJump }: CheckpointSelectorProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const sorted = [...commits].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const selected = value === "all" ? null : sorted.find((c) => c.hash === value);
  const label = selected
    ? `${selected.hash.slice(0, 7)} · ${selected.message.slice(0, 40)}`
    : `All checkpoints (${commits.length})`;

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="tb-checkpoint">
      <button type="button" onClick={() => setOpen((v) => !v)} className="tb-checkpoint-trigger" aria-expanded={open}>
        <GitCommit size={12} strokeWidth={1.75} className="tb-toolicon-muted tb-shrink-0" />
        <span className="tb-checkpoint-label tb-truncate">{label}</span>
        <ChevronDown size={12} strokeWidth={2} className="tb-toolicon-muted tb-shrink-0" />
      </button>
      {open && (
        <div className="tb-checkpoint-panel" role="listbox">
          <CheckpointRow
            label="all checkpoints"
            sub={`${commits.length} ${commits.length === 1 ? "commit" : "commits"}`}
            active={value === "all"}
            onClick={() => {
              onChange("all");
              setOpen(false);
            }}
          />
          {sorted.length > 0 && <div className="tb-checkpoint-divider" />}
          {sorted.map((c) => (
            <CheckpointRow
              key={c.hash}
              label={c.message || c.hash.slice(0, 7)}
              sub={
                <span className="tb-mono tb-tnum">
                  <span className="tb-ink-muted">{c.hash.slice(0, 7)}</span>
                  {" · "}
                  <span className="tb-ink-muted">{formatRelative(c.timestamp)}</span>
                  {c.filesChanged ? (
                    <>
                      {" · "}
                      <span className="tb-ink-muted">{c.filesChanged} files</span>
                    </>
                  ) : null}
                </span>
              }
              active={value === c.hash}
              onClick={() => {
                onChange(c.hash);
                onJump?.(c);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CheckpointRow({
  label,
  sub,
  active,
  onClick,
}: {
  label: string;
  sub: ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={cn("tb-checkpoint-row", active && "tb-checkpoint-row-active")}>
      <span className="tb-checkpoint-row-label tb-truncate">{label}</span>
      <span className="tb-checkpoint-row-sub tb-truncate">{sub}</span>
    </button>
  );
}
