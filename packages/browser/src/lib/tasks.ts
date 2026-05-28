import type { TurnDetail, ToolCallDetail } from "@peasant-labs/types";
import { parseArgs } from "../canvas/tool-renderers/types.js";

/**
 * A "task" is a span from a user prompt up to (but not including) the next
 * user prompt. It captures one turn of human↔agent collaboration end to end:
 * the request, the reasoning, the tool work, and the final response.
 *
 * Ported verbatim from peasant's `session-detail/v2/lib/tasks.ts`. Pure data
 * transform — no framework or app coupling.
 */
export interface TaskGroup {
  /** Display position of the user prompt that starts the task. */
  startIndex: number;
  /** Display position of the last turn before the next prompt (inclusive). */
  endIndex: number;
  /** Underlying entry index of the user prompt — used for anchor links. */
  promptEntryIndex: number;
  /** Underlying entry index of the final assistant turn, when present. */
  finalEntryIndex?: number;
  /** The user prompt content (untruncated). */
  prompt: string;
  /** Total tool calls across all turns in this task. */
  toolCallCount: number;
  /** Unique files touched (Read / Edit / Write / Delete). */
  filesTouched: string[];
  /** Lines inserted in this task across Edit/Write tool calls. */
  insertions: number;
  /** Lines removed in this task across Edit tool calls. */
  deletions: number;
  /** Wall-clock duration from first to last turn timestamp, in ms. */
  durationMs: number;
  /** True if any tool call failed in this task. */
  hasErrors: boolean;
  /** Total tokens spent in this task (in + out). */
  tokens: number;
}

/**
 * Split a turn list into task groups. Each user turn starts a new task;
 * the task ends right before the next user turn (or at the end of the run).
 */
export function computeTasks(turns: TurnDetail[]): TaskGroup[] {
  if (turns.length === 0) return [];

  const userBoundaries: number[] = [];
  for (let i = 0; i < turns.length; i++) {
    const t = turns[i]!;
    if (t.role === "user" && t.content?.trim()) {
      userBoundaries.push(i);
    }
  }
  // Sessions that start without a user message (autonomous agent run) are
  // treated as a single task spanning everything.
  if (userBoundaries.length === 0 || userBoundaries[0] !== 0) {
    userBoundaries.unshift(0);
  }

  const tasks: TaskGroup[] = [];
  for (let i = 0; i < userBoundaries.length; i++) {
    const start = userBoundaries[i]!;
    const end =
      (i + 1 < userBoundaries.length ? userBoundaries[i + 1]! : turns.length) - 1;
    tasks.push(summarize(turns, start, end));
  }
  return tasks;
}

function summarize(turns: TurnDetail[], start: number, end: number): TaskGroup {
  const startTurn = turns[start]!;
  let toolCallCount = 0;
  const files = new Set<string>();
  let insertions = 0;
  let deletions = 0;
  let hasErrors = false;
  let tokens = 0;
  let finalEntryIndex: number | undefined;

  for (let i = start; i <= end; i++) {
    const t = turns[i]!;
    tokens += (t.tokensIn ?? 0) + (t.tokensOut ?? 0);
    if (t.role === "assistant" && (t.depth ?? 0) === 0) finalEntryIndex = t.index;
    for (const c of t.toolCalls ?? []) {
      toolCallCount++;
      if (c.isError) hasErrors = true;
      const path = c.filePath ?? extractPath(c);
      if (path) files.add(path);
      const { adds, dels } = countDiff(c);
      insertions += adds;
      deletions += dels;
    }
  }

  const startTs = new Date(startTurn.timestamp).getTime();
  const endTs = new Date(turns[end]!.timestamp).getTime();
  const durationMs =
    isFinite(startTs) && isFinite(endTs) ? Math.max(0, endTs - startTs) : 0;

  return {
    startIndex: start,
    endIndex: end,
    promptEntryIndex: startTurn.index,
    finalEntryIndex,
    prompt: startTurn.content ?? "",
    toolCallCount,
    filesTouched: Array.from(files),
    insertions,
    deletions,
    durationMs,
    hasErrors,
    tokens,
  };
}

/**
 * For a list of turns (display order), return a parallel array of
 * human-readable labels of the form `{taskOrdinal}` for the user prompt that
 * starts a task, and `{taskOrdinal}{letter}` (e.g. `3a`, `3b`) for the
 * assistant / tool follow-ups within the same task.
 */
export function computeTurnLabels(turns: TurnDetail[]): string[] {
  if (turns.length === 0) return [];
  const tasks = computeTasks(turns);
  const taskByPos = new Map<number, number>();
  for (let i = 0; i < tasks.length; i++) {
    taskByPos.set(tasks[i]!.startIndex, i + 1);
  }

  const labels = new Array<string>(turns.length);
  let currentTask = 0;
  let subIndex = 0; // 0 -> the user prompt itself (no letter); >0 -> 'a', 'b', ...
  for (let i = 0; i < turns.length; i++) {
    const startedTask = taskByPos.get(i);
    if (startedTask !== undefined) {
      currentTask = startedTask;
      subIndex = 0;
      labels[i] = `${currentTask}`;
    } else if (currentTask === 0) {
      labels[i] = `${i + 1}`;
    } else {
      subIndex += 1;
      labels[i] = `${currentTask}${letterFor(subIndex)}`;
    }
  }
  return labels;
}

/** 1 -> 'a', 2 -> 'b' ... 27 -> 'aa' (rare but handled). */
function letterFor(n: number): string {
  let out = "";
  let x = n;
  while (x > 0) {
    const r = (x - 1) % 26;
    out = String.fromCharCode(97 + r) + out;
    x = Math.floor((x - 1) / 26);
  }
  return out;
}

function extractPath(call: ToolCallDetail): string | undefined {
  const args = parseArgs<{ file_path?: string; path?: string }>(call.arguments);
  return args?.file_path ?? args?.path;
}

function countDiff(call: ToolCallDetail): { adds: number; dels: number } {
  const n = call.name.toLowerCase();
  if (n === "write") {
    const args = parseArgs<{ content?: string }>(call.arguments);
    return { adds: args?.content ? args.content.split("\n").length : 0, dels: 0 };
  }
  if (n === "edit" || n === "multiedit" || n === "notebookedit") {
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
  return { adds: 0, dels: 0 };
}
