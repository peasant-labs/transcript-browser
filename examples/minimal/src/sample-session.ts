import type { SessionDetailPayload } from "@peasant-labs/types";

/**
 * A tiny hand-written sample, typed against the shared SessionDetailPayload.
 * Its only job is to prove that @peasant-labs/types resolves and type-checks
 * from a consuming app.
 */
export const sampleSession: SessionDetailPayload = {
  id: "sess_demo_0001",
  provider: "claude",
  startTime: "2026-05-28T10:00:00Z",
  endTime: "2026-05-28T10:04:30Z",
  durationMins: 4.5,
  totalTokens: 1820,
  tokensIn: 1200,
  tokensOut: 620,
  turnCount: 3,
  toolCallCount: 1,
  project: "transcript-browser",
  model: "claude-opus-4-7",
  outcome: "resolved",
  turns: [
    {
      index: 0,
      role: "user",
      content: "Scaffold a pnpm monorepo for a shared transcript browser.",
      timestamp: "2026-05-28T10:00:00Z",
      entryType: "text",
    },
    {
      index: 1,
      role: "assistant",
      content: "Reading the existing shared types before scaffolding.",
      timestamp: "2026-05-28T10:00:12Z",
      entryType: "tool_use",
      tokensIn: 1200,
      tokensOut: 420,
      toolCalls: [
        {
          id: "tool_read_1",
          name: "Read",
          arguments: '{"path":"web/src/types/messages.ts"}',
          result: "// 372 lines of shared types",
          toolKind: "read",
          filePath: "web/src/types/messages.ts",
        },
      ],
    },
    {
      index: 2,
      role: "assistant",
      content: "Done — types lifted into @peasant-labs/types.",
      timestamp: "2026-05-28T10:04:30Z",
      entryType: "result",
      stopReason: "end_turn",
      tokensOut: 200,
    },
  ],
};
