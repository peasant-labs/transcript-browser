/**
 * Core transcript shapes: a session, its turns, the tool calls inside each
 * turn, and the git context captured alongside it.
 *
 * Source of truth: peasant `web/src/types/messages.ts` (superset). Village's
 * `messages.ts` defines a strict subset of these — see DIVERGENCES.md.
 */

import type {
  EntryType,
  Provider,
  Role,
  SessionSource,
  SessionStatus,
  StopReason,
  ToolCallKind,
} from "./enums.js";

/** Tool invocation metadata inside a turn. */
export interface ToolCallDetail {
  id: string;
  name: string;
  arguments: string;
  result: string;
  /** Wall-clock duration in milliseconds. */
  durationMs?: number;
  /** Exit code for Bash tool calls. */
  exitCode?: number;
  /** Extracted file path for Read/Write/Edit/Glob. */
  filePath?: string;
  /** True when tool_result had is_error flag set. */
  isError?: boolean;
  /** Classified tool type: read, edit, execute, search, etc. */
  toolKind?: ToolCallKind;
}

/** A single conversation turn with optional tool calls. */
export interface TurnDetail {
  index: number;
  role: Role;
  content: string;
  toolCalls?: ToolCallDetail[];
  timestamp: string;
  /** Nesting depth: 0 = main agent, 1+ = subagent levels. */
  depth?: number;
  /** Agent name for subagent turns (e.g., "researcher", "test-runner"). */
  agentName?: string;

  // Enrichment fields — propagated from session_entries.
  /** Entry classification: text, tool_use, tool_result, thinking, system, error, result. */
  entryType?: EntryType;
  /** Whether the turn contains thinking/reasoning blocks. */
  hasThinking?: boolean;
  /** Why the turn ended: end_turn, max_tokens, cancelled, etc. */
  stopReason?: StopReason;
  /** Input tokens for this turn. */
  tokensIn?: number;
  /** Output tokens for this turn. */
  tokensOut?: number;
}

/** A git commit made during the session. */
export interface SessionCommit {
  hash: string;
  message: string;
  timestamp: string;
  filesChanged: number;
  insertions: number;
  deletions: number;
}

/** Git context captured by the daemon for a session. */
export interface SessionGitContext {
  branch: string;
  user: string;
  email: string;
  remote?: string;
  workingDirectory: string;
  startCommit: string;
  commits: SessionCommit[];
}

/**
 * Full session detail — the central transcript payload consumed by the viewer.
 *
 * Named `SessionDetailPayload` to match both peasant and village. In peasant
 * this is the body pushed on the WebSocket "session_detail" channel; in village
 * it is the parsed body of a REST transcript fetch. The framework-specific
 * transport wrappers (channel envelopes, REST list responses) are intentionally
 * NOT part of this shared package.
 */
export interface SessionDetailPayload {
  id: string;
  provider: Provider;
  startTime: string;
  endTime: string;
  durationMins: number;
  totalTokens: number;
  tokensIn: number;
  tokensOut: number;
  turnCount: number;
  toolCallCount: number;
  turns: TurnDetail[];
  // Optional fields — present when the backend populates them.
  source?: SessionSource;
  status?: SessionStatus;
  postedUrl?: string;
  project?: string;
  model?: string;
  workingDirectory?: string;
  gitContext?: SessionGitContext;
  /**
   * Heuristic session outcome (`resolved`/`partial`/`failed`), sourced from
   * `session_metrics.outcome`. Empty/absent when no outcome was computed. The
   * metadata columns expose no per-signal reason, so no reason field exists.
   */
  outcome?: string;
}
