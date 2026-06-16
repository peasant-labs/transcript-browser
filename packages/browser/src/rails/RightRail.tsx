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
} from "lucide-react";
import { cn } from "../internal/cn.js";
import { FilterSection } from "./FilterSection.js";
import { FilterCheckbox } from "./FilterCheckbox.js";
import { CheckpointSelector } from "./CheckpointSelector.js";
import { ViewOptions } from "./ViewOptions.js";
import { OutlineList } from "./OutlineList.js";
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
import type { SessionCommit, TurnDetail, Phase } from "@peasant-labs/types";
import type { TranscriptAnnotation } from "../lib/pattern-detection.js";

type IconCmp = ComponentType<{ size: number; strokeWidth?: number; className?: string }>;

export interface RightRailProps {
  /** Active page tab — drives which filter UI to show in the Filters tab. */
  activeTab: SessionTab;
  /** Turns in display order — fed to the Outline tab. */
  turns: TurnDetail[];
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
  commits?: SessionCommit[];
  selectedCommit?: "all" | string;
  onCommitChange?: (value: "all" | string) => void;
  onCommitJump?: (commit: SessionCommit) => void;
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
  { group: ToolGroup.Edit, label: "File edits", Icon: Pencil },
  { group: ToolGroup.Bash, label: "Bash", Icon: Terminal },
  { group: ToolGroup.Read, label: "Read", Icon: BookOpen },
  { group: ToolGroup.Search, label: "Search", Icon: Search },
  { group: ToolGroup.Fetch, label: "Fetch", Icon: Globe },
  { group: ToolGroup.Task, label: "Tasks", Icon: ListChecks },
  { group: ToolGroup.Other, label: "Other", Icon: Wrench },
];

/**
 * Right-side multi-purpose rail: Outline (a navigator that doubles as an
 * "active turn" indicator) + Filters (per-tab filter and view controls). Ported
 * from peasant's `rails/RightRail.tsx`. All state is host-owned via props.
 */
export function RightRail({
  activeTab,
  turns,
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
          <button type="button" onClick={() => setCollapsed(false)} className="tb-rail-icon-btn tb-focus" title="Expand rail" aria-label="Expand rail">
            <ChevronLeft size={14} strokeWidth={1.75} />
          </button>
        </div>
        <div className="tb-rail-collapsed-body">
          <CollapsedTabButton label="User Turns" Icon={LayoutList} onClick={() => { setRailTab("outline"); setCollapsed(false); }} />
          <CollapsedTabButton label="Filters" Icon={SlidersHorizontal} count={totalFilters} onClick={() => { setRailTab("filters"); setCollapsed(false); }} />
        </div>
      </aside>
    );
  }

  return (
    <aside className={cn("tb-root tb-rail", className)} aria-label="Session rail">
      <div className="tb-rail-tabbar">
        <div role="tablist" aria-label="Rail tabs" className="tb-rail-tabs">
          <RailTabButton active={railTab === "outline"} label="User Turns" Icon={LayoutList} onClick={() => setRailTab("outline")} />
          <RailTabButton active={railTab === "filters"} label="Filters" Icon={SlidersHorizontal} count={totalFilters} onClick={() => setRailTab("filters")} />
        </div>
        <button type="button" onClick={() => setCollapsed(true)} className="tb-rail-icon-btn tb-rail-collapse-btn tb-focus" title="Collapse rail" aria-label="Collapse rail">
          <ChevronRight size={13} strokeWidth={1.75} />
        </button>
      </div>

      {railTab === "outline" ? (
        <div className="tb-rail-body">
          <OutlineTabBody
            activeTab={activeTab}
            turns={turns}
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
  const title = isOutline ? "User Turns" : "Filters";
  const Icon = isOutline ? LayoutList : SlidersHorizontal;
  const count = isOutline ? undefined : totalFilters;

  if (collapsed) {
    return (
      <aside className={cn("tb-root tb-rail tb-rail-collapsed", className)} aria-label={`${title} (collapsed)`}>
        <div className="tb-rail-collapsed-head">
          <button type="button" onClick={() => setCollapsed(false)} className="tb-rail-icon-btn tb-focus" title={`Expand ${title.toLowerCase()}`} aria-label={`Expand ${title.toLowerCase()}`}>
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
          <button type="button" onClick={() => setCollapsed(true)} className="tb-rail-icon-btn tb-rail-collapse-btn tb-focus" title={`Collapse ${title.toLowerCase()}`} aria-label={`Collapse ${title.toLowerCase()}`}>
            {isOutline ? <ChevronLeft size={13} strokeWidth={1.75} /> : <ChevronRight size={13} strokeWidth={1.75} />}
          </button>
        )}
      </div>

      <div className="tb-rail-body">
        {isOutline ? (
          <OutlineTabBody
            activeTab={activeTab}
            turns={turns}
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
  activeTurnIndex?: number;
  phases?: Phase[];
  errorTurnIndices?: number[];
  annotations?: TranscriptAnnotation[];
  commits?: SessionCommit[];
  onTurnClick?: (turnIndex: number) => void;
  onJumpToFile?: (path: string, firstTurnIndex: number) => void;
}

function OutlineTabBody({
  activeTab,
  turns,
  activeTurnIndex,
  phases,
  errorTurnIndices,
  annotations,
  commits,
  onTurnClick,
  onJumpToFile,
}: OutlineTabBodyProps) {
  switch (activeTab) {
    case SessionTab.Trace:
      return <OutlineList turns={turns} activeTurnIndex={activeTurnIndex} onTurnClick={onTurnClick} />;
    case SessionTab.Highlights:
      return (
        <HighlightsOutline
          turns={turns}
          phases={phases ?? []}
          errorTurnIndices={errorTurnIndices}
          commits={commits}
          activeTurnIndex={activeTurnIndex}
          onJumpToTurn={onTurnClick}
        />
      );
    case SessionTab.Diffs:
      return <DiffsOutline turns={turns} onJumpToFile={onJumpToFile} onJumpToTurn={onTurnClick} />;
    case SessionTab.Files:
      return <FilesOutline turns={turns} onJumpToFile={onJumpToFile} onJumpToTurn={onTurnClick} />;
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
    <button type="button" role="tab" aria-selected={active} onClick={onClick} aria-label={label} className={cn("tb-rail-tab tb-focus", active && "tb-rail-tab-active")}>
      <Icon size={13} strokeWidth={1.75} />
      <span>{label}</span>
      {count != null && count > 0 && <FilterCountBadge count={count} />}
      {active && <span aria-hidden className="tb-rail-tab-underline" />}
    </button>
  );
}

function CollapsedTabButton({ label, Icon, count, onClick }: { label: string; Icon: IconCmp; count?: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="tb-rail-ctab tb-focus">
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
  commits?: SessionCommit[];
  selectedCommit?: "all" | string;
  onCommitChange?: (value: "all" | string) => void;
  onCommitJump?: (commit: SessionCommit) => void;
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
      return <PlaceholderFilters Icon={FileDiff} message="Filter controls for Diffs are not available yet." />;
    case SessionTab.Files:
      return <PlaceholderFilters Icon={Folder} message="Filter controls for Files are not available yet." />;
    case SessionTab.Annotations:
      return <PlaceholderFilters Icon={MessageSquare} message="Filter controls for Annotations are not available yet." />;
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
        title="Categories"
        action={
          totalFilters > 0 ? (
            <button
              type="button"
              onClick={() => onFiltersChange({ categories: new Set(), toolGroups: new Set(), tags: new Set() })}
              className="tb-rail-clear tb-focus"
            >
              Clear ({totalFilters})
            </button>
          ) : undefined
        }
      >
        <FilterCheckbox checked={filters.categories.has(FilterCategory.Prompts)} onCheckedChange={() => toggleCategory(FilterCategory.Prompts)} label="Prompts" count={counts.categories[FilterCategory.Prompts]} />
        <FilterCheckbox checked={filters.categories.has(FilterCategory.Responses)} onCheckedChange={() => toggleCategory(FilterCategory.Responses)} label="Responses" count={counts.categories[FilterCategory.Responses]} />
        <FilterCheckbox checked={filters.categories.has(FilterCategory.Thinking)} onCheckedChange={() => toggleCategory(FilterCategory.Thinking)} label="Thinking" count={counts.categories[FilterCategory.Thinking]} />

        <div className="tb-rail-toolcat">
          <div className="tb-rail-toolcat-head">
            <FilterCheckbox
              checked={filters.categories.has(FilterCategory.ToolCalls)}
              onCheckedChange={() => toggleCategory(FilterCategory.ToolCalls)}
              label="Tool calls"
              count={counts.categories[FilterCategory.ToolCalls]}
              className="tb-rail-toolcat-check"
            />
            <button type="button" onClick={() => setToolsExpanded((v) => !v)} className="tb-rail-toolcat-toggle tb-focus" aria-expanded={toolsExpanded} aria-label="Toggle tool breakdown" title="Toggle tool breakdown">
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
                icon={<tg.Icon size={11} strokeWidth={1.75} />}
              />
            ))}
        </div>

        {((counts.tags[TagFilter.Errors] ?? 0) > 0 || (counts.tags[TagFilter.Retries] ?? 0) > 0 || (counts.tags[TagFilter.ReEdit] ?? 0) > 0) && (
          <>
            <div className="tb-rail-tag-divider" />
            {(counts.tags[TagFilter.Errors] ?? 0) > 0 && (
              <FilterCheckbox checked={filters.tags.has(TagFilter.Errors)} onCheckedChange={() => toggleTag(TagFilter.Errors)} label="Errors" count={counts.tags[TagFilter.Errors]} />
            )}
            {(counts.tags[TagFilter.Retries] ?? 0) > 0 && (
              <FilterCheckbox checked={filters.tags.has(TagFilter.Retries)} onCheckedChange={() => toggleTag(TagFilter.Retries)} label="Retries" count={counts.tags[TagFilter.Retries]} />
            )}
            {(counts.tags[TagFilter.ReEdit] ?? 0) > 0 && (
              <FilterCheckbox checked={filters.tags.has(TagFilter.ReEdit)} onCheckedChange={() => toggleTag(TagFilter.ReEdit)} label="Re-edit" count={counts.tags[TagFilter.ReEdit]} />
            )}
          </>
        )}
      </FilterSection>

      {commits && commits.length > 0 && (
        <FilterSection title={`Checkpoints (${commits.length})`}>
          <div className="tb-rail-checkpoint-wrap">
            <CheckpointSelector commits={commits} value={selectedCommit} onChange={onCommitChange ?? (() => {})} onJump={onCommitJump} />
          </div>
        </FilterSection>
      )}

      <FilterSection title="View">
        <ViewOptions value={viewOptions} onChange={onViewOptionsChange} />
      </FilterSection>

      <FilterSection title="Jump to" defaultOpen>
        <button type="button" onClick={onJumpToStart} disabled={!onJumpToStart} className={cn("tb-rail-jump tb-focus", !onJumpToStart && "tb-rail-jump-disabled")}>
          <ArrowUpToLine size={12} strokeWidth={1.75} className="tb-toolicon-muted" />
          <span className="tb-rail-jump-label">Start</span>
        </button>
        <button type="button" onClick={onJumpToLatest} disabled={!onJumpToLatest} className={cn("tb-rail-jump tb-focus", !onJumpToLatest && "tb-rail-jump-disabled")}>
          <ArrowDownToLine size={12} strokeWidth={1.75} className="tb-toolicon-muted" />
          <span className="tb-rail-jump-label">Latest</span>
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
    return <PlaceholderFilters Icon={Sparkles} message="No filters available — Highlights shows all noteworthy turns." />;
  }

  return (
    <FilterSection
      title="Outcome"
      action={
        tagsActive > 0 ? (
          <button type="button" onClick={() => onFiltersChange({ ...filters, tags: new Set() })} className="tb-rail-clear tb-focus">
            Clear ({tagsActive})
          </button>
        ) : undefined
      }
    >
      {(counts.tags[TagFilter.Errors] ?? 0) > 0 && (
        <FilterCheckbox checked={filters.tags.has(TagFilter.Errors)} onCheckedChange={() => toggleTag(TagFilter.Errors)} label="Errors" count={counts.tags[TagFilter.Errors]} />
      )}
      {(counts.tags[TagFilter.Retries] ?? 0) > 0 && (
        <FilterCheckbox checked={filters.tags.has(TagFilter.Retries)} onCheckedChange={() => toggleTag(TagFilter.Retries)} label="Retries" count={counts.tags[TagFilter.Retries]} />
      )}
      {(counts.tags[TagFilter.ReEdit] ?? 0) > 0 && (
        <FilterCheckbox checked={filters.tags.has(TagFilter.ReEdit)} onCheckedChange={() => toggleTag(TagFilter.ReEdit)} label="Re-edit" count={counts.tags[TagFilter.ReEdit]} />
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
