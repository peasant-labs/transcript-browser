import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Pencil, FilePlus2 } from "lucide-react";
import { cn } from "../internal/cn.js";
import { DiffView } from "../primitives/DiffView.js";
import { ErrorPill } from "../primitives/ErrorPill.js";
import { Chip } from "../primitives/Chip.js";
import { parseArgs } from "../canvas/tool-renderers/types.js";
import type { TurnDetail, ToolCallDetail } from "@peasant-labs/types";

export interface DiffsViewProps {
  turns: TurnDetail[];
  onJumpToTurn?: (turnIndex: number) => void;
}

interface DiffEntry {
  turnIndex: number;
  call: ToolCallDetail;
  /** 'edit' shows DiffView, 'write' shows the new content as an additions diff. */
  kind: "edit" | "write";
}

/**
 * Stacked inline diffs from every Edit / MultiEdit / Write tool call in the
 * session, in turn order. Each entry links back to its turn. Ported from
 * peasant's `views/DiffsView.tsx`.
 */
export function DiffsView({ turns, onJumpToTurn }: DiffsViewProps) {
  const entries = useMemo<DiffEntry[]>(() => {
    const out: DiffEntry[] = [];
    for (const turn of turns) {
      for (const c of turn.toolCalls ?? []) {
        const n = c.name.toLowerCase();
        if (n === "edit" || n === "multiedit" || n === "notebookedit") {
          out.push({ turnIndex: turn.index, call: c, kind: "edit" });
        } else if (n === "write") {
          out.push({ turnIndex: turn.index, call: c, kind: "write" });
        }
      }
    }
    return out;
  }, [turns]);

  const byFile = useMemo(() => {
    const map = new Map<string, DiffEntry[]>();
    for (const e of entries) {
      const path = e.call.filePath ?? "(unknown)";
      const list = map.get(path) ?? [];
      list.push(e);
      map.set(path, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [entries]);

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

  if (entries.length === 0) {
    return <div className="tb-view-empty">No edits or writes in this session yet.</div>;
  }

  return (
    <div className="tb-view-stack tb-diffsview">
      <header className="tb-diffsview-head">
        <p className="tb-diffsview-count">
          {entries.length.toLocaleString()} edits across {byFile.length.toLocaleString()}{" "}
          {byFile.length === 1 ? "file" : "files"}
        </p>
        <div role="tablist" aria-label="Group diffs by" className="tb-segmented">
          {(
            [
              { value: true, label: "By file" },
              { value: false, label: "By turn" },
            ] as const
          ).map(({ value, label }) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={groupByFile === value}
              onClick={() => setGroupByFile(value)}
              className={cn("tb-segmented-btn tb-focus", groupByFile === value && "tb-segmented-btn-active")}
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
        : entries.map((e, i) => (
            <DiffEntryCard key={`${e.call.id}-${i}`} entry={e} onJumpToTurn={onJumpToTurn} />
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
  entries: DiffEntry[];
  collapsed: boolean;
  onToggle: () => void;
  onJumpToTurn?: (i: number) => void;
}) {
  const adds = entries.reduce(
    (n, e) =>
      n +
      (e.kind === "edit"
        ? Math.max(0, countLines(eitherNew(e.call)) - countLines(eitherOld(e.call)))
        : countLines(eitherNew(e.call))),
    0,
  );
  const dels = entries.reduce(
    (n, e) =>
      n +
      (e.kind === "edit" ? Math.max(0, countLines(eitherOld(e.call)) - countLines(eitherNew(e.call))) : 0),
    0,
  );
  return (
    <section id={`diff-file-${diffAnchorId(path)}`} data-diff-path={path} className="tb-diffgroup">
      <header className="tb-diffgroup-head">
        <button type="button" onClick={onToggle} className="tb-diffgroup-toggle tb-focus">
          {collapsed ? <ChevronDown size={13} strokeWidth={2} /> : <ChevronUp size={13} strokeWidth={2} />}
          <span className="tb-mono tb-diffgroup-path tb-truncate">{path}</span>
        </button>
        <Chip variant="subtle">
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
            <DiffEntryCard key={`${e.call.id}-${i}`} entry={e} onJumpToTurn={onJumpToTurn} flat />
          ))}
        </div>
      )}
    </section>
  );
}

function DiffEntryCard({
  entry,
  onJumpToTurn,
  flat,
}: {
  entry: DiffEntry;
  onJumpToTurn?: (i: number) => void;
  flat?: boolean;
}) {
  const { call, kind, turnIndex } = entry;
  const path = call.filePath ?? "(unknown)";
  const Icon = kind === "edit" ? Pencil : FilePlus2;

  return (
    <div className={cn("tb-diffcard", flat && "tb-diffcard-flat")}>
      <header className={cn("tb-diffcard-head", flat && "tb-diffcard-head-flat")}>
        <div className="tb-diffcard-id">
          <Icon size={12} strokeWidth={1.75} className="tb-toolicon-muted tb-shrink-0" />
          <span className="tb-mono tb-diffcard-label tb-truncate">{flat ? `turn ${turnIndex + 1}` : path}</span>
          {call.isError && <ErrorPill />}
        </div>
        <button type="button" onClick={() => onJumpToTurn?.(turnIndex)} className="tb-diffcard-jump tb-focus">
          Jump to turn →
        </button>
      </header>
      <div className="tb-diffcard-body">
        <DiffView
          oldText={kind === "edit" ? eitherOld(call) : ""}
          newText={kind === "edit" ? eitherNew(call) : (parseArgs<{ content?: string }>(call.arguments)?.content ?? "")}
          filePath={flat ? undefined : path}
          maxLines={kind === "edit" ? 120 : 200}
        />
      </div>
    </div>
  );
}

function eitherOld(call: ToolCallDetail): string {
  const args = parseArgs<{ old_string?: string; edits?: { old_string: string }[] }>(call.arguments);
  if (args?.edits?.length) return args.edits.map((e) => e.old_string).join("\n");
  return args?.old_string ?? "";
}
function eitherNew(call: ToolCallDetail): string {
  const args = parseArgs<{ new_string?: string; content?: string; edits?: { new_string: string }[] }>(call.arguments);
  if (args?.edits?.length) return args.edits.map((e) => e.new_string).join("\n");
  return args?.new_string ?? args?.content ?? "";
}
function countLines(s: string): number {
  return s ? s.split("\n").length : 0;
}

/** Sanitize a path into a safe DOM id fragment. */
export function diffAnchorId(path: string): string {
  return path.replace(/[^a-zA-Z0-9._-]+/g, "_");
}
