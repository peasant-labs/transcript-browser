import { describe, it, expect } from "vitest";
import {
  SessionDetail,
  TrajectoryGraph,
  annotateTranscript,
  computePersonalMedians,
  computeTasks,
  buildTaskWaterfall,
  nextNavTurn,
  prefilterTurns,
  summarizePrompt,
  OutcomeChip,
  formatRelative,
  type TurnLabel,
  type TaskGroup,
} from "./index.js";
import type { TurnDetail } from "@peasant-labs/types";

/**
 * The peasant back-compat surface. peasant's web app imports these 13 symbols
 * from `@peasant-labs/transcript-browser` across SessionDetailV2 / StepsWaterfall
 * / SessionPicker / MapRail / scopeTurns / turnNav.test / waterfall.test.
 *
 * The adopt-fairtrade migration consolidated several of them into the one
 * fairtrade analytics util + adapter (re-exported here via thin typed wrappers
 * that keep the `@peasant-labs/types` input signatures). This test pins that the
 * names still resolve AND keep their back-compat shapes, so peasant compiles +
 * runs unchanged against the published package — the slice's "peasant's import
 * sites still resolve" acceptance, asserted at runtime against the production
 * barrel (`./index.js`), not a test-only export.
 */
describe("peasant back-compat export surface (13 symbols)", () => {
  it("exposes every runtime value peasant imports", () => {
    const values: Record<string, unknown> = {
      SessionDetail,
      TrajectoryGraph,
      OutcomeChip,
      annotateTranscript,
      computePersonalMedians,
      computeTasks,
      buildTaskWaterfall,
      nextNavTurn,
      prefilterTurns,
      summarizePrompt,
      formatRelative,
    };
    for (const [name, value] of Object.entries(values)) {
      expect(typeof value, `${name} must stay exported`).toBe("function");
    }
  });

  it("the consolidated transform wrappers delegate to fairtrade and keep their shapes", () => {
    const turns: TurnDetail[] = [
      { index: 0, role: "user", content: "add a feature", timestamp: "2026-01-01T00:00:00Z" },
      {
        index: 1,
        role: "assistant",
        content: "on it",
        timestamp: "2026-01-01T00:02:00Z",
        toolCalls: [
          {
            id: "tc1",
            name: "Edit",
            // a real wire arguments JSON string — the wrapper delegates parsing
            // to the fairtrade adapter primitives, so this must NOT throw here.
            arguments: JSON.stringify({ file_path: "a.ts", old_string: "x", new_string: "x\ny" }),
            result: "",
          },
        ],
      },
    ];

    // prefilterTurns: same two-pass noise filter + dedup; returns TurnDetail[].
    expect(prefilterTurns(turns)).toHaveLength(2);

    // computeTasks -> the canonical TaskGroup peasant's StepsWaterfall reads.
    const tasks: TaskGroup[] = computeTasks(turns);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ startIndex: 0, toolCallCount: 1 });
    expect(typeof tasks[0]!.durationMs).toBe("number");
    expect(Array.isArray(tasks[0]!.filesTouched)).toBe(true);

    // buildTaskWaterfall -> proportional lane segments keyed by prompt entry.
    const lanes = buildTaskWaterfall(tasks);
    expect(lanes[0]).toHaveProperty("widthPct");
    expect(lanes[0]).toHaveProperty("promptEntryIndex");

    // annotateTranscript -> TranscriptAnnotation[] (delegated; no throw on args).
    expect(Array.isArray(annotateTranscript(turns))).toBe(true);

    // computePersonalMedians -> PersonalMedians, degrading to {} with no sample.
    expect(computePersonalMedians(undefined)).toEqual({});

    // pure label/link helpers peasant uses (kept TB-local).
    expect(typeof summarizePrompt("hello world goodbye", 8)).toBe("string");
    expect(typeof formatRelative(new Date().toISOString())).toBe("string");
  });

  it("the type-only symbols resolve (compile-time back-compat)", () => {
    // TurnLabel + TaskGroup are imported as types above; constructing a value
    // typed as TurnLabel fails the build if peasant's expected shape drifted.
    const label: TurnLabel = {
      entryIndex: 3,
      typeId: "friction",
      typeName: "Friction",
      value: "retry",
      id: "",
    };
    expect(label.entryIndex).toBe(3);
  });
});
