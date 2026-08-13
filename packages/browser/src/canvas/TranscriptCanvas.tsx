import { Fragment, forwardRef, useMemo } from "react";
import { CheckpointMarker, PhaseDivider } from "@peasant-labs/fairtrade/ui";
import { cn } from "../internal/cn.js";
import { TurnRow } from "./TurnRow.js";
import { EmptyState } from "./EmptyState.js";
import { phaseLabel } from "../lib/phase.js";
import { formatDuration } from "../lib/format-numbers.js";
import { formatRelative } from "../lib/time.js";
import { computeTasks, computeTurnLabels, type TaskGroup } from "../lib/tasks.js";
import type { AlignedTurnRow } from "../lib/turn-alignment.js";
import type {
  RenderTurnActions,
  RenderTurnPanel,
  TurnLabel,
  TurnLinkBuilder,
} from "./types.js";
import type { CommitVM, ToolCallVM, TurnVM } from "@peasant-labs/fairtrade/ui";
import type {
  TurnDetail,
  Harness,
} from "@peasant-labs/schema";
import type { Phase } from "../view-types.js";

export interface TranscriptCanvasProps {
  /** Turns to render (already filtered + deduped by the host, if desired). */
  turns: TurnDetail[];
  /**
   * Cooked tool calls keyed by turn index — the adapter's `ToolCallVM[]` per
   * turn (parsed once). Threaded to each `TurnRow` so the lifted
   * `TranscriptToolCall` renders from cooked fields and nothing here parses wire.
   */
  toolVMsByTurn?: Map<number, ToolCallVM[]>;
  /** Occurrence-aware rows aligned once at the SessionDetail boundary. */
  rows?: AlignedTurnRow[];
  /** Cooked turns from Fairtrade; supplied to the canonical card renderer. */
  turnVMsByTurn?: Map<number, TurnVM>;
  /** Harness — used to pick the assistant rail icon. */
  provider?: Harness;
  /** Optional phases — rendered as sticky inline dividers between turns. */
  phases?: Phase[];
  /** Active phase index (highlighted in the divider). */
  activePhaseIndex?: number;
  onPhaseClick?: (phase: Phase, index: number) => void;
  /** Commits in chronological order — rendered as inline checkpoint markers. */
  commits?: CommitVM[];
  /** Search highlighting. */
  searchQuery?: string;
  searchMatchIndices?: number[];
  activeMatchTurnIndex?: number;
  /** View options. */
  expandToolCalls?: boolean;
  hideThinking?: boolean;
  compact?: boolean;
  /** px offset for sticky phase dividers (account for a host sticky header). */
  phaseStickyTop?: number;
  className?: string;

  // --- Agnostic action contract (all optional; read-only when absent) ---
  /** Build the anchor href for a turn. Defaults to `#turn-{index}`. */
  linkBuilder?: TurnLinkBuilder;
  /** Host-owned per-turn action slot (e.g. a manual-label popover). */
  renderTurnActions?: RenderTurnActions;
  /**
   * Host-owned per-turn panel slot — a full-width block at the bottom of each
   * turn card body (below content + tool calls), for multi-row host content.
   */
  renderTurnPanel?: RenderTurnPanel;
  /** Saved/optimistic labels keyed by entry index (`turn.index`). */
  savedLabelsByEntry?: Map<number, TurnLabel[]>;
}

/**
 * Root list-view component. Renders a single vertical rail and a stream of
 * TurnRows; phase dividers and checkpoint markers are interleaved between turns
 * at the right positions.
 *
 * Data in via props only; actions out via the optional `linkBuilder` /
 * `renderTurnActions` slots. With none supplied the canvas is fully read-only.
 */
export const TranscriptCanvas = forwardRef<HTMLDivElement, TranscriptCanvasProps>(
  function TranscriptCanvas(
    {
      turns,
      toolVMsByTurn,
      rows,
      turnVMsByTurn,
      provider,
      phases = [],
      activePhaseIndex,
      onPhaseClick,
      commits = [],
      searchQuery,
      searchMatchIndices,
      activeMatchTurnIndex,
      expandToolCalls,
      hideThinking,
      compact,
      phaseStickyTop = 0,
      className,
      linkBuilder,
      renderTurnActions,
      renderTurnPanel,
      savedLabelsByEntry,
    },
    ref,
  ) {
    // Partition turns into phase sections. Each section is ONE containing block
    // holding its (sticky) PhaseDivider header + every turn in the phase, so the
    // browser pins the header for the whole phase and the next phase's header
    // pushes it out — native, perfectly synced, no JS scroll math. Positions not
    // covered by any phase form headerless free runs.
    const phaseSections = useMemo(() => {
      type Group = {
        key: number; // phase index, or -1 for a headerless run
        phase?: Phase;
        index?: number;
        from: number;
        to: number;
      };
      const groups: Group[] = [];
      if (turns.length === 0) return groups;
      let pi = 0;
      let cur: Group | null = null;
      for (let i = 0; i < turns.length; i++) {
        while (pi < phases.length && phases[pi]!.endTurn < i) pi++;
        const inPhase =
          pi < phases.length && i >= phases[pi]!.startTurn && i <= phases[pi]!.endTurn;
        const key = inPhase ? pi : -1;
        if (!cur || cur.key !== key) {
          cur = {
            key,
            phase: inPhase ? phases[pi] : undefined,
            index: inPhase ? pi : undefined,
            from: i,
            to: i,
          };
          groups.push(cur);
        } else {
          cur.to = i;
        }
      }
      return groups;
    }, [phases, turns]);

    // Commits → display position by timestamp: place the marker before the
    // first turn whose timestamp is >= commit time (or at the end).
    const commitsByPosition = useMemo(() => {
      const map = new Map<number, CommitVM[]>();
      if (commits.length === 0 || turns.length === 0) return map;
      const sortedCommits = [...commits].sort(
        (a, b) => (a.commitTime ?? 0) - (b.commitTime ?? 0),
      );
      const turnTimes = turns.map((t) => new Date(t.timestamp).getTime());
      for (const c of sortedCommits) {
        const ct = c.commitTime;
        if (ct == null) continue;
        let pos = turnTimes.findIndex((t) => t >= ct);
        if (pos === -1) pos = turns.length;
        const existing = map.get(pos) ?? [];
        existing.push(c);
        map.set(pos, existing);
      }
      return map;
    }, [commits, turns]);

    const matchSet = useMemo(
      () => (searchMatchIndices ? new Set(searchMatchIndices) : null),
      [searchMatchIndices],
    );

    // Task boundaries — a "user turn N" divider before EACH user prompt (the
    // canonical demo shows one per user turn, carrying that turn's own stats),
    // keyed by the display position it sits before.
    const taskByStart = useMemo(() => {
      const tasks = computeTasks(turns);
      const map = new Map<number, { task: TaskGroup; ordinal: number }>();
      tasks.forEach((task, i) => map.set(task.startIndex, { task, ordinal: i + 1 }));
      return map;
    }, [turns]);

    const turnLabels = useMemo(() => computeTurnLabels(turns), [turns]);

    if (turns.length === 0) {
      return (
        <div ref={ref} className={cn("tb-root tb-canvas", className)}>
          <EmptyState />
        </div>
      );
    }

    return (
      <div ref={ref} className={cn("tb-root tb-canvas", className)}>
        <div className="tb-canvas-rail" aria-hidden />

        {phaseSections.map((g) => {
          const renderedRows = [];
          for (let i = g.from; i <= g.to; i++) {
            const turn = turns[i]!;
            const alignedRow = rows?.[i];
            const commitsAt = commitsByPosition.get(i);
            const taskAt = taskByStart.get(i);
            renderedRows.push(
              <div key={alignedRow?.key ?? turn.index}>
                {taskAt && (
                  <div className="txn-taskboundary">
                    <span className="txn-tb-chip">user turn {taskAt.ordinal}</span>
                    <span className="txn-tb-meta tnum">
                      {[
                        taskAt.task.durationMs > 0 ? formatDuration(taskAt.task.durationMs) : null,
                        `${taskAt.task.toolCallCount} tools`,
                        `${taskAt.task.filesTouched.length} files`,
                        taskAt.task.insertions > 0 || taskAt.task.deletions > 0
                          ? `+${taskAt.task.insertions} −${taskAt.task.deletions}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                )}
                {commitsAt?.map((c) => (
                  <CheckpointMarker
                    key={`${c.hash}-${i}`}
                    hash={c.hash}
                    message={c.message}
                    time={c.commitTime == null ? "" : formatRelative(new Date(c.commitTime).toISOString())}
                    files={c.files ?? 0}
                    ins={c.adds ?? 0}
                    del={c.dels ?? 0}
                  />
                ))}
                <TurnRow
                  turn={turn}
                  row={alignedRow}
                  turnNumber={turnLabels[i] ?? `${i + 1}`}
                  provider={provider}
                  toolVMs={alignedRow ? alignedRow.toolVMs ?? undefined : toolVMsByTurn?.get(turn.index)}
                  cookedTurn={alignedRow ? alignedRow.cooked ?? undefined : turnVMsByTurn?.get(turn.index)}
                  searchQuery={searchQuery}
                  isActiveMatch={turn.index === activeMatchTurnIndex}
                  isSearchMatch={matchSet?.has(i)}
                  expandToolCalls={expandToolCalls}
                  hideThinking={hideThinking}
                  compact={compact}
                  linkBuilder={linkBuilder}
                  renderActions={renderTurnActions}
                  renderPanel={renderTurnPanel}
                  savedLabels={savedLabelsByEntry?.get(turn.index)}
                />
              </div>,
            );
          }

          if (!g.phase || g.index == null) {
            return <Fragment key={`free-${g.from}`}>{renderedRows}</Fragment>;
          }

          return (
            <section key={`phase-${g.index}-${g.from}`} style={{ position: "relative" }}>
              <PhaseDivider
                label={phaseLabel(g.phase.type)}
                range={`turns ${g.from + 1}–${g.to + 1}`}
                active={g.index === activePhaseIndex}
                onClick={() => onPhaseClick?.(g.phase!, g.index!)}
                stickyTop={`${phaseStickyTop}px`}
              />
              {renderedRows}
            </section>
          );
        })}

        {commitsByPosition.get(turns.length)?.map((c, i) => (
          <CheckpointMarker
            key={`tail-${c.hash}-${i}`}
            hash={c.hash}
            message={c.message}
            time={c.commitTime == null ? "" : formatRelative(new Date(c.commitTime).toISOString())}
            files={c.files ?? 0}
            ins={c.adds ?? 0}
            del={c.dels ?? 0}
          />
        ))}
      </div>
    );
  },
);
