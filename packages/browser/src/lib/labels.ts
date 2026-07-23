import type { PhaseType } from "../view-types.js";

/**
 * Single source of truth for transcript-browser CHROME strings.
 *
 * Every fixed piece of UI chrome — tabs, role labels, rail captions, filter
 * names, view options, annotation types, menu items, markers — renders in
 * ALL-LOWERCASE to match the canonical fairtrade in-use demo. Centralizing the
 * strings here means casing cannot drift per call site, and the fidelity gate
 * has one module to iterate over when it asserts that all chrome is lowercase.
 *
 * NOT included here: USER CONTENT (session ids, file paths, provider-supplied
 * agent names, prose, tool names) — that keeps its original casing. Only fixed
 * UI chrome is centralized + lowercased.
 */

/** Top-level session tabs. */
export const TAB_LABELS = {
  highlights: "highlights",
  trace: "full trace",
  diffs: "diffs",
  files: "files",
  annotations: "annotations",
} as const;

/** Conversational role labels (assistant is overridden by the provider name). */
export const ROLE_LABELS: Record<string, string> = {
  user: "user",
  assistant: "assistant",
  tool: "tool",
  system: "system",
};
export const SUBAGENT_LABEL = "subagent";

/** Thinking-block caption. */
export const THINKING_LABEL = "thinking";

/** Task-boundary marker caption, e.g. "user turn 3". */
export const taskBoundaryLabel = (index: number): string => `user turn ${index}`;

/** Sticky phase-divider section headers. */
export const PHASE_LABELS: Record<PhaseType, string> = {
  planning: "planning",
  exploration: "exploration",
  implementation: "implementation",
  testing: "testing",
  error: "errors",
  debug: "debugging",
  "retry-loop": "retry loop",
  "user-correction": "user correction",
  recovery: "recovery",
  abandonment: "abandonment",
};

/** Right-rail tab captions. */
export const RAIL_TAB_LABELS = {
  outline: "user turns",
  filters: "filters",
} as const;

/** Filter-section captions. */
export const FILTER_SECTION_LABELS = {
  categories: "categories",
  toolCalls: "tool calls",
  semanticTags: "semantic tags",
  view: "view",
} as const;

/** Category filter labels. */
export const CATEGORY_LABELS = {
  prompts: "prompts",
  responses: "responses",
  thinking: "thinking",
} as const;

/** Semantic-tag filter labels. */
export const TAG_LABELS = {
  errors: "errors",
  retries: "retries",
} as const;

/** Tool-group filter labels. */
export const TOOL_GROUP_LABELS = {
  edit: "file edits",
  bash: "bash",
  read: "read",
  search: "search",
  fetch: "fetch",
  task: "tasks",
  other: "other",
} as const;

/** View-option toggle labels + help text. */
export const VIEW_OPTION_LABELS = {
  showHidden: "show hidden indicators",
  expandToolCalls: "expand all tool calls",
  compact: "compact mode",
} as const;
export const VIEW_OPTION_HELP = {
  showHidden: "phase markers, depth labels, checkpoint dividers.",
  compact: "tighter spacing between turns.",
} as const;

/** Annotation type labels. */
export const ANNOTATION_TYPE_LABELS = {
  error: "error",
  retry: "retry",
  revert: "reverted edit",
  subagent: "subagent",
} as const;

/** Trajectory view-mode toggle labels. */
export const VIEW_MODE_LABELS = {
  list: "list",
  graph: "graph",
} as const;

/** Diffs view group-by toggle labels. */
export const DIFFS_GROUPBY_LABELS = {
  byFile: "by file",
  byTurn: "by turn",
} as const;

/** Highlights-outline entry labels (fixed chrome; sub-text is user content). */
export const HIGHLIGHT_LABELS = {
  initialRequest: "initial request",
  finalResponse: "final response",
  error: "error",
} as const;

/** Action-menu item labels (host-overridable; these are the lowercase defaults). */
export const ACTION_LABELS = {
  share: "share",
  contribute: "contribute",
  copyLink: "copy link",
  copied: "copied",
} as const;
