import { ToolCallKind } from "@peasant-labs/types";
import type { TurnDetail, ToolCallDetail } from "@peasant-labs/types";

/**
 * Filter / view-option state + pure classification helpers for the right rail.
 * Ported verbatim from peasant's `rails/filter-types.ts`. Pure data — the host
 * owns the filter state (useState) and feeds it to the rail + canvas.
 */

/** Top-level filter categories shown in the right rail. */
export const FilterCategory = {
  Prompts: "prompts", // user turns
  Responses: "responses", // assistant turns with text content
  Thinking: "thinking", // turns with hasThinking
  ToolCalls: "tool_calls", // turns whose tool calls qualify
  Checkpoints: "checkpoints", // controls checkpoint visibility, not a turn filter
} as const;
export type FilterCategory = (typeof FilterCategory)[keyof typeof FilterCategory];

/** Sub-classification of tool calls — drives the nested checkboxes. */
export const ToolGroup = {
  Edit: "edit",
  Bash: "bash",
  Read: "read",
  Search: "search",
  Fetch: "fetch",
  Task: "task",
  Other: "other",
} as const;
export type ToolGroup = (typeof ToolGroup)[keyof typeof ToolGroup];

/** Semantic tag filters (from annotations). */
export const TagFilter = {
  Errors: "errors",
  Retries: "retries",
  ReEdit: "re-edit",
} as const;
export type TagFilter = (typeof TagFilter)[keyof typeof TagFilter];

/** The complete filter state owned by the host (and surfaced in the rail). */
export interface V2FilterState {
  categories: Set<FilterCategory>;
  /** Only meaningful when `ToolCalls` is in categories — narrows by tool group. */
  toolGroups: Set<ToolGroup>;
  tags: Set<TagFilter>;
}

/** Defaults — no filters → "show everything". */
export function emptyFilterState(): V2FilterState {
  return { categories: new Set(), toolGroups: new Set(), tags: new Set() };
}

/** Toggle helper for the rail checkboxes. */
export function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

/** Counts per filter dimension, for the rail labels. */
export interface V2FilterCounts {
  categories: Partial<Record<FilterCategory, number>>;
  toolGroups: Partial<Record<ToolGroup, number>>;
  tags: Partial<Record<TagFilter, number>>;
  totalToolCalls: number;
}

/** View options — toggles that affect rendering without filtering. */
export interface V2ViewOptions {
  expandToolCalls: boolean;
  hideThinking: boolean;
  compact: boolean;
  /** Show "hidden indicators" — phase dividers, depth markers, etc. */
  showHidden: boolean;
}

export function defaultViewOptions(): V2ViewOptions {
  return { expandToolCalls: false, hideThinking: false, compact: false, showHidden: true };
}

// ---------------------------------------------------------------------------
// Classification helpers
// ---------------------------------------------------------------------------

function groupFor(call: ToolCallDetail): ToolGroup {
  const n = call.name.toLowerCase();
  if (n === "read" || n === "notebookread") return ToolGroup.Read;
  if (n === "edit" || n === "multiedit" || n === "notebookedit" || n === "write") return ToolGroup.Edit;
  if (n === "bash" || n === "runcommand" || n === "run_command" || n === "shell") return ToolGroup.Bash;
  if (n === "grep" || n === "glob" || n === "globsearch" || n === "websearch" || n === "web_search")
    return ToolGroup.Search;
  if (n === "webfetch" || n === "web_fetch" || n === "fetch" || n === "readwebsite") return ToolGroup.Fetch;
  if (
    n === "task" ||
    n === "taskcreate" ||
    n === "taskupdate" ||
    n === "task_create" ||
    n === "task_update" ||
    n === "todowrite" ||
    n === "agent"
  )
    return ToolGroup.Task;
  switch (call.toolKind) {
    case ToolCallKind.Read:
      return ToolGroup.Read;
    case ToolCallKind.Edit:
      return ToolGroup.Edit;
    case ToolCallKind.Execute:
      return ToolGroup.Bash;
    case ToolCallKind.Search:
      return ToolGroup.Search;
    case ToolCallKind.Fetch:
      return ToolGroup.Fetch;
    default:
      return ToolGroup.Other;
  }
}

function categoryMatches(turn: TurnDetail, cat: FilterCategory): boolean {
  switch (cat) {
    case FilterCategory.Prompts:
      return turn.role === "user";
    case FilterCategory.Responses:
      return turn.role === "assistant" && !!turn.content?.trim();
    case FilterCategory.Thinking:
      return !!turn.hasThinking;
    case FilterCategory.ToolCalls:
      return (turn.toolCalls?.length ?? 0) > 0;
    case FilterCategory.Checkpoints:
      return false;
  }
}

function tagMatches(
  turn: TurnDetail,
  tags: Set<TagFilter>,
  annotationsByTurn: Map<number, { type: string }[]>,
): boolean {
  if (tags.size === 0) return true;
  const anns = annotationsByTurn.get(turn.index) ?? [];
  for (const tag of tags) {
    if (tag === TagFilter.Errors && anns.some((a) => a.type === "error")) return true;
    if (tag === TagFilter.Retries && anns.some((a) => a.type === "retry")) return true;
    if (tag === TagFilter.ReEdit && anns.some((a) => a.type === "revert")) return true;
  }
  return false;
}

/**
 * Evaluate the full filter on a single turn. Categories OR within the set;
 * ToolGroup narrows ToolCalls; Tags AND with the category match.
 */
export function applyFilter(
  turn: TurnDetail,
  filter: V2FilterState,
  annotationsByTurn: Map<number, { type: string }[]>,
): boolean {
  const { categories, toolGroups, tags } = filter;

  let passesCategory = categories.size === 0;
  if (!passesCategory) {
    for (const c of categories) {
      if (c === FilterCategory.ToolCalls) {
        if ((turn.toolCalls?.length ?? 0) === 0) continue;
        if (toolGroups.size === 0) {
          passesCategory = true;
          break;
        }
        if (turn.toolCalls!.some((t) => toolGroups.has(groupFor(t)))) {
          passesCategory = true;
          break;
        }
      } else if (categoryMatches(turn, c)) {
        passesCategory = true;
        break;
      }
    }
  }
  if (!passesCategory) return false;

  return tagMatches(turn, tags, annotationsByTurn);
}

/** Compute counts across the session for the rail labels. */
export function computeCounts(
  turns: TurnDetail[],
  annotationsByTurn: Map<number, { type: string }[]>,
): V2FilterCounts {
  const counts: V2FilterCounts = { categories: {}, toolGroups: {}, tags: {}, totalToolCalls: 0 };
  let p = 0;
  let r = 0;
  let th = 0;
  let tc = 0;
  const tgCounts: Partial<Record<ToolGroup, number>> = {};

  for (const t of turns) {
    if (t.role === "user") p++;
    else if (t.role === "assistant" && t.content?.trim()) r++;
    if (t.hasThinking) th++;
    if (t.toolCalls?.length) {
      tc++;
      for (const c of t.toolCalls) {
        counts.totalToolCalls++;
        const g = groupFor(c);
        tgCounts[g] = (tgCounts[g] ?? 0) + 1;
      }
    }
  }
  counts.categories[FilterCategory.Prompts] = p;
  counts.categories[FilterCategory.Responses] = r;
  counts.categories[FilterCategory.Thinking] = th;
  counts.categories[FilterCategory.ToolCalls] = tc;
  counts.toolGroups = tgCounts;

  let err = 0;
  let ret = 0;
  let re = 0;
  for (const [, anns] of annotationsByTurn) {
    if (anns.some((a) => a.type === "error")) err++;
    if (anns.some((a) => a.type === "retry")) ret++;
    if (anns.some((a) => a.type === "revert")) re++;
  }
  counts.tags[TagFilter.Errors] = err;
  counts.tags[TagFilter.Retries] = ret;
  counts.tags[TagFilter.ReEdit] = re;

  return counts;
}
