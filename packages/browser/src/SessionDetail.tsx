import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "./internal/cn.js";
import { SessionHero } from "./header/SessionHero.js";
import { TabStrip } from "./header/TabStrip.js";
import { StickyHeader } from "./header/StickyHeader.js";
import { TurnContextBar } from "./header/TurnContextBar.js";
import { useTriggerOffscreen } from "./header/useTriggerOffscreen.js";
import { useTurnKeyboardNav } from "./lib/turnNav.js";
import type { BreadcrumbItem } from "./header/Breadcrumb.js";
import { TranscriptCanvas } from "./canvas/TranscriptCanvas.js";
import { ViewModeToggle, type TrajectoryMode } from "./canvas/ViewModeToggle.js";
import { RightRail, RailColumn } from "./rails/RightRail.js";
import { HighlightsView } from "./views/HighlightsView.js";
import { DiffsView, diffAnchorId } from "./views/DiffsView.js";
import { FilesView } from "./views/FilesView.js";
import { AnnotationsView } from "./views/AnnotationsView.js";
import {
  applyFilter,
  computeCounts,
  emptyFilterState,
  defaultViewOptions,
  type V2FilterState,
  type V2ViewOptions,
} from "./rails/filter-types.js";
import { SearchBar, useSearchHotkey } from "./overlays/SearchBar.js";
import { ProgressIndicator } from "./overlays/ProgressIndicator.js";
import { SessionTab, type SessionTabDef } from "./session-detail-types.js";
import type { TranscriptAnnotation } from "./lib/pattern-detection.js";
import type { PersonalMedians } from "./lib/scorecard.js";
import { prefilterTurns } from "./lib/turn-filter.js";
import type {
  RenderTurnActions,
  RenderTurnPanel,
  TurnLabel,
  TurnLinkBuilder,
  ViewerCallbacks,
  ViewerCapabilities,
} from "./canvas/types.js";
import type {
  SessionDetailPayload,
  TurnDetail,
  SessionCommit,
  Phase,
  SessionScorecard as SessionScorecardData,
} from "@peasant-labs/types";

export interface SessionDetailProps {
  /** The full transcript payload. Brought in by the host (REST, WS, static). */
  detail: SessionDetailPayload;

  /**
   * Pre-filtered + deduped turns to render. Optional — when omitted, the
   * composer applies `prefilterTurns` (exported) to `detail.turns`. Hosts that
   * pass their own scoped list can call `prefilterTurns` first to hide the
   * same noise turns the whole-session view hides.
   */
  turns?: TurnDetail[];

  /**
   * Phases (sticky section dividers + Highlights). Host runs phase detection
   * and passes the result; the viewer only renders. Defaults to `[]`.
   */
  phases?: Phase[];

  /**
   * Pattern-detected annotations (errors/retries/reverts/subagents). Host calls
   * the exported `annotateTranscript(turns)` and passes the result; the viewer
   * never derives them implicitly. Defaults to `[]`.
   */
  annotations?: TranscriptAnnotation[];

  /** Breadcrumb items for the hero (host supplies fully-formed hrefs). */
  breadcrumb?: BreadcrumbItem[];

  /** Optional scorecard data; defaults to `detail.scorecard`. `null` hides it. */
  scorecard?: SessionScorecardData | null;
  /** Optional personal medians for the scorecard comparison line. */
  scorecardMedians?: PersonalMedians;

  /** Initial tab. Defaults to the full trace. */
  initialTab?: SessionTab;
  /**
   * Deep-link target: a turn `index` to scroll to once on mount. Hosts whose
   * permalink shape isn't the default `#turn-<index>` hash (e.g. a `?turn=N`
   * query param) read it themselves and pass it here, so "open this link → land
   * on that message" works regardless of link shape. The built-in `#turn-<index>`
   * hash is handled automatically and needs no prop.
   */
  initialTurnIndex?: number;
  /** Initial trajectory mode (list vs graph). Defaults to `"list"`. */
  initialTrajectoryMode?: TrajectoryMode;

  /**
   * Render-prop for the trajectory graph view. The graph carries the
   * `@xyflow/react` peer dependency, so the composer does NOT import it
   * directly — pass `(props) => <TrajectoryGraph {...props} />` to enable the
   * Graph toggle. When omitted, the trace shows only the list view.
   */
  renderGraph?: (props: {
    turns: TurnDetail[];
    filteredTurns: TurnDetail[];
    phases: Phase[];
    annotations: TranscriptAnnotation[];
    searchMatches: number[];
    searchQuery?: string;
    activeMatchIndex?: number;
    onPhaseActivate: (i: number) => void;
    onViewportChange: (range: { start: number; end: number }) => void;
    provider: SessionDetailPayload["harness"];
  }) => ReactNode;

  /** px offset for the sticky header (host app navbar height). Defaults to 0. */
  stickyTop?: number;

  /**
   * Rail layout (opt-in). `"tabs"` (default) keeps the single tabbed right rail.
   * `"split"` flanks the transcript with the rail's two panels as side columns —
   * the outline to the left, filters to the right — so neither is hidden behind a
   * tab. Both columns share the tabbed rail's bodies, so they never drift.
   */
  railLayout?: "tabs" | "split";

  /** Optional error banner text. */
  error?: string;

  // --- Agnostic action contract (all optional; read-only when absent) ---
  capabilities?: ViewerCapabilities;
  callbacks?: ViewerCallbacks;
  /** Per-turn anchor href builder (canvas). Defaults to `#turn-{index}`. */
  linkBuilder?: TurnLinkBuilder;
  /** Session-level share link builder (ActionMenu copy-link). */
  sessionLinkBuilder?: (detail: SessionDetailPayload) => string;
  /** Host-owned per-turn action slot (e.g. a manual-label popover). */
  renderTurnActions?: RenderTurnActions;
  /**
   * Host-owned per-turn PANEL slot. Where `renderTurnActions` is a compact
   * header-inline actions row, this renders as a full-width block at the
   * bottom of the turn card body — below the content and tool-call list — so
   * it suits multi-row host content (e.g. a per-turn touched-files list).
   * Applies to the Trace list view. Return `null` to skip a turn.
   */
  renderTurnPanel?: RenderTurnPanel;
  /** Saved/optimistic labels keyed by entry index. */
  savedLabelsByEntry?: Map<number, TurnLabel[]>;
  /** ActionMenu labels. */
  shareLabel?: string;
  contributeLabel?: string;

  className?: string;
}

const STICKY_PAD = 24;

/**
 * Top-level session-detail composer. Assembles the header (hero, sticky header,
 * tab strip, turn-context bar), the center content (canvas / graph / per-tab
 * views), and the right rail (outline + filters) from props and callbacks. This
 * is the single component both apps mount.
 *
 * It owns only *view* state (active tab, trajectory mode, filters, search,
 * scroll tracking, sticky-header visibility) — never data. All data flows IN
 * via props; all actions flow OUT via the `callbacks` / `linkBuilder` /
 * `renderTurnActions` contract; theming is via `--tb-*`. There is no fetching,
 * no router, no env access, and no app-specific string anywhere below.
 */
export function SessionDetail({
  detail,
  turns: turnsProp,
  phases = [],
  annotations = [],
  breadcrumb = [],
  scorecard,
  scorecardMedians,
  initialTab = SessionTab.Trace,
  initialTurnIndex,
  initialTrajectoryMode = "list",
  renderGraph,
  stickyTop = 0,
  railLayout = "tabs",
  error,
  capabilities,
  callbacks,
  linkBuilder,
  sessionLinkBuilder,
  renderTurnActions,
  renderTurnPanel,
  savedLabelsByEntry,
  shareLabel,
  contributeLabel,
  className,
}: SessionDetailProps) {
  // -------------------------------------------------------------------------
  // Derived: turn list (host may pass a pre-filtered list; else dedup here)
  // -------------------------------------------------------------------------
  const turns = useMemo<TurnDetail[]>(
    () => turnsProp ?? prefilterTurns(detail.turns ?? []),
    [turnsProp, detail.turns],
  );

  // The wire-level harness id IS the viewer's provider key (icons, graph,
  // downloads all read it); aliased once so the surfaces below share one source.
  const provider = detail.harness;

  const annotationsByTurn = useMemo(() => {
    const map = new Map<number, { type: string }[]>();
    for (const a of annotations) {
      const arr = map.get(a.turnIndex) ?? [];
      arr.push(a);
      map.set(a.turnIndex, arr);
    }
    return map;
  }, [annotations]);

  // -------------------------------------------------------------------------
  // View state
  // -------------------------------------------------------------------------
  const [filters, setFilters] = useState<V2FilterState>(() => emptyFilterState());
  const [viewOptions, setViewOptions] = useState<V2ViewOptions>(() => defaultViewOptions());
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<"all" | string>("all");
  const [activeTab, setActiveTab] = useState<SessionTab>(initialTab);
  const [trajectoryMode, setTrajectoryMode] = useState<TrajectoryMode>(initialTrajectoryMode);
  const [rightRailCollapsed, setRightRailCollapsed] = useState(false);
  // Split layout: each flanking column collapses independently of the other.
  const [outlineColCollapsed, setOutlineColCollapsed] = useState(false);
  const [filtersColCollapsed, setFiltersColCollapsed] = useState(false);

  const counts = useMemo(() => computeCounts(turns, annotationsByTurn), [turns, annotationsByTurn]);

  const distinctFileCount = useMemo(() => {
    const set = new Set<string>();
    for (const t of turns) {
      for (const c of t.toolCalls ?? []) {
        let path: string | undefined = c.filePath ?? undefined;
        if (!path) {
          try {
            const args = JSON.parse(c.arguments) as { file_path?: string; path?: string };
            path = args?.file_path ?? args?.path;
          } catch {
            /* ignore non-JSON args */
          }
        }
        if (path) set.add(path);
      }
    }
    return set.size;
  }, [turns]);

  const filteredTurns = useMemo(
    () => turns.filter((t) => applyFilter(t, filters, annotationsByTurn)),
    [turns, filters, annotationsByTurn],
  );

  const filteredPhases = useMemo(() => {
    if (filteredTurns.length === turns.length) return phases;
    const set = new Set(filteredTurns);
    return phases.filter((p) => {
      for (let i = p.startTurn; i <= p.endTurn; i++) {
        if (turns[i] && set.has(turns[i]!)) return true;
      }
      return false;
    });
  }, [phases, filteredTurns, turns]);

  const allCommits: SessionCommit[] = detail.gitContext?.commits ?? [];
  const commits = useMemo(() => {
    if (selectedCheckpoint === "all") return allCommits;
    return allCommits.filter((c) => c.hash === selectedCheckpoint);
  }, [allCommits, selectedCheckpoint]);

  // -------------------------------------------------------------------------
  // Search
  // -------------------------------------------------------------------------
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);

  useSearchHotkey(() => setSearchOpen(true));

  const matchTurnIndices = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const out: number[] = [];
    for (const t of filteredTurns) {
      if (t.content.toLowerCase().includes(q)) {
        out.push(t.index);
        continue;
      }
      if (t.toolCalls?.some((tc) => tc.arguments.toLowerCase().includes(q) || tc.result.toLowerCase().includes(q))) {
        out.push(t.index);
      }
    }
    return out;
  }, [filteredTurns, searchQuery]);

  const activeMatchTurn = matchTurnIndices[currentMatchIdx];

  // -------------------------------------------------------------------------
  // Scroll target + viewport tracking
  // -------------------------------------------------------------------------
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportRange, setViewportRange] = useState<{ start: number; end: number } | undefined>();
  const [activePhaseIndex, setActivePhaseIndex] = useState<number | undefined>();

  const entryIndexToPos = useMemo(() => {
    const m = new Map<number, number>();
    turns.forEach((t, i) => m.set(t.index, i));
    return m;
  }, [turns]);

  const STICKY_OFFSET = stickyTop + 48;

  const scrollToAnchorTurn = useCallback(
    (turnIndex: number) => {
      const el = document.querySelector<HTMLElement>(`[data-anchor-turn="${turnIndex}"]`);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const targetY = window.scrollY + rect.top - STICKY_OFFSET - STICKY_PAD;
      window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
    },
    [STICKY_OFFSET],
  );

  const scrollToTurn = useCallback(
    (turnIndex: number, behavior: ScrollBehavior = "smooth") => {
      let attempts = 0;
      const tryScroll = () => {
        const container = containerRef.current;
        const el = container?.querySelector(`[data-turn-index="${turnIndex}"]`);
        if (el instanceof HTMLElement) {
          const rect = el.getBoundingClientRect();
          const targetY = window.scrollY + rect.top - STICKY_OFFSET - window.innerHeight * 0.15;
          window.scrollTo({ top: Math.max(0, targetY), behavior });
          return;
        }
        if (attempts < 10) {
          attempts += 1;
          setTimeout(tryScroll, 50);
        }
      };
      tryScroll();
    },
    [STICKY_OFFSET],
  );

  useEffect(() => {
    if (activeMatchTurn == null) return;
    scrollToTurn(activeMatchTurn);
  }, [activeMatchTurn, scrollToTurn]);

  // Deep-link anchoring: when the page loads (or the hash changes) with a
  // `#turn-<index>` fragment — the link the per-turn copy button writes — switch
  // to the trace list and scroll straight to that message. `scrollToTurn` polls
  // for the row, so it works even before the canvas has finished mounting.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const anchorFromHash = () => {
      const m = /^#turn-(\d+)$/.exec(window.location.hash);
      if (!m) return;
      const idx = Number(m[1]);
      if (!Number.isFinite(idx)) return;
      setActiveTab(SessionTab.Trace);
      setTrajectoryMode("list");
      requestAnimationFrame(() => scrollToTurn(idx, "auto"));
    };
    anchorFromHash();
    window.addEventListener("hashchange", anchorFromHash);
    return () => window.removeEventListener("hashchange", anchorFromHash);
  }, [scrollToTurn]);

  // Host-supplied deep-link target (for permalink shapes other than the default
  // hash — e.g. a `?turn=N` query param). Behaves like the hash anchor: switch to
  // the trace list and scroll straight to that message on mount.
  useEffect(() => {
    if (initialTurnIndex == null || !Number.isFinite(initialTurnIndex)) return;
    setActiveTab(SessionTab.Trace);
    setTrajectoryMode("list");
    requestAnimationFrame(() => scrollToTurn(initialTurnIndex, "auto"));
  }, [initialTurnIndex, scrollToTurn]);

  // Vim-style j/k (and ArrowDown/Up) turn navigation (roadmap 4.1). The anchor
  // follows the top visible turn while you scroll manually; j/k then step from
  // there. Disabled while search owns the keyboard. The pure index math
  // (nextNavTurn) is exported + unit-tested by the host.
  const navTurnRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    navTurnRef.current = viewportRange?.start;
  }, [viewportRange?.start]);
  const navTurnIndices = useMemo(() => filteredTurns.map((t) => t.index), [filteredTurns]);
  const getNavCurrent = useCallback(() => navTurnRef.current, []);
  const onNavTurn = useCallback(
    (idx: number) => {
      navTurnRef.current = idx;
      scrollToTurn(idx);
    },
    [scrollToTurn],
  );
  useTurnKeyboardNav({
    enabled: !searchOpen,
    turnIndices: navTurnIndices,
    getCurrent: getNavCurrent,
    onNavigate: onNavTurn,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || turns.length === 0) return;

    const visible = new Map<number, IntersectionObserverEntry>();

    function recompute() {
      if (visible.size === 0) return;
      const entries = Array.from(visible.values()).sort((a, b) => {
        const ai = parseInt((a.target as HTMLElement).getAttribute("data-turn-index") ?? "0", 10);
        const bi = parseInt((b.target as HTMLElement).getAttribute("data-turn-index") ?? "0", 10);
        return ai - bi;
      });
      const first = parseInt((entries[0]!.target as HTMLElement).getAttribute("data-turn-index") ?? "0", 10);
      const last = parseInt(
        (entries[entries.length - 1]!.target as HTMLElement).getAttribute("data-turn-index") ?? "0",
        10,
      );
      setViewportRange({ start: first, end: last });
      if (filteredPhases.length > 0) {
        const firstPos = entryIndexToPos.get(first) ?? 0;
        let found: number | undefined;
        for (let i = filteredPhases.length - 1; i >= 0; i--) {
          const p = filteredPhases[i]!;
          if (firstPos >= p.startTurn && firstPos <= p.endTurn) {
            found = i;
            break;
          }
        }
        setActivePhaseIndex(found);
      } else {
        setActivePhaseIndex(undefined);
      }
    }

    const io = new IntersectionObserver(
      (records) => {
        for (const r of records) {
          const idx = parseInt((r.target as HTMLElement).getAttribute("data-turn-index") ?? "0", 10);
          if (r.isIntersecting) visible.set(idx, r);
          else visible.delete(idx);
        }
        recompute();
      },
      { root: null, rootMargin: "-25% 0px -50% 0px", threshold: 0 },
    );

    const els = container.querySelectorAll("[data-turn-index]");
    els.forEach((el) => io.observe(el));

    return () => {
      io.disconnect();
      visible.clear();
    };
  }, [turns.length, filteredPhases, entryIndexToPos]);

  const heroRef = useRef<HTMLElement>(null);
  const heroOffscreen = useTriggerOffscreen(heroRef);

  const errorTurns = useMemo(
    () => annotations.filter((a) => a.type === "error").map((a) => a.turnIndex),
    [annotations],
  );
  const flaggedTurns = useMemo(
    () => annotations.filter((a) => a.type === "retry" || a.type === "revert").map((a) => a.turnIndex),
    [annotations],
  );

  // -------------------------------------------------------------------------
  // Tabs
  // -------------------------------------------------------------------------
  const tabs: SessionTabDef[] = [
    { id: SessionTab.Highlights, label: "Highlights" },
    { id: SessionTab.Trace, label: "Full trace", count: turns.length },
    { id: SessionTab.Diffs, label: "Diffs", count: counts.toolGroups["edit"] ?? 0 },
    { id: SessionTab.Files, label: "Files", count: distinctFileCount },
    { id: SessionTab.Annotations, label: "Annotations", count: annotations.length },
  ];

  const firstUserPrompt = turns.find((t) => t.role === "user");

  const jumpToTraceTurn = useCallback(
    (idx: number) => {
      setActiveTab(SessionTab.Trace);
      setTrajectoryMode("list");
      requestAnimationFrame(() => scrollToTurn(idx));
    },
    [scrollToTurn],
  );

  const jumpToFile = useCallback((path: string) => {
    setActiveTab(SessionTab.Diffs);
    requestAnimationFrame(() => {
      const el = document.getElementById(`diff-file-${diffAnchorId(path)}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const showGraph = trajectoryMode === "graph" && !!renderGraph;

  // Shared rail wiring — consumed identically by the tabbed `RightRail` and by
  // each split-layout `RailColumn`, so the two layouts stay in lockstep. Only
  // `collapsed`/`onCollapsedChange` differ per layout, supplied at the call site.
  const railProps = {
    activeTab,
    turns,
    activeTurnIndex: viewportRange?.start,
    onTurnClick: (idx: number) => {
      if (activeTab !== SessionTab.Trace) {
        scrollToAnchorTurn(idx);
        return;
      }
      setTrajectoryMode("list");
      requestAnimationFrame(() => scrollToTurn(idx));
    },
    phases: filteredPhases,
    errorTurnIndices: errorTurns,
    annotations,
    onJumpToFile: jumpToFile,
    filters,
    counts,
    onFiltersChange: (f: V2FilterState) => {
      setFilters(f);
      setCurrentMatchIdx(0);
    },
    viewOptions,
    onViewOptionsChange: setViewOptions,
    commits: allCommits,
    selectedCommit: selectedCheckpoint,
    onCommitChange: setSelectedCheckpoint,
    onCommitJump: (c: SessionCommit) => {
      const ct = new Date(c.timestamp).getTime();
      const target = turns.find((t) => new Date(t.timestamp).getTime() >= ct);
      if (!target) return;
      jumpToTraceTurn(target.index);
    },
    onJumpToStart: () => {
      setActiveTab(SessionTab.Trace);
      setTrajectoryMode("list");
      requestAnimationFrame(() => scrollToTurn(turns[0]?.index ?? 0, "auto"));
    },
    onJumpToLatest: () => {
      setActiveTab(SessionTab.Trace);
      setTrajectoryMode("list");
      requestAnimationFrame(() => scrollToTurn(turns[turns.length - 1]?.index ?? 0, "auto"));
    },
  };

  const split = railLayout === "split";

  return (
    <div className={cn("tb-root tb-detail", className)}>
      <StickyHeader
        detail={detail}
        visible={heroOffscreen}
        turns={turns}
        viewportRange={viewportRange}
        errorTurns={errorTurns}
        flaggedTurns={flaggedTurns}
        showScrubber={activeTab === SessionTab.Trace && trajectoryMode === "list"}
        top={stickyTop}
        capabilities={capabilities}
        callbacks={callbacks}
        linkBuilder={sessionLinkBuilder}
        shareLabel={shareLabel}
        contributeLabel={contributeLabel}
        onSeek={(idx, behavior = "smooth") => {
          setActiveTab(SessionTab.Trace);
          setTrajectoryMode("list");
          if (behavior === "auto") scrollToTurn(idx, "auto");
          else requestAnimationFrame(() => scrollToTurn(idx, "smooth"));
        }}
      />

      <div className="tb-detail-inner">
        <section ref={heroRef}>
          <SessionHero
            detail={detail}
            breadcrumb={breadcrumb}
            displayTurnCount={turns.length}
            firstUserPrompt={firstUserPrompt}
            capabilities={capabilities}
            callbacks={callbacks}
            linkBuilder={sessionLinkBuilder}
            shareLabel={shareLabel}
            contributeLabel={contributeLabel}
          />
        </section>

        {error && <div className="tb-detail-error">{error}</div>}

        <TabStrip tabs={tabs} value={activeTab} onChange={setActiveTab} />

        <div
          className={cn(
            "tb-detail-grid",
            split && "tb-detail-grid-split",
            !split && rightRailCollapsed && "tb-detail-grid-collapsed",
            split && outlineColCollapsed && "tb-detail-grid-lcollapsed",
            split && filtersColCollapsed && "tb-detail-grid-rcollapsed",
          )}
        >
          {split && (
            <div className="tb-detail-railwrap tb-detail-railwrap-left">
              <div className="tb-detail-railsticky" style={{ top: stickyTop + 44 }}>
                <RailColumn
                  panel="outline"
                  {...railProps}
                  collapsed={outlineColCollapsed}
                  onCollapsedChange={setOutlineColCollapsed}
                />
              </div>
            </div>
          )}

          <main ref={containerRef} className="tb-detail-main">
            <TurnContextBar
              turns={turns}
              activeEntryIndex={viewportRange?.start}
              visible={heroOffscreen && activeTab === SessionTab.Trace && trajectoryMode === "list"}
              top={stickyTop + 44}
              onJumpToTurn={(idx) => requestAnimationFrame(() => scrollToTurn(idx, "smooth"))}
            />

            {activeTab === SessionTab.Trace && (
              <>
                <div className="tb-detail-tracehead">
                  <span className="tb-detail-tracecount">
                    {filteredTurns.length === turns.length
                      ? `${turns.length.toLocaleString()} turns`
                      : `${filteredTurns.length.toLocaleString()} of ${turns.length.toLocaleString()} turns`}
                  </span>
                  {renderGraph && <ViewModeToggle value={trajectoryMode} onChange={setTrajectoryMode} />}
                </div>
                {showGraph ? (
                  <div className="tb-detail-graphwrap">
                    {renderGraph!({
                      turns,
                      filteredTurns,
                      phases: filteredPhases,
                      annotations,
                      searchMatches: matchTurnIndices,
                      searchQuery,
                      activeMatchIndex: activeMatchTurn,
                      onPhaseActivate: setActivePhaseIndex,
                      onViewportChange: setViewportRange,
                      provider,
                    })}
                  </div>
                ) : (
                  <TranscriptCanvas
                    turns={filteredTurns}
                    provider={provider}
                    phases={viewOptions.showHidden ? filteredPhases : []}
                    activePhaseIndex={activePhaseIndex}
                    onPhaseClick={(_p, i) => setActivePhaseIndex(i)}
                    commits={viewOptions.showHidden ? commits : []}
                    searchQuery={searchQuery}
                    searchMatchIndices={matchTurnIndices
                      .map((idx) => filteredTurns.findIndex((t) => t.index === idx))
                      .filter((i) => i >= 0)}
                    activeMatchTurnIndex={activeMatchTurn}
                    expandToolCalls={viewOptions.expandToolCalls}
                    hideThinking={viewOptions.hideThinking}
                    compact={viewOptions.compact}
                    phaseStickyTop={stickyTop + 44}
                    linkBuilder={linkBuilder}
                    renderTurnActions={renderTurnActions}
                    renderTurnPanel={renderTurnPanel}
                    savedLabelsByEntry={savedLabelsByEntry}
                  />
                )}
              </>
            )}

            {activeTab === SessionTab.Highlights && (
              <HighlightsView
                detail={detail}
                turns={turns}
                phases={filteredPhases}
                errorTurnIndices={errorTurns}
                onJumpToTurn={jumpToTraceTurn}
                scorecard={scorecard}
                medians={scorecardMedians}
              />
            )}

            {activeTab === SessionTab.Diffs && <DiffsView turns={turns} onJumpToTurn={jumpToTraceTurn} />}

            {activeTab === SessionTab.Files && (
              <FilesView turns={turns} projectRoot={detail.project ?? undefined} onJumpToTurn={jumpToTraceTurn} onJumpToFile={jumpToFile} />
            )}

            {activeTab === SessionTab.Annotations && (
              <AnnotationsView annotations={annotations} turns={turns} onJumpToTurn={jumpToTraceTurn} />
            )}
          </main>

          <div className={cn("tb-detail-railwrap", split && "tb-detail-railwrap-right")}>
            <div className="tb-detail-railsticky" style={{ top: stickyTop + 44 }}>
              {split ? (
                <RailColumn
                  panel="filters"
                  {...railProps}
                  collapsed={filtersColCollapsed}
                  onCollapsedChange={setFiltersColCollapsed}
                />
              ) : (
                <RightRail
                  {...railProps}
                  collapsed={rightRailCollapsed}
                  onCollapsedChange={setRightRailCollapsed}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <SearchBar
        open={searchOpen}
        query={searchQuery}
        onQueryChange={(q) => {
          setSearchQuery(q);
          setCurrentMatchIdx(0);
        }}
        matchCount={matchTurnIndices.length}
        currentMatch={matchTurnIndices.length > 0 ? currentMatchIdx + 1 : 0}
        onPrev={() => setCurrentMatchIdx((i) => (i <= 0 ? matchTurnIndices.length - 1 : i - 1))}
        onNext={() => setCurrentMatchIdx((i) => (i >= matchTurnIndices.length - 1 ? 0 : i + 1))}
        onClose={() => setSearchOpen(false)}
      />

      <ProgressIndicator current={(viewportRange?.end ?? 0) + 1} total={filteredTurns.length} />
    </div>
  );
}
