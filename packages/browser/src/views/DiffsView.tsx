import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "@peasant-labs/fairtrade/icons";
import {
  Chip,
  TranscriptDiffEntryCard,
  type DiffEntryVM,
} from "@peasant-labs/fairtrade/ui";
import { cn } from "../internal/cn.js";
import { DIFFS_GROUPBY_LABELS } from "../lib/labels.js";

export interface DiffsViewProps {
  /**
   * Cooked diff entries — the adapter's `vm.diffs` (one `DiffEntryVM` per
   * Edit / MultiEdit / Write, with `path`/`adds`/`dels`/`hunks`/`turn` already
   * computed). The view groups + links them; it never parses wire.
   */
  diffs: DiffEntryVM[];
  onJumpToTurn?: (turnIndex: number) => void;
}

/**
 * Stacked inline diffs from every Edit / MultiEdit / Write tool call in the
 * session, in turn order. Each entry links back to its turn. The file-change
 * cards themselves are the lifted, canonical `TranscriptDiffEntryCard` (cooked
 * `DiffEntryVM`); this view owns only the group-by-file/turn chrome + per-file
 * roll-up the lifted primitive does not host.
 */
export function DiffsView({ diffs, onJumpToTurn }: DiffsViewProps) {
  const byFile = useMemo(() => {
    const map = new Map<string, DiffEntryVM[]>();
    for (const d of diffs) {
      const list = map.get(d.path) ?? [];
      list.push(d);
      map.set(d.path, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [diffs]);

  const [groupByFile, setGroupByFile] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggleCollapse(path: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  if (diffs.length === 0) {
    return <div className="tb-view-empty">No edits or writes in this session yet.</div>;
  }

  return (
    <div className="tb-view-stack tb-diffsview">
      <header className="tb-diffsview-head">
        <p className="tb-diffsview-count">
          {diffs.length.toLocaleString()} edits across {byFile.length.toLocaleString()}{" "}
          {byFile.length === 1 ? "file" : "files"}
        </p>
        <div role="tablist" aria-label="Group diffs by" className="tb-segmented">
          {(
            [
              { value: true, label: DIFFS_GROUPBY_LABELS.byFile },
              { value: false, label: DIFFS_GROUPBY_LABELS.byTurn },
            ] as const
          ).map(({ value, label }) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={groupByFile === value}
              onClick={() => setGroupByFile(value)}
              className={cn("tb-segmented-btn", groupByFile === value && "tb-segmented-btn-active")}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {groupByFile
        ? byFile.map(([path, group]) => (
            <FileGroup
              key={path}
              path={path}
              entries={group}
              collapsed={collapsed.has(path)}
              onToggle={() => toggleCollapse(path)}
              onJumpToTurn={onJumpToTurn}
            />
          ))
        : diffs.map((e, i) => (
            <TranscriptDiffEntryCard
              key={`${e.toolCallId ?? e.path}-${i}`}
              entry={e}
              onJump={() => onJumpToTurn?.(e.turn ?? 0)}
            />
          ))}
    </div>
  );
}

function FileGroup({
  path,
  entries,
  collapsed,
  onToggle,
  onJumpToTurn,
}: {
  path: string;
  entries: DiffEntryVM[];
  collapsed: boolean;
  onToggle: () => void;
  onJumpToTurn?: (i: number) => void;
}) {
  const adds = entries.reduce((n, e) => n + e.adds, 0);
  const dels = entries.reduce((n, e) => n + e.dels, 0);
  return (
    <section id={`diff-file-${diffAnchorId(path)}`} data-diff-path={path} className="tb-diffgroup">
      <header className="tb-diffgroup-head">
        <button type="button" onClick={onToggle} className="tb-diffgroup-toggle">
          {collapsed ? <ChevronDown size={13} strokeWidth={2} /> : <ChevronUp size={13} strokeWidth={2} />}
          <span className="tb-mono tb-diffgroup-path tb-truncate">{path}</span>
        </button>
        <Chip>
          {entries.length} {entries.length === 1 ? "edit" : "edits"}
        </Chip>
        <span className="tb-mono tb-tnum tb-diffgroup-churn">
          <span className="tb-ink-positive">+{adds}</span>
          <span className="tb-hl-sep">/</span>
          <span className="tb-ink-danger">−{dels}</span>
        </span>
      </header>
      {!collapsed && (
        <div className="tb-diffgroup-body">
          {entries.map((e, i) => (
            <TranscriptDiffEntryCard
              key={`${e.toolCallId ?? e.path}-${i}`}
              entry={e}
              byTurn
              onJump={() => onJumpToTurn?.(e.turn ?? 0)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/** Sanitize a path into a safe DOM id fragment. */
export function diffAnchorId(path: string): string {
  return path.replace(/[^a-zA-Z0-9._-]+/g, "_");
}
