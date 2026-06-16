import type { TaskGroup } from "./tasks.js";

/**
 * Steps waterfall (peasant roadmap 5.2): turn the tasks of a session into a
 * proportional duration lane — "what happened, in what order, how long". Each
 * task becomes a horizontal segment whose width is its share of the total work
 * time and whose offset is the cumulative work before it (segments tile the lane
 * back-to-back, so idle gaps between tasks are compressed out — this is a
 * relative-duration lane, not a wall-clock Gantt).
 *
 * Pure function of its input (no clock/random), so the host can unit-test the
 * geometry without a DOM. When the total duration is 0 (untimed transcript),
 * every segment is zero-width at offset 0 — the caller renders the task list
 * without bars rather than dividing by zero.
 */
export interface WaterfallSegment {
  /** Entry index of the task's user prompt (anchor + key). */
  promptEntryIndex: number;
  /** Cumulative share of total duration BEFORE this task, 0..100. */
  offsetPct: number;
  /** This task's share of total duration, 0..100. */
  widthPct: number;
  /** Wall-clock duration of the task in ms (clamped to >= 0). */
  durationMs: number;
}

export function buildTaskWaterfall(tasks: TaskGroup[]): WaterfallSegment[] {
  const total = tasks.reduce((s, t) => s + Math.max(0, t.durationMs), 0);
  let acc = 0;
  return tasks.map((t) => {
    const d = Math.max(0, t.durationMs);
    const offsetPct = total > 0 ? (acc / total) * 100 : 0;
    const widthPct = total > 0 ? (d / total) * 100 : 0;
    acc += d;
    return { promptEntryIndex: t.promptEntryIndex, offsetPct, widthPct, durationMs: d };
  });
}
