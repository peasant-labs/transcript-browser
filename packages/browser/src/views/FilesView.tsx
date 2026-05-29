import { useMemo, useState, type ReactNode } from "react";
import { ArrowUpDown, ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "../internal/cn.js";
import { parseArgs } from "../canvas/tool-renderers/types.js";
import type { TurnDetail, ToolCallDetail } from "@peasant-labs/types";

export interface FilesViewProps {
  turns: TurnDetail[];
  /** Absolute path of the project root, used to trim paths to project-relative form. */
  projectRoot?: string;
  /** Fallback jump — fires when the file has no edits, with the last turn that touched it. */
  onJumpToTurn?: (turnIndex: number) => void;
  /**
   * Preferred jump — fires when the file has edits. Hosts should switch to the
   * Diffs view and scroll to `#diff-file-{diffAnchorId(path)}`.
   */
  onJumpToFile?: (path: string, lastTurnIndex: number) => void;
}

interface FileEntry {
  path: string;
  reads: number;
  writes: number;
  edits: number;
  deletes: number;
  lastTurnIndex: number;
  insertions: number;
  deletions: number;
}

/**
 * Files-touched index. One row per unique file path with action counts, +/−
 * line totals, and a "last touched" anchor. Sortable by path or churn. Ported
 * from peasant's `views/FilesView.tsx`.
 */
export function FilesView({ turns, projectRoot, onJumpToTurn, onJumpToFile }: FilesViewProps) {
  const entries = useMemo<FileEntry[]>(() => {
    const map = new Map<string, FileEntry>();
    for (const turn of turns) {
      for (const c of turn.toolCalls ?? []) {
        const path = c.filePath ?? extractPath(c);
        if (!path) continue;
        const e =
          map.get(path) ??
          {
            path,
            reads: 0,
            writes: 0,
            edits: 0,
            deletes: 0,
            lastTurnIndex: turn.index,
            insertions: 0,
            deletions: 0,
          };
        e.lastTurnIndex = turn.index;
        const n = c.name.toLowerCase();
        if (n === "read" || n === "notebookread") e.reads++;
        else if (n === "edit" || n === "multiedit" || n === "notebookedit") {
          e.edits++;
          const { adds, dels } = countDiff(c);
          e.insertions += adds;
          e.deletions += dels;
        } else if (n === "write") {
          e.writes++;
          const args = parseArgs<{ content?: string }>(c.arguments);
          e.insertions += args?.content ? args.content.split("\n").length : 0;
        } else if (n === "delete" || n === "remove") {
          e.deletes++;
        }
        map.set(path, e);
      }
    }
    return Array.from(map.values());
  }, [turns]);

  type SortKey = "path" | "churn";
  const [sortKey, setSortKey] = useState<SortKey>("path");
  const [asc, setAsc] = useState(true);

  const sorted = useMemo(() => {
    const arr = [...entries];
    arr.sort((a, b) => {
      let d = 0;
      switch (sortKey) {
        case "path":
          d = a.path.localeCompare(b.path);
          break;
        case "churn":
          d = a.insertions + a.deletions - (b.insertions + b.deletions);
          break;
      }
      return asc ? d : -d;
    });
    return arr;
  }, [entries, sortKey, asc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(key === "path");
    }
  }

  if (entries.length === 0) {
    return <div className="tb-view-empty">No file activity recorded yet.</div>;
  }

  return (
    <div className="tb-filesview">
      <table className="tb-filesview-table">
        <thead>
          <tr className="tb-filesview-thead">
            <Th onClick={() => toggleSort("path")} active={sortKey === "path"} asc={asc}>
              File
            </Th>
            <Th onClick={() => toggleSort("churn")} active={sortKey === "churn"} asc={asc} numeric>
              Lines +/−
            </Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((e) => {
            const hasEdits = e.edits + e.writes > 0;
            const readOnly = !hasEdits;
            return (
              <tr
                key={e.path}
                data-anchor-turn={e.lastTurnIndex}
                data-anchor-path={e.path}
                onClick={() => {
                  if (hasEdits && onJumpToFile) onJumpToFile(e.path, e.lastTurnIndex);
                  else if (onJumpToTurn) onJumpToTurn(e.lastTurnIndex);
                }}
                title={hasEdits ? "Open diffs for this file" : "Jump to the turn that last read this file"}
                className="tb-filesview-row"
              >
                <td className="tb-filesview-path tb-mono tb-truncate" title={e.path}>
                  {relativeToProject(e.path, projectRoot)}
                </td>
                <td className="tb-filesview-churn tb-mono tb-tnum">
                  {readOnly ? (
                    <span className="tb-ink-faint" title="Read-only — no changes made">
                      —
                    </span>
                  ) : (
                    <>
                      <span className="tb-ink-positive">+{e.insertions}</span>
                      <span className="tb-hl-sep">/</span>
                      <span className="tb-ink-danger">−{e.deletions}</span>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  onClick,
  active,
  asc,
  numeric,
}: {
  children: ReactNode;
  onClick: () => void;
  active: boolean;
  asc: boolean;
  numeric?: boolean;
}) {
  return (
    <th onClick={onClick} className={cn("tb-filesview-th tb-eyebrow tb-focus", numeric && "tb-filesview-th-num")}>
      <span className="tb-filesview-th-inner">
        {children}
        {active ? (
          asc ? (
            <ArrowUp size={10} strokeWidth={2} />
          ) : (
            <ArrowDown size={10} strokeWidth={2} />
          )
        ) : (
          <ArrowUpDown size={10} strokeWidth={2} className="tb-filesview-th-icon" />
        )}
      </span>
    </th>
  );
}

/**
 * Strips the project root prefix so only the project-relative portion shows.
 * Falls back to the last two path segments when outside the project root.
 */
function relativeToProject(path: string, projectRoot: string | undefined): string {
  if (projectRoot) {
    const root = projectRoot.endsWith("/") ? projectRoot : projectRoot + "/";
    if (path.startsWith(root)) return path.slice(root.length);
    if (path === projectRoot) return path;
  }
  const parts = path.split("/").filter(Boolean);
  if (parts.length >= 2) {
    return `…/${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
  }
  return path;
}

function extractPath(call: ToolCallDetail): string | undefined {
  const args = parseArgs<{ file_path?: string; path?: string }>(call.arguments);
  return args?.file_path ?? args?.path;
}

function countDiff(call: ToolCallDetail): { adds: number; dels: number } {
  const args = parseArgs<{
    old_string?: string;
    new_string?: string;
    edits?: { old_string: string; new_string: string }[];
  }>(call.arguments);
  let adds = 0;
  let dels = 0;
  const pairs = args?.edits?.length
    ? args.edits
    : [{ old_string: args?.old_string ?? "", new_string: args?.new_string ?? "" }];
  for (const p of pairs) {
    const a = (p.new_string ?? "").split("\n").length;
    const b = (p.old_string ?? "").split("\n").length;
    if (a > b) adds += a - b;
    if (b > a) dels += b - a;
  }
  return { adds, dels };
}
