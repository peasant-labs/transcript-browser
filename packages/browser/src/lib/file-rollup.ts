import type { ToolCallVM } from "@peasant-labs/fairtrade/ui";

/**
 * Per-file rollup of all tool activity in a session. Used by both the Diffs and
 * Files outlines — same data, sorted/filtered differently.
 *
 * Reads the cooked tool calls (the adapter's `ToolCallVM`: resolved `filePath`,
 * computed `adds`/`dels`) plus the wire tool `name` for read/edit/write/delete
 * classification — so it never parses wire. The richer turn-index anchors
 * (`firstEditTurnIndex`/`lastTurnIndex`) the outlines jump to are not on the
 * cooked `FileEntryVM`, so this TB-owned rollup keeps them.
 */
export interface FileRollup {
  path: string;
  reads: number;
  edits: number;
  writes: number;
  deletes: number;
  insertions: number;
  deletions: number;
  /** Index of the first turn that mentioned this file. */
  firstTurnIndex: number;
  /** Index of the most recent turn that touched this file. */
  lastTurnIndex: number;
  /**
   * Index of the first turn that EDITED or WROTE this file. Undefined for
   * read-only files. Used by the Diffs outline as the jump target.
   */
  firstEditTurnIndex?: number;
}

/**
 * Roll up cooked tool calls (keyed by turn index, in turn order) into one entry
 * per unique file path. Identical extraction rules to FilesView / DiffsView so
 * the rail stays in lockstep with the main content.
 */
export function rollupFiles(toolVMsByTurn: Map<number, ToolCallVM[]>): FileRollup[] {
  const map = new Map<string, FileRollup>();
  for (const [turnIndex, toolCalls] of toolVMsByTurn) {
    for (const c of toolCalls) {
      const path = c.filePath;
      if (!path) continue;
      const e =
        map.get(path) ??
        {
          path,
          reads: 0,
          edits: 0,
          writes: 0,
          deletes: 0,
          insertions: 0,
          deletions: 0,
          firstTurnIndex: turnIndex,
          lastTurnIndex: turnIndex,
          firstEditTurnIndex: undefined,
        };
      e.lastTurnIndex = turnIndex;
      const n = c.name.toLowerCase();
      if (n === "read" || n === "notebookread") {
        e.reads++;
      } else if (n === "edit" || n === "multiedit" || n === "notebookedit") {
        e.edits++;
        e.insertions += c.adds ?? 0;
        e.deletions += c.dels ?? 0;
        if (e.firstEditTurnIndex === undefined) e.firstEditTurnIndex = turnIndex;
      } else if (n === "write") {
        e.writes++;
        e.insertions += c.adds ?? 0;
        if (e.firstEditTurnIndex === undefined) e.firstEditTurnIndex = turnIndex;
      } else if (n === "delete" || n === "remove") {
        e.deletes++;
      }
      map.set(path, e);
    }
  }
  return Array.from(map.values());
}
