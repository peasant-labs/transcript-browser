import { useState, type ComponentType } from "react";
import {
  Pencil,
  Terminal,
  BookOpen,
  Search,
  Globe,
  ListChecks,
  Wrench,
  ArrowDownToLine,
  ArrowUpToLine,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  SlidersHorizontal,
  LayoutList,
  FileDiff,
  Folder,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  RotateCcw,
} from "@peasant-labs/fairtrade/icons";
import { cn } from "../internal/cn.js";
import { FilterSection } from "./FilterSection.js";
import { FilterCheckbox } from "./FilterCheckbox.js";
import { CheckpointSelector } from "./CheckpointSelector.js";
import { ViewOptions } from "./ViewOptions.js";
import { StepsWaterfall } from "@peasant-labs/fairtrade/ui";
import { computeTasks } from "../lib/tasks.js";
import { HighlightsOutline } from "./HighlightsOutline.js";
import { DiffsOutline } from "./DiffsOutline.js";
import { FilesOutline } from "./FilesOutline.js";
import { AnnotationsOutline } from "./AnnotationsOutline.js";
import {
  FilterCategory,
  ToolGroup,
  TagFilter,
  toggleInSet,
  type V2FilterState,
  type V2FilterCounts,
  type V2ViewOptions,
} from "./filter-types.js";
import { SessionTab } from "../session-detail-types.js";
import type { TurnDetail, Harness } from "@peasant-labs/schema";
import type { CommitVM } from "@peasant-labs/fairtrade/ui";
import type { Phase } from "../view-types.js";
import type { TranscriptAnnotation } from "../lib/pattern-detection.js";
import type { FileRollup } from "../lib/file-rollup.js";
import {
  RAIL_TAB_LABELS,
  FILTER_SECTION_LABELS,
  CATEGORY_LABELS,
  TAG_LABELS,
  TOOL_GROUP_LABELS,
} from "../lib/labels.js";

type IconCmp = ComponentType<{ size: number; strokeWidth?: number; className?: string }>;

export interface RightRailProps {
  /** Active page tab — drives which filter UI to show in the Filters tab. */
  activeTab: SessionTab;
  /** Turns in display order — fed to the Outline tab. */
  turns: TurnDetail[];
  /**
   * Per-file rollups (computed once by the composer from the cooked VM) — fed to
   * the Diffs/Files outlines so the rail never parses wire.
   */
  fileRollups: FileRollup[];
  /** Session harness — the final-response highlight renders its brand mark. */
  provider?: Harness;
  /** Active turn index (display-position) — drives outline highlighting. */
  activeTurnIndex?: number;
  /** Clicked-on-outline-row -> scroll target. */
  onTurnClick?: (turnIndex: number) => void;
  phases?: Phase[];
  errorTurnIndices?: number[];
  annotations?: TranscriptAnnotation[];
  /** When a Diffs/Files outline row resolves to a file, jump to its anchor. */
  onJumpToFile?: (path: string, firstTurnIndex: number) => void;

  filters: V2FilterState;
  counts: V2FilterCounts;
  onFiltersChange: (next: V2FilterState) => void;
  viewOptions: V2ViewOptions;
  onViewOptionsChange: (next: V2ViewOptions) => void;
  commits?: CommitVM[];
  selectedCommit?: "all" | string;
  onCommitChange?: (value: "all" | string) => void;
  onCommitJump?: (commit: CommitVM) => void;
  onJumpToStart?: () => void;
  onJumpToLatest?: () => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  className?: string;
}

type RailTab = "outline" | "filters";

/**
 * Which single panel a {@link RailColumn} shows. The split (dual-column) layout
 * renders one `RailColumn` per panel — `outline` to the left of the transcript,
 * `filters` to the right — instead of folding both into the tabbed `RightRail`.
 */
export type RailPanel = "outline" | "filters";

const TOOL_GROUPS: { group: ToolGroup; label: string; Icon: IconCmp }[] = [
  { group: ToolGroup.Edit, label: TOOL_GROUP_LABELS.edit, Icon: Pencil },
  { group: ToolGroup.Bash, label: TOOL_GROUP_LABELS.bash, Icon: Terminal },
  { group: ToolGroup.Read, label: TOOL_GROUP_LABELS.read, Icon: BookOpen },
  { group: ToolGroup.Search, label: TOOL_GROUP_LABELS.search, Icon: Search },
  { group: ToolGroup.Fetch, label: TOOL_GROUP_LABELS.fetch, Icon: Globe },
  { group: ToolGroup.Task, label: TOOL_GROUP_LABELS.task, Icon: ListChecks },
  { group: ToolGroup.Other, label: TOOL_GROUP_LABELS.other, Icon: Wrench },
];

/**
 * Right-side multi-purpose rail: Outline (a navigator that doubles as an
 * "active turn" indicator) + Filters (per-tab filter and view controls). Ported
 * from peasant's `rails/RightRail.tsx`. All state is host-owned via props.
 */
export function RightRail({
  activeTab,
  turns,
  fileRollups,
  provider,
  activeTurnIndex,
  onTurnClick,
  phases,
  errorTurnIndices,
  annotations,
  onJumpToFile,
  filters,
  counts,
  onFiltersChange,
  viewOptions,
  onViewOptionsChange,
  commits,
  selectedCommit = "all",
  onCommitChange,
  onCommitJump,
  onJumpToStart,
  onJumpToLatest,
  collapsed = false,
  onCollapsedChange,
  className,
}: RightRailProps) {
  const [railTab, setRailTab] = useState<RailTab>("outline");
  const [toolsExpanded, setToolsExpanded] = useState(true);
  const setCollapsed = (next: boolean) => onCollapsedChange?.(next);

  const totalFilters = filters.categories.size + filters.toolGroups.size + filters.tags.size;

  if (collapsed) {
    return (
      <aside className={cn("tb-root tb-rail tb-rail-collapsed", className)} aria-label="Session rail (collapsed)">
        <div className="tb-rail-collapsed-head">
          <button type="button" onClick={() => setCollapsed(false)} className="tb-rail-icon-btn" title="Expand rail" aria-label="Expand rail">
            <ChevronLeft size={14} strokeWidth={1.75} />
          </button>
        </div>
        <div className="tb-rail-collapsed-body">
          <CollapsedTabButton label={RAIL_TAB_LABELS.outline} Icon={LayoutList} onClick={() => { setRailTab("outline"); setCollapsed(false); }} />
          <CollapsedTabButton label={RAIL_TAB_LABELS.filters} Icon={SlidersHorizontal} count={totalFilters} onClick={() => { setRailTab("filters"); setCollapsed(false); }} />
        </div>
      </aside>
    );
  }

  return (
    <aside className={cn("tb-root tb-rail", className)} aria-label="Session rail">
      <div className="tb-rail-tabbar">
        <div role="tablist" aria-label="Rail tabs" className="tb-rail-tabs">
          <RailTabButton active={railTab === "outline"} label={RAIL_TAB_LABELS.outline} Icon={LayoutList} onClick={() => setRailTab("outline")} />
          <RailTabButton active={railTab === "filters"} label={RAIL_TAB_LABELS.filters} Icon={SlidersHorizontal} count={totalFilters} onClick={() => setRailTab("filters")} />
        </div>
        <button type="button" onClick={() => setCollapsed(true)} className="tb-rail-icon-btn tb-rail-collapse-btn" title="Collapse rail" aria-label="Collapse rail">
          <ChevronRight size={13} strokeWidth={1.75} />
        </button>
      </div>

      {railTab === "outline" ? (
        <div className="tb-rail-body">
          <OutlineTabBody
            activeTab={activeTab}
            turns={turns}
            fileRollups={fileRollups}
            provider={provider}
            activeTurnIndex={activeTurnIndex}
            phases={phases}
            errorTurnIndices={errorTurnIndices}
            annotations={annotations}
            commits={commits}
            onTurnClick={onTurnClick}
            onJumpToFile={onJumpToFile}
          />
        </div>
      ) : (
        <div className="tb-rail-body">
          <FiltersTabBody
            activeTab={activeTab}
            filters={filters}
            counts={counts}
            onFiltersChange={onFiltersChange}
            viewOptions={viewOptions}
            onViewOptionsChange={onViewOptionsChange}
            commits={commits}
            selectedCommit={selectedCommit}
            onCommitChange={onCommitChange}
            onCommitJump={onCommitJump}
            onJumpToStart={onJumpToStart}
            onJumpToLatest={onJumpToLatest}
            toolsExpanded={toolsExpanded}
            setToolsExpanded={setToolsExpanded}
          />
        </div>
      )}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// RailColumn — one panel for the split (dual-column) layout
// ---------------------------------------------------------------------------

export interface RailColumnProps extends RightRailProps {
  /** Which single panel this column shows. */
  panel: RailPanel;
}

/**
 * A single rail panel (outline OR filters) with its own static header — the
 * building block of the split layout, where the outline sits to the left of the
 * transcript and the filters to the right (per the "turn 2 tabs into 2 cols"
 * feedback) instead of being folded behind tabs in {@link RightRail}.
 *
 * It shares every body with `RightRail` (same `OutlineTabBody` / `FiltersTabBody`),
 * so the two layouts never drift. Collapsing is per-panel; collapsed it shows
 * just an expand affordance, mirroring the tabbed rail's collapsed state. All
 * state stays host-owned via props.
 */
export function RailColumn({ panel, className, ...props }: RailColumnProps) {
  const {
    activeTab,
    turns,
    fileRollups,
    provider,
    activeTurnIndex,
    phases,
    errorTurnIndices,
    annotations,
    commits,
    onTurnClick,
    onJumpToFile,
    filters,
    counts,
    onFiltersChange,
    viewOptions,
    onViewOptionsChange,
    selectedCommit = "all",
    onCommitChange,
    onCommitJump,
    onJumpToStart,
    onJumpToLatest,
    collapsed = false,
    onCollapsedChange,
  } = props;

  const [toolsExpanded, setToolsExpanded] = useState(true);
  const setCollapsed = (next: boolean) => onCollapsedChange?.(next);

  const totalFilters = filters.categories.size + filters.toolGroups.size + filters.tags.size;
  const isOutline = panel === "outline";
  const title = isOutline ? RAIL_TAB_LABELS.outline : RAIL_TAB_LABELS.filters;
  const Icon = isOutline ? LayoutList : SlidersHorizontal;
  const count = isOutline ? undefined : totalFilters;

  if (collapsed) {
    return (
      <aside className={cn("tb-root tb-rail tb-rail-collapsed", className)} aria-label={`${title} (collapsed)`}>
        <div className="tb-rail-collapsed-head">
          <button type="button" onClick={() => setCollapsed(false)} className="tb-rail-icon-btn" title={`Expand ${title.toLowerCase()}`} aria-label={`Expand ${title.toLowerCase()}`}>
            {isOutline ? <ChevronRight size={14} strokeWidth={1.75} /> : <ChevronLeft size={14} strokeWidth={1.75} />}
          </button>
        </div>
        <div className="tb-rail-collapsed-body">
          <CollapsedTabButton label={title} Icon={Icon} count={count} onClick={() => setCollapsed(false)} />
        </div>
      </aside>
    );
  }

  return (
    <aside className={cn("tb-root tb-rail", className)} aria-label={title}>
      <div className="tb-rail-tabbar">
        <div className="tb-rail-colhead">
          <Icon size={13} strokeWidth={1.75} />
          <span>{title}</span>
          {count != null && count > 0 && <FilterCountBadge count={count} />}
        </div>
        {onCollapsedChange && (
          <button type="button" onClick={() => setCollapsed(true)} className="tb-rail-icon-btn tb-rail-collapse-btn" title={`Collapse ${title.toLowerCase()}`} aria-label={`Collapse ${title.toLowerCase()}`}>
            {isOutline ? <ChevronLeft size={13} strokeWidth={1.75} /> : <ChevronRight size={13} strokeWidth={1.75} />}
          </button>
        )}
      </div>

      <div className="tb-rail-body">
        {isOutline ? (
          <OutlineTabBody
            activeTab={activeTab}
            turns={turns}
            fileRollups={fileRollups}
            provider={provider}
            activeTurnIndex={activeTurnIndex}
            phases={phases}
            errorTurnIndices={errorTurnIndices}
            annotations={annotations}
            commits={commits}
            onTurnClick={onTurnClick}
            onJumpToFile={onJumpToFile}
          />
        ) : (
          <FiltersTabBody
            activeTab={activeTab}
            filters={filters}
            counts={counts}
            onFiltersChange={onFiltersChange}
            viewOptions={viewOptions}
            onViewOptionsChange={onViewOptionsChange}
            commits={commits}
            selectedCommit={selectedCommit}
            onCommitChange={onCommitChange}
            onCommitJump={onCommitJump}
            onJumpToStart={onJumpToStart}
            onJumpToLatest={onJumpToLatest}
            toolsExpanded={toolsExpanded}
            setToolsExpanded={setToolsExpanded}
          />
        )}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Outline tab body
// ---------------------------------------------------------------------------

interface OutlineTabBodyProps {
  activeTab: SessionTab;
  turns: TurnDetail[];
  fileRollups: FileRollup[];
  provider?: Harness;
  activeTurnIndex?: number;
  phases?: Phase[];
  errorTurnIndices?: number[];
  annotations?: TranscriptAnnotation[];
  commits?: CommitVM[];
  onTurnClick?: (turnIndex: number) => void;
  onJumpToFile?: (path: string, firstTurnIndex: number) => void;
}

function OutlineTabBody({
  activeTab,
  turns,
  fileRollups,
  provider,
  activeTurnIndex,
  phases,
  errorTurnIndices,
  annotations,
  commits,
  onTurnClick,
  onJumpToFile,
}: OutlineTabBodyProps) {
  switch (activeTab) {
    case SessionTab.Trace: {
      // The trace user-turns rail is the canonical per-user-turn duration trail
      // (consumed StepsWaterfall), one item per user turn: #N + duration + the
      // prompt + an outcome chip — fed from transcript-browser's computed tasks.
      const steps = computeTasks(turns).map((t, i) => ({
        id: String(t.startIndex),
        index: i + 1,
        prompt: t.prompt,
        durationMs: t.durationMs,
        tools: t.toolCallCount,
        outcome: (t.hasErrors ? "error" : "ok") as "ok" | "error",
      }));
      return (
        <StepsWaterfall
          className="txn-ol-waterfall"
          tasks={steps}
          label="user turns by duration"
          onJump={(id) => onTurnClick?.(Number(id))}
        />
      );
    }
    case SessionTab.Highlights:
      return (
        <HighlightsOutline
          turns={turns}
          provider={provider}
          phases={phases ?? []}
          errorTurnIndices={errorTurnIndices}
          commits={commits}
          activeTurnIndex={activeTurnIndex}
          onJumpToTurn={onTurnClick}
        />
      );
    case SessionTab.Diffs:
      return <DiffsOutline files={fileRollups} onJumpToFile={onJumpToFile} onJumpToTurn={onTurnClick} />;
    case SessionTab.Files:
      return <FilesOutline files={fileRollups} onJumpToFile={onJumpToFile} onJumpToTurn={onTurnClick} />;
    case SessionTab.Annotations:
      return <AnnotationsOutline annotations={annotations ?? []} turns={turns} activeTurnIndex={activeTurnIndex} onJumpToTurn={onTurnClick} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Tab button presentation
// ---------------------------------------------------------------------------

function FilterCountBadge({ count }: { count: number }) {
  return (
    <span aria-label={`${count} active filter${count === 1 ? "" : "s"}`} className="tb-rail-badge tb-tnum">
      {count}
    </span>
  );
}

function RailTabButton({
  active,
  label,
  Icon,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  Icon: IconCmp;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button type="button" role="tab" aria-selected={active} onClick={onClick} aria-label={label} className={cn("tb-rail-tab", active && "tb-rail-tab-active")}>
      <Icon size={13} strokeWidth={1.75} />
      <span>{label}</span>
      {count != null && count > 0 && <FilterCountBadge count={count} />}
      {active && <span aria-hidden className="tb-rail-tab-underline" />}
    </button>
  );
}

function CollapsedTabButton({ label, Icon, count, onClick }: { label: string; Icon: IconCmp; count?: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="tb-rail-ctab">
      <Icon size={13} strokeWidth={1.75} />
      <span>{label}</span>
      {count != null && count > 0 && <FilterCountBadge count={count} />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Filters tab body
// ---------------------------------------------------------------------------

interface FiltersTabBodyProps {
  activeTab: SessionTab;
  filters: V2FilterState;
  counts: V2FilterCounts;
  onFiltersChange: (next: V2FilterState) => void;
  viewOptions: V2ViewOptions;
  onViewOptionsChange: (next: V2ViewOptions) => void;
  commits?: CommitVM[];
  selectedCommit?: "all" | string;
  onCommitChange?: (value: "all" | string) => void;
  onCommitJump?: (commit: CommitVM) => void;
  onJumpToStart?: () => void;
  onJumpToLatest?: () => void;
  toolsExpanded: boolean;
  setToolsExpanded: (next: boolean | ((prev: boolean) => boolean)) => void;
}

function FiltersTabBody(props: FiltersTabBodyProps) {
  const { activeTab } = props;
  switch (activeTab) {
    case SessionTab.Trace:
      return <TraceFilters {...props} />;
    case SessionTab.Highlights:
      return <HighlightsFilters {...props} />;
    case SessionTab.Diffs:
      return <PlaceholderFilters Icon={FileDiff} message="filter controls for diffs are not available yet." />;
    case SessionTab.Files:
      return <PlaceholderFilters Icon={Folder} message="filter controls for files are not available yet." />;
    case SessionTab.Annotations:
      return <PlaceholderFilters Icon={MessageSquare} message="filter controls for annotations are not available yet." />;
    default:
      return null;
  }
}

function TraceFilters({
  filters,
  counts,
  onFiltersChange,
  viewOptions,
  onViewOptionsChange,
  commits,
  selectedCommit = "all",
  onCommitChange,
  onCommitJump,
  onJumpToStart,
  onJumpToLatest,
  toolsExpanded,
  setToolsExpanded,
}: FiltersTabBodyProps) {
  const totalFilters = filters.categories.size + filters.toolGroups.size + filters.tags.size;

  function toggleCategory(c: FilterCategory) {
    onFiltersChange({ ...filters, categories: toggleInSet(filters.categories, c) });
  }
  function toggleGroup(g: ToolGroup) {
    onFiltersChange({ ...filters, toolGroups: toggleInSet(filters.toolGroups, g) });
  }
  function toggleTag(t: TagFilter) {
    onFiltersChange({ ...filters, tags: toggleInSet(filters.tags, t) });
  }

  return (
    <>
      <FilterSection
        title={FILTER_SECTION_LABELS.categories}
        action={
          totalFilters > 0 ? (
            <button
              type="button"
              onClick={() => onFiltersChange({ categories: new Set(), toolGroups: new Set(), tags: new Set() })}
              className="tb-rail-clear"
            >
              clear ({totalFilters})
            </button>
          ) : undefined
        }
      >
        <FilterCheckbox checked={filters.categories.has(FilterCategory.Prompts)} onCheckedChange={() => toggleCategory(FilterCategory.Prompts)} label={CATEGORY_LABELS.prompts} count={counts.categories[FilterCategory.Prompts]} />
        <FilterCheckbox checked={filters.categories.has(FilterCategory.Responses)} onCheckedChange={() => toggleCategory(FilterCategory.Responses)} label={CATEGORY_LABELS.responses} count={counts.categories[FilterCategory.Responses]} />
        <FilterCheckbox checked={filters.categories.has(FilterCategory.Thinking)} onCheckedChange={() => toggleCategory(FilterCategory.Thinking)} label={CATEGORY_LABELS.thinking} count={counts.categories[FilterCategory.Thinking]} />

        <div className="tb-rail-toolcat">
          <div className="tb-rail-toolcat-head">
            <FilterCheckbox
              checked={filters.categories.has(FilterCategory.ToolCalls)}
              onCheckedChange={() => toggleCategory(FilterCategory.ToolCalls)}
              label={FILTER_SECTION_LABELS.toolCalls}
              count={counts.categories[FilterCategory.ToolCalls]}
              className="tb-rail-toolcat-check"
            />
            <button type="button" onClick={() => setToolsExpanded((v) => !v)} className="tb-rail-toolcat-toggle" aria-expanded={toolsExpanded} aria-label="Toggle tool breakdown" title="Toggle tool breakdown">
              {toolsExpanded ? <ChevronDown size={12} strokeWidth={1.75} /> : <ChevronRight size={12} strokeWidth={1.75} />}
            </button>
          </div>
          {toolsExpanded &&
            TOOL_GROUPS.filter((tg) => (counts.toolGroups[tg.group] ?? 0) > 0).map((tg) => (
              <FilterCheckbox
                key={tg.group}
                checked={filters.toolGroups.has(tg.group)}
                onCheckedChange={() => toggleGroup(tg.group)}
                label={tg.label}
                count={counts.toolGroups[tg.group]}
                indent
                icon={<tg.Icon size={14} strokeWidth={1.75} />}
              />
            ))}
        </div>

        {((counts.tags[TagFilter.Errors] ?? 0) > 0 || (counts.tags[TagFilter.Retries] ?? 0) > 0 || (counts.tags[TagFilter.ReEdit] ?? 0) > 0) && (
          <>
            <div className="tb-rail-tag-divider" />
            <div className="tb-eyebrow tb-rail-tag-caption">{FILTER_SECTION_LABELS.semanticTags}</div>
            {(counts.tags[TagFilter.Errors] ?? 0) > 0 && (
              <FilterCheckbox checked={filters.tags.has(TagFilter.Errors)} onCheckedChange={() => toggleTag(TagFilter.Errors)} label={TAG_LABELS.errors} count={counts.tags[TagFilter.Errors]} icon={<AlertTriangle size={14} strokeWidth={1.75} />} />
            )}
            {(counts.tags[TagFilter.Retries] ?? 0) > 0 && (
              <FilterCheckbox checked={filters.tags.has(TagFilter.Retries)} onCheckedChange={() => toggleTag(TagFilter.Retries)} label={TAG_LABELS.retries} count={counts.tags[TagFilter.Retries]} icon={<RefreshCw size={14} strokeWidth={1.75} />} />
            )}
            {(counts.tags[TagFilter.ReEdit] ?? 0) > 0 && (
              <FilterCheckbox checked={filters.tags.has(TagFilter.ReEdit)} onCheckedChange={() => toggleTag(TagFilter.ReEdit)} label="re-edit" count={counts.tags[TagFilter.ReEdit]} icon={<RotateCcw size={14} strokeWidth={1.75} />} />
            )}
          </>
        )}
      </FilterSection>

      {commits && commits.length > 0 && (
        <FilterSection title={`checkpoints (${commits.length})`}>
          <div className="tb-rail-checkpoint-wrap">
            <CheckpointSelector commits={commits} value={selectedCommit} onChange={onCommitChange ?? (() => {})} onJump={onCommitJump} />
          </div>
        </FilterSection>
      )}

      <FilterSection title={FILTER_SECTION_LABELS.view}>
        <ViewOptions value={viewOptions} onChange={onViewOptionsChange} />
      </FilterSection>

      <FilterSection title="jump to" defaultOpen>
        <button type="button" onClick={onJumpToStart} disabled={!onJumpToStart} className={cn("tb-rail-jump", !onJumpToStart && "tb-rail-jump-disabled")}>
          <ArrowUpToLine size={12} strokeWidth={1.75} className="tb-toolicon-muted" />
          <span className="tb-rail-jump-label">start</span>
        </button>
        <button type="button" onClick={onJumpToLatest} disabled={!onJumpToLatest} className={cn("tb-rail-jump", !onJumpToLatest && "tb-rail-jump-disabled")}>
          <ArrowDownToLine size={12} strokeWidth={1.75} className="tb-toolicon-muted" />
          <span className="tb-rail-jump-label">latest</span>
        </button>
      </FilterSection>
    </>
  );
}

function HighlightsFilters({ filters, counts, onFiltersChange }: FiltersTabBodyProps) {
  const tagsActive = filters.tags.size;

  function toggleTag(t: TagFilter) {
    onFiltersChange({ ...filters, tags: toggleInSet(filters.tags, t) });
  }

  const anyTags =
    (counts.tags[TagFilter.Errors] ?? 0) > 0 || (counts.tags[TagFilter.Retries] ?? 0) > 0 || (counts.tags[TagFilter.ReEdit] ?? 0) > 0;

  if (!anyTags) {
    return <PlaceholderFilters Icon={Sparkles} message="no filters available — highlights shows all noteworthy turns." />;
  }

  return (
    <FilterSection
      title="outcome"
      action={
        tagsActive > 0 ? (
          <button type="button" onClick={() => onFiltersChange({ ...filters, tags: new Set() })} className="tb-rail-clear">
            clear ({tagsActive})
          </button>
        ) : undefined
      }
    >
      {(counts.tags[TagFilter.Errors] ?? 0) > 0 && (
        <FilterCheckbox checked={filters.tags.has(TagFilter.Errors)} onCheckedChange={() => toggleTag(TagFilter.Errors)} label={TAG_LABELS.errors} count={counts.tags[TagFilter.Errors]} icon={<AlertTriangle size={14} strokeWidth={1.75} />} />
      )}
      {(counts.tags[TagFilter.Retries] ?? 0) > 0 && (
        <FilterCheckbox checked={filters.tags.has(TagFilter.Retries)} onCheckedChange={() => toggleTag(TagFilter.Retries)} label={TAG_LABELS.retries} count={counts.tags[TagFilter.Retries]} icon={<RefreshCw size={14} strokeWidth={1.75} />} />
      )}
      {(counts.tags[TagFilter.ReEdit] ?? 0) > 0 && (
        <FilterCheckbox checked={filters.tags.has(TagFilter.ReEdit)} onCheckedChange={() => toggleTag(TagFilter.ReEdit)} label="re-edit" count={counts.tags[TagFilter.ReEdit]} icon={<RotateCcw size={14} strokeWidth={1.75} />} />
      )}
    </FilterSection>
  );
}

function PlaceholderFilters({ Icon, message }: { Icon: IconCmp; message: string }) {
  return (
    <div className="tb-rail-placeholder">
      <span className="tb-ink-faint">
        <Icon size={20} strokeWidth={1.5} />
      </span>
      <p className="tb-rail-placeholder-text">{message}</p>
    </div>
  );
}
