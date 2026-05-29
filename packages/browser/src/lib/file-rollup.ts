import type { TurnDetail, ToolCallDetail } from "@peasant-labs/types";
import { parseArgs } from "../canvas/tool-renderers/types.js";

/**
 * Per-file rollup of all tool activity in a session. Used by both the Diffs and
 * Files outlines (and views) — same data, just sorted differently. Ported
 * verbatim from peasant's `rails/file-rollup.ts`. Pure.
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
 * Walk every turn's tool calls and produce one rollup per unique file path.
 * Identical extraction rules to FilesView / DiffsView so the rail stays in
 * lockstep with the main content.
 */
export function rollupFiles(turns: TurnDetail[]): FileRollup[] {
  const map = new Map<string, FileRollup>();
  for (const turn of turns) {
    for (const c of turn.toolCalls ?? []) {
      const path = c.filePath ?? extractPath(c);
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
          firstTurnIndex: turn.index,
          lastTurnIndex: turn.index,
          firstEditTurnIndex: undefined,
        };
      e.lastTurnIndex = turn.index;
      const n = c.name.toLowerCase();
      if (n === "read" || n === "notebookread") {
        e.reads++;
      } else if (n === "edit" || n === "multiedit" || n === "notebookedit") {
        e.edits++;
        const { adds, dels } = countDiff(c);
        e.insertions += adds;
        e.deletions += dels;
        if (e.firstEditTurnIndex === undefined) e.firstEditTurnIndex = turn.index;
      } else if (n === "write") {
        e.writes++;
        const args = parseArgs<{ content?: string }>(c.arguments);
        e.insertions += args?.content ? args.content.split("\n").length : 0;
        if (e.firstEditTurnIndex === undefined) e.firstEditTurnIndex = turn.index;
      } else if (n === "delete" || n === "remove") {
        e.deletes++;
      }
      map.set(path, e);
    }
  }
  return Array.from(map.values());
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
