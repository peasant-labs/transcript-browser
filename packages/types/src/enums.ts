/**
 * Enumerated value sets shared across transcript types.
 *
 * Each enum mirrors a Go counterpart in the Peasant backend
 * (`pkg/schema/*.go`). The wire format is always the string literal value,
 * so these are declared as `const` objects + derived union types rather than
 * TypeScript `enum`s (which would not survive a JSON round-trip cleanly).
 *
 * Source of truth: peasant `web/src/types/messages.ts`. Village's copy is a
 * strict subset of these and matches byte-for-byte on the shared members.
 */

// -- Tool Call Classification ------------------------------------------------

/** Mirrors Go pkg/schema.ToolCallKind — ACP-aligned tool classification. */
export const ToolCallKind = {
  Read: "read",
  Edit: "edit",
  Delete: "delete",
  Move: "move",
  Search: "search",
  Execute: "execute",
  Think: "think",
  Fetch: "fetch",
  Other: "other",
} as const;
export type ToolCallKind = (typeof ToolCallKind)[keyof typeof ToolCallKind];

// -- Entry Type Classification -----------------------------------------------

/** Mirrors Go pkg/schema.EntryType — content part classification. */
export const EntryType = {
  Text: "text",
  ToolUse: "tool_use",
  ToolResult: "tool_result",
  Thinking: "thinking",
  System: "system",
  Error: "error",
  Result: "result",
} as const;
export type EntryType = (typeof EntryType)[keyof typeof EntryType];

// -- Stop Reason Classification ----------------------------------------------

/** Mirrors Go pkg/schema.StopReason — why a turn ended. */
export const StopReason = {
  EndTurn: "end_turn",
  MaxTokens: "max_tokens",
  Cancelled: "cancelled",
  ToolUse: "tool_use",
  Error: "error",
} as const;
export type StopReason = (typeof StopReason)[keyof typeof StopReason];

// -- Provider / Role ---------------------------------------------------------

/** Agent harness that produced the transcript. */
export type Provider = "claude" | "gemini" | "codex" | "opencode";

/** Speaker role for a single turn. */
export type Role = "user" | "assistant" | "tool" | "system";

// -- Session source / publication status -------------------------------------

/**
 * Whether a session was imported from on-disk history or captured live.
 * Optional throughout; absent until the backend populates it.
 */
export type SessionSource = "imported" | "live";

/** Local-only vs. published-to-village status of a session. */
export type SessionStatus = "local" | "posted";
